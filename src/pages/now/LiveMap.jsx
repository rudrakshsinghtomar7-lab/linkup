import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { initials, timeAgo } from '../../lib/format'
import { useToast } from '../../providers/ToastProvider'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const DEFAULT_CENTER = [153.026, -27.47] // Brisbane — used only when nobody has a location yet

// Re-paint Mapbox satellite-streets into the GTA VI "Leonida" official-map look:
// real satellite terrain, deep navy ocean, olive parks, magenta-tinted urban blocks,
// thin white roads with gold highways, pink upper-case labels, cyan italic water names.
const LEONIDA = {
  water: '#0a1030', urban: '#ff2a8a', park: '#8fbf3f', road: '#ffffff', highway: '#f3b23e',
  rail: '#d9c2ff', label: '#ff7ad9', labelHalo: '#12051a', water_label: '#4fc3ff',
}
function restyle(map) {
  const style = map.getStyle(); if (!style) return
  const firstRoad = style.layers.find((l) => /^(tunnel|road|bridge)/.test(l.id))?.id
  // Streets vector source gives us water / landuse polygons to tint over the imagery.
  if (!map.getSource('leonida')) map.addSource('leonida', { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' })
  const add = (layer) => { if (!map.getLayer(layer.id)) map.addLayer(layer, firstRoad) }
  add({ id: 'leonida-water', type: 'fill', source: 'leonida', 'source-layer': 'water', paint: { 'fill-color': LEONIDA.water, 'fill-opacity': 0.86 } })
  add({ id: 'leonida-shore', type: 'line', source: 'leonida', 'source-layer': 'water', paint: { 'line-color': '#2ec8ff', 'line-opacity': 0.35, 'line-width': 1.2, 'line-blur': 1.5 } })
  add({ id: 'leonida-park', type: 'fill', source: 'leonida', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['park', 'wood', 'grass', 'scrub', 'cemetery', 'pitch', 'agriculture']]], paint: { 'fill-color': LEONIDA.park, 'fill-opacity': 0.22 } })
  add({ id: 'leonida-urban', type: 'fill', source: 'leonida', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'commercial', 'industrial', 'retail']]], paint: { 'fill-color': LEONIDA.urban, 'fill-opacity': 0.28 } })
  add({ id: 'leonida-buildings', type: 'fill', source: 'leonida', 'source-layer': 'building', minzoom: 13, paint: { 'fill-color': '#ff5fa2', 'fill-opacity': 0.18 } })

  for (const l of style.layers) {
    const id = l.id
    try {
      if (l.type === 'line' && /(motorway|trunk)/.test(id) && !/label/.test(id)) {
        if (/case/.test(id)) { map.setPaintProperty(id, 'line-color', '#7a4a10'); map.setPaintProperty(id, 'line-opacity', 0.6) }
        else { map.setPaintProperty(id, 'line-color', LEONIDA.highway); map.setPaintProperty(id, 'line-opacity', 0.95) }
      } else if (l.type === 'line' && /^(road|bridge|tunnel)/.test(id) && !/(label|rail|ferry|path|steps|pedestrian)/.test(id)) {
        if (/case/.test(id)) { map.setPaintProperty(id, 'line-color', '#1a0a20'); map.setPaintProperty(id, 'line-opacity', 0.5) }
        else { map.setPaintProperty(id, 'line-color', LEONIDA.road); map.setPaintProperty(id, 'line-opacity', /(street|minor|service|link)/.test(id) ? 0.45 : 0.85) }
      } else if (l.type === 'line' && /rail/.test(id)) { map.setPaintProperty(id, 'line-color', LEONIDA.rail); map.setPaintProperty(id, 'line-opacity', 0.35) }
      else if (l.type === 'line' && /(path|steps|pedestrian)/.test(id)) { map.setPaintProperty(id, 'line-color', LEONIDA.road); map.setPaintProperty(id, 'line-opacity', 0.25) }
      else if (l.type === 'line' && /(admin|boundary)/.test(id)) { map.setPaintProperty(id, 'line-color', 'rgba(255,42,138,.45)') }
      else if (l.type === 'symbol') {
        const water = /(water|waterway|ocean|sea|bay)/.test(id)
        map.setPaintProperty(id, 'text-color', water ? LEONIDA.water_label : LEONIDA.label)
        map.setPaintProperty(id, 'text-halo-color', LEONIDA.labelHalo); map.setPaintProperty(id, 'text-halo-width', 1.4)
        if (/settlement|place|state|country|natural|airport|poi/.test(id)) {
          map.setLayoutProperty(id, 'text-transform', 'uppercase'); map.setLayoutProperty(id, 'text-letter-spacing', 0.18)
        }
        if (/road|street/.test(id)) map.setLayoutProperty(id, 'visibility', 'none')
        if (/poi/.test(id)) map.setPaintProperty(id, 'icon-opacity', 0)
        if (water) map.setLayoutProperty(id, 'text-letter-spacing', 0.3)
      }
    } catch { /* property not applicable to this layer */ }
  }
}

