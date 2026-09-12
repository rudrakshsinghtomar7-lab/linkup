import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { initials, timeAgo } from '../../lib/format'
import { useToast } from '../../providers/ToastProvider'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const DEFAULT_CENTER = [153.026, -27.47] // Brisbane — used only when nobody has a location yet

// Re-paint Mapbox's dark style into the mockup's pink/teal/orange treatment.
function restyle(map) {
  const style = map.getStyle(); if (!style) return
  for (const l of style.layers) {
    const id = l.id
    try {
      if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#0d0710')
      else if (l.type === 'fill' && /water/.test(id)) map.setPaintProperty(id, 'fill-color', '#05070f')
      else if (l.type === 'fill' && /(park|pitch|golf|grass|wood|national)/.test(id)) { map.setPaintProperty(id, 'fill-color', '#0a1a10'); map.setPaintProperty(id, 'fill-opacity', 0.8) }
      else if (l.type === 'fill' && /(landuse|land-structure)/.test(id)) map.setPaintProperty(id, 'fill-color', '#120913')
      else if ((l.type === 'fill' || l.type === 'fill-extrusion') && /building/.test(id)) { map.setPaintProperty(id, `${l.type}-color`, '#3a1430'); map.setPaintProperty(id, `${l.type}-opacity`, 0.35) }
      else if (l.type === 'line' && /(motorway|trunk)/.test(id) && !/case|label/.test(id)) { map.setPaintProperty(id, 'line-color', '#ff8a3d'); map.setPaintProperty(id, 'line-opacity', 0.7) }
      else if (l.type === 'line' && /(primary|secondary|tertiary|major|road-simple)/.test(id) && !/case|label/.test(id)) { map.setPaintProperty(id, 'line-color', '#ff1e79'); map.setPaintProperty(id, 'line-opacity', 0.55) }
      else if (l.type === 'line' && /(road|street|path|minor|service|bridge|tunnel)/.test(id) && !/label/.test(id)) { map.setPaintProperty(id, 'line-color', /case/.test(id) ? '#2a1220' : '#00e5d0'); map.setPaintProperty(id, 'line-opacity', /case/.test(id) ? 0.6 : 0.3) }
      else if (l.type === 'line' && /(admin|boundary)/.test(id)) map.setPaintProperty(id, 'line-color', 'rgba(255,30,121,.25)')
      else if (l.type === 'symbol') { map.setPaintProperty(id, 'text-color', '#9a7488'); map.setPaintProperty(id, 'text-halo-color', '#08010a'); map.setPaintProperty(id, 'text-halo-width', 1) }
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

export default function LiveMap({ crew, mine, others, members, loading, error, onReload, ghost, sharePill, onShareClick, live, now = Date.now() }) {
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
    const map = new mapboxgl.Map({ container: box.current, style: 'mapbox://styles/mapbox/dark-v11', center: DEFAULT_CENTER, zoom: 12, attributionControl: false, logoPosition: 'bottom-left' })
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

  const selRow = sel && visible.find((o) => o.user_id === sel.user_id)
  const selPos = selRow && mapRef.current ? mapRef.current.project([selRow.lng, selRow.lat]) : null

  return (
    <div className="map" id="map">
      {TOKEN ? <div className="canvas" ref={box} /> : (
        <div className="nomap"><div><b>Map unavailable</b>Mapbox token isn’t configured for this build.</div></div>
      )}
      {TOKEN && error && <div className="nomap"><div><b>Couldn’t load crew locations</b><button className="link" onClick={onReload}>Retry</button></div></div>}
      <div className="scan"></div>
      <div className="vig"></div>

      <div className="hud tl">
        <div className="live"><span className="pulse"></span> {loading ? 'Finding the crew…' : `${fresh} friend${fresh === 1 ? '' : 's'} sharing`}</div>
      </div>
      <div className="hud tr">
        <button className={`share-pill ${ghost ? 'ghosted' : ''}`} onClick={onShareClick} title="Change sharing scope">{sharePill}</button>
      </div>
      <div className="zoom">
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">＋</button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">－</button>
      </div>
      <div className="compass">◈ {crew?.name}</div>

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
