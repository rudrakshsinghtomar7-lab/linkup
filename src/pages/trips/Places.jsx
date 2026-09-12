import { useState } from 'react'
import Modal from '../../components/Modal'
import { Icon } from '../../components/Icons'
import { useToast } from '../../providers/ToastProvider'
import { friendly } from '../../lib/format'

const WARM = ['$$', '$$$', 'Rides', 'Beach']

function PlaceModal({ onClose, onAdd }) {
  const toast = useToast()
  const [f, setF] = useState({ name: '', location: '', tags: '', image_url: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault(); setBusy(true)
    try {
      await onAdd({
        name: f.name.trim(), location: f.location.trim() || null, image_url: f.image_url.trim() || null,
        tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4),
      })
      onClose()
    } catch (err) { toast(friendly(err, 'Couldn’t add the spot. Try again.')) }
    setBusy(false)
  }
  return (
    <Modal title="Suggest a spot" icon={<Icon.pin />} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field"><span>Place</span><input className="input" required autoFocus maxLength={60} placeholder="Byron Bay lighthouse" value={f.name} onChange={set('name')} /></label>
        <label className="field"><span>Where / what</span><input className="input" maxLength={80} placeholder="Cape Byron · sunrise walk" value={f.location} onChange={set('location')} /></label>
        <label className="field"><span>Tags (comma separated)</span><input className="input" maxLength={60} placeholder="Nature, Free" value={f.tags} onChange={set('tags')} /></label>
        <label className="field"><span>Image URL (optional)</span><input className="input" type="url" placeholder="https://…" value={f.image_url} onChange={set('image_url')} /></label>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !f.name.trim()}>{busy ? 'Adding…' : 'Add spot'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Places({ trip, data }) {
  const { places, loading, error, reload, toggleVote, pending, addPlace } = data
  const toast = useToast()
  const [adding, setAdding] = useState(false)

  async function vote(p) {
    try { await toggleVote(p) } catch (err) { toast(friendly(err, 'Couldn’t save your vote. Try again.')) }
  }

  return (
    <section className="card" id="places">
      <div className="head">
        <h2><span className="ic"><Icon.pin /></span>Places to visit</h2>
        {trip && <button className="link" onClick={() => setAdding(true)}>＋ Suggest a spot</button>}
      </div>
      {!trip ? <div className="state">Start a trip to collect places.</div>
        : loading ? <div className="state">Loading places…</div>
        : error ? <div className="state err">Couldn’t load places.<button className="link" onClick={reload}>Retry</button></div>
        : places.length === 0 ? <div className="state">No spots yet. Be the first to suggest one.</div>
        : places.map((p) => (
          <div className="place" key={p.id}>
            <div className="thumb" style={p.image_url ? { backgroundImage: `url('${p.image_url}')` } : undefined}>{!p.image_url && '📍'}</div>
            <div className="info">
              <strong>{p.name}</strong>
              {p.location && <small>{p.location}</small>}
              {p.tags?.length > 0 && <div className="tagrow">{p.tags.map((t) => <span key={t} className={`tag ${WARM.includes(t) ? 'warm' : ''}`}>{t}</span>)}</div>}
            </div>
            <div className="vote">
              <button className={p.mine ? 'voted' : ''} disabled={!!pending[p.id]} onClick={() => vote(p)} aria-label={p.mine ? 'Remove vote' : 'Upvote'}>▲</button>
              <b>{p.votes}</b><small>VOTES</small>
            </div>
          </div>
        ))}
      {adding && <PlaceModal onClose={() => setAdding(false)} onAdd={addPlace} />}
    </section>
  )
}

export function Poll({ trip, data }) {
  const { places, loading, error } = data
  const [all, setAll] = useState(false)
  const sorted = [...places].sort((a, b) => b.votes - a.votes)
  const max = Math.max(...places.map((p) => p.votes), 1)
  const shown = all ? sorted : sorted.slice(0, 5)
  return (
    <section className="card" id="voting">
      <div className="head">
        <h2><span className="ic"><Icon.bars /></span>Live poll</h2>
        {sorted.length > 5 && <button className="link" onClick={() => setAll(!all)}>{all ? 'Top 5' : 'See all votes'}</button>}
      </div>
      <div className="poll">
        {!trip || loading || error ? <div className="state">{!trip ? 'Votes show up here once the trip has places.' : loading ? 'Counting…' : 'Couldn’t load votes.'}</div>
          : places.length === 0 ? <div className="state">Nothing to vote on yet.</div>
          : shown.map((p) => (
            <div className="bar-row" key={p.id}>
              <div className="lab"><strong>{p.name}</strong><span>{p.votes} vote{p.votes === 1 ? '' : 's'}</span></div>
              <div className="track"><div className="fill" style={{ width: `${(p.votes / max) * 100}%` }}></div></div>
            </div>
          ))}
      </div>
    </section>
  )
}
