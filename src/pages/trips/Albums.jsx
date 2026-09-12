import { useState } from 'react'
import { Icon } from '../../components/Icons'
import PhotoWall from './PhotoWall'
import { useAlbums } from '../../hooks/useAlbums'
import { usePhotos } from '../../hooks/usePhotos'
import { fmtDate } from '../../lib/format'

function Album({ album, userId, onBack }) {
  const photos = usePhotos(album, userId)
  return (
    <>
      <button className="link" onClick={onBack} style={{ marginBottom: 12 }}>‹ All albums</button>
      <PhotoWall trip={album} data={photos} title={`${album.emoji} ${album.title}`} />
    </>
  )
}

// PHOTOS segment: an album per trip and per plan, created the moment the trip/plan exists.
export default function Albums({ crewId, userId }) {
  const { albums, loading, error, reload } = useAlbums(crewId)
  const [open, setOpen] = useState(null)
  if (open) return <Album album={open} userId={userId} onBack={() => { setOpen(null); reload() }} />
  return (
    <section className="card">
      <div className="head"><h2><span className="ic"><Icon.photo /></span>Albums</h2></div>
      {loading ? <div className="state">Loading albums…</div>
        : error ? <div className="state err">Couldn’t load albums.<button className="link" onClick={reload}>Retry</button></div>
        : albums.length === 0 ? <div className="state">Albums appear here automatically for every trip and plan. Start one and it’ll show up.</div>
        : (
          <div className="albums">
            {albums.map((a) => (
              <button className="album" key={a.id} onClick={() => setOpen(a)}>
                <div className="covers">
                  {a.covers.length ? a.covers.map((u, i) => <span key={i} style={{ backgroundImage: `url("${u}")` }} />) : <span className="empty">{a.emoji}</span>}
                </div>
                <strong>{a.title}</strong>
                <small>{a.kind === 'trip' ? 'Trip' : 'Plan'} · {fmtDate(a.date)} · {a.count} photo{a.count === 1 ? '' : 's'}</small>
              </button>
            ))}
          </div>
        )}
    </section>
  )
}