function blipEl(person) {
  const el = document.createElement('div')
  el.className = 'blip'
  el.style.color = person?.color || '#00e5d0'
  const ring = document.createElement('span'); ring.className = 'ring'
  const pin = document.createElement('span'); pin.className = 'pin'
  if (person?.avatar_url) pin.style.backgroundImage = `url("${person.avatar_url}")`; else pin.textContent = initials(person?.display_name)
  const label = document.createElement('span'); label.className = 'label'; label.textContent = person?.display_name || '?'
  el.append(ring, pin, label)
  return el
}

const STALE_MS = 2 * 60_000, GONE_MS = 15 * 60_000
// Apply staleness to a blip element from its row's updated_at. Never show an old fix as live.
function markStale(el, row, name, now) {
  const age = now - new Date(row.updated_at || 0).getTime()
  const cls = age > GONE_MS ? 'gone' : age > STALE_MS ? 'stale' : ''
  el.classList.toggle('stale', cls === 'stale'); el.classList.toggle('gone', cls === 'gone')
  const label = el.querySelector('.label')
  if (label) label.textContent = cls ? `${name} · last seen ${timeAgo(row.updated_at)}` : name
}

function youEl(ghost) {
  const el = document.createElement('div')
  el.className = `you ${ghost ? 'ghost' : ''}`
  el.innerHTML = '<div class="cone"></div><div class="arrow"></div>'
  return el
}
function orient(el, heading) { el.style.transform = heading != null ? `rotate(${heading}deg)` : '' }

