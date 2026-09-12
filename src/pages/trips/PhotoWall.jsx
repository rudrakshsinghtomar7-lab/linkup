import { useRef, useState } from 'react'
import { Icon } from '../../components/Icons'
import { useToast } from '../../providers/ToastProvider'

// Resolution badge derived from the stored pixel dimensions (never guessed).
function res(p) {
  const m = Math.max(p.width || 0, p.height || 0)
  if (m >= 5760) return '6K'
  if (m >= 3840) return '4K'
  if (m >= 1920) return 'HD'
  return ''
}

export default function PhotoWall({ trip, data }) {
  const { photos, loading, error, reload, upload, uploading } = data
  const toast = useToast()
  const input = useRef()
  const [all, setAll] = useState(false)

  async function pick(e) {
    const files = Array.from(e.target.files) // copy before clearing — the FileList is live
    e.target.value = ''
    try { await upload(files); toast('Uploaded', 'ok') } catch (err) { toast(err.message || 'Upload failed. Try again.') }
  }

  const shown = all ? photos || [] : (photos || []).slice(0, 5)

  return (
    <section className="card" id="photos">
      <div className="head">
        <h2><span className="ic"><Icon.photo /></span>Trip photos</h2>
        {photos?.length > 5 && <button className="link" onClick={() => setAll(!all)}>{all ? 'Show less' : 'Full-res album'}</button>}
      </div>
      {!trip ? <div className="state">Photos live on a trip. Start one first.</div>
        : loading ? <div className="state">Loading photos…</div>
        : error ? <div className="state err">Couldn’t load photos.<button className="link" onClick={reload}>Retry</button></div>
        : (
          <div className="wall">
            {Array.from({ length: uploading }).map((_, i) => <div className="shot loading" key={`u${i}`} data-res="" />)}
            {shown.map((p) => (
              <a className="shot" key={p.id} data-res={res(p)} href={p.url || undefined} target="_blank" rel="noreferrer"
                style={p.url ? { backgroundImage: `url("${p.url}")` } : undefined} aria-label="Open full-res photo" />
            ))}
            <button className="shot add" onClick={() => input.current?.click()} disabled={uploading > 0}>
              <span>＋<br />Upload<br />hi-res</span>
            </button>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={pick} />
          </div>
        )}
      {trip && !loading && !error && photos.length === 0 && uploading === 0 && <div className="state">No photos yet — upload the first one.</div>}
    </section>
  )
}