export default function LiveMap({ crew, mine, others, members, loading, error, onReload, ghost, sharePill, onShareClick, live, now = Date.now(), full = false, onToggleFull }) {
  const box = useRef(); const mapRef = useRef(); const markers = useRef({}); const youRef = useRef()
  const [ready, setReady] = useState(false)
  const [sel, setSel] = useState(null) // { user_id, x, y }
  const toast = useToast()
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))
  const visible = others.filter((o) => o.lat != null && o.lng != null)
  const fresh = visible.filter((o) => now - new Date(o.updated_at || 0).getTime() <= STALE_MS).length

  useEffect(() => {
    if (!TOKEN || !box.current || mapRef.current) return
    mapboxgl.accessToken = TOKEN
    const map = new mapboxgl.Map({ container: box.current, style: 'mapbox://styles/mapbox/satellite-streets-v12', center: DEFAULT_CENTER, zoom: 12, attributionControl: false, logoPosition: 'bottom-left' })
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('style.load', () => { restyle(map); setReady(true) })
    map.on('move', () => setSel((s) => (s ? { ...s, tick: Date.now() } : s)))
    map.on('click', () => setSel(null))
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; setReady(false) }
  }, [])

  // Sync markers with location rows.
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return
    const keep = new Set()
    for (const o of visible) {
      keep.add(o.user_id)
      let m = markers.current[o.user_id]
      if (!m) {
        const el = blipEl(byId[o.user_id])
        el.addEventListener('click', (e) => { e.stopPropagation(); setSel({ user_id: o.user_id }) })
        m = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([o.lng, o.lat]).addTo(map)
        markers.current[o.user_id] = m
      } else m.setLngLat([o.lng, o.lat])
    }
    for (const id of Object.keys(markers.current)) if (!keep.has(id)) { markers.current[id].remove(); delete markers.current[id] }

    for (const o of visible) markStale(markers.current[o.user_id].getElement(), o, byId[o.user_id]?.display_name || '?', now)

    const me = live?.position ? live.position : (mine && mine.lat != null && mine.lng != null ? { lat: mine.lat, lng: mine.lng, heading: null } : null)
    if (me) {
      if (!youRef.current) youRef.current = new mapboxgl.Marker({ element: youEl(ghost), anchor: 'center', rotationAlignment: 'map' }).setLngLat([me.lng, me.lat]).addTo(map)
      else youRef.current.setLngLat([me.lng, me.lat])
      const el = youRef.current.getElement(); el.classList.toggle('ghost', !!ghost); orient(el.querySelector('.arrow'), me.heading)
    } else if (youRef.current) { youRef.current.remove(); youRef.current = null }
  }, [visible, mine, ghost, ready, members, live?.position, now]) // eslint-disable-line react-hooks/exhaustive-deps

  // First time we have points, frame them.
  const framed = useRef(false)
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready || framed.current) return
    const me = live?.position || (mine?.lat != null && mine?.lng != null ? mine : null)
    const pts = [...visible.map((o) => [o.lng, o.lat]), ...(me ? [[me.lng, me.lat]] : [])]
    if (!pts.length) return
    framed.current = true
    if (pts.length === 1) map.jumpTo({ center: pts[0], zoom: 13 })
    else { const b = pts.reduce((bb, p) => bb.extend(p), new mapboxgl.LngLatBounds(pts[0], pts[0])); map.fitBounds(b, { padding: 80, maxZoom: 14, duration: 0 }) }
  }, [visible, mine, live?.position, ready])

  // Snap-Map style: full-screen toggle needs a resize; recenter on me; fly to a friend.
  useEffect(() => { const map = mapRef.current; if (!map) return; const t = setTimeout(() => map.resize(), 60); return () => clearTimeout(t) }, [full])
  const me = live?.position || (mine?.lat != null && mine?.lng != null ? mine : null)
  const recenter = () => { const map = mapRef.current; if (!map || !me) return; map.flyTo({ center: [me.lng, me.lat], zoom: Math.max(map.getZoom(), 14), speed: 1.4 }) }
  const flyToFriend = (o) => { const map = mapRef.current; if (!map) return; map.flyTo({ center: [o.lng, o.lat], zoom: Math.max(map.getZoom(), 14), speed: 1.4 }); setSel({ user_id: o.user_id }) }

  const selRow = sel && visible.find((o) => o.user_id === sel.user_id)
  const selPos = selRow && mapRef.current ? mapRef.current.project([selRow.lng, selRow.lat]) : null

  return (
    <div className={`map ${full ? 'full' : ''}`} id="map">
      {TOKEN ? <div className="canvas" ref={box} /> : (
        <div className="nomap"><div><b>Map unavailable</b>Mapbox token isn’t configured for this build.</div></div>
      )}
      {TOKEN && error && <div className="nomap"><div><b>Couldn’t load crew locations</b><button className="link" onClick={onReload}>Retry</button></div></div>}
      <div className="wash"></div>
      <div className="scan"></div>
      <div className="vig"></div>

      <div className="hud tl">
        <div className="live"><span className="pulse"></span> {loading ? 'Finding the crew…' : `${fresh} friend${fresh === 1 ? '' : 's'} sharing`}</div>
      </div>
      <div className="hud tr">
        <button className={`share-pill ${ghost ? 'ghosted' : ''}`} onClick={onShareClick} title="Change sharing scope">{sharePill}</button>
      </div>
      <div className="zoom">
        {onToggleFull && <button onClick={onToggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'}>{full ? '✕' : '⤢'}</button>}
        <button onClick={recenter} disabled={!me} aria-label="Centre on me" title={me ? 'Centre on me' : 'Turn on location first'}>◎</button>
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">＋</button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">－</button>
      </div>
      <div className="compass">◈ {crew?.name}</div>
      {full && (
        <div className="friendbar">
          {me && <button className="fb me" onClick={recenter}><span className="av" style={{ background: 'linear-gradient(135deg,var(--pink),var(--orange))' }}>◆</span><small>You</small></button>}
          {visible.map((o) => { const pr = byId[o.user_id]; const stale = now - new Date(o.updated_at || 0).getTime() > STALE_MS; return (
            <button key={o.user_id} className={`fb ${stale ? 'stale' : ''}`} onClick={() => flyToFriend(o)}>
              <span className="av" style={{ background: pr?.color || '#00e5d0' }}>{initials(pr?.display_name)}</span><small>{(pr?.display_name || '?').split(' ')[0]}</small>
            </button>) })}
          {visible.length === 0 && <div className="state" style={{ padding: '6px 4px' }}>No one’s sharing right now.</div>}
        </div>
      )}

      {selRow && selPos && (
        <div className="pop" style={{ left: selPos.x, top: selPos.y - 16 }} onClick={(e) => e.stopPropagation()}>
          <b>{byId[selRow.user_id]?.display_name || 'Crew member'}</b>
          {(() => { const age = now - new Date(selRow.updated_at || 0).getTime(); return <div className={`st ${age > STALE_MS ? 'old' : ''}`}>{age > STALE_MS ? '⚪ Last known spot' : `🟢 ${selRow.status || 'Sharing live'}`}</div> })()}
          <small>Last updated {timeAgo(selRow.updated_at)}</small>
          <div className="row">
            <button className="mini" onClick={() => toast('Pings land in a later phase.', 'ok')}>Ping</button>
            <a className="mini" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${selRow.lat},${selRow.lng}`}>Directions</a>
          </div>
        </div>
      )}
    </div>
  )
}
