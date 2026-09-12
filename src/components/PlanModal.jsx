import { useState } from 'react'
import Modal from './Modal'
import { Icon } from './Icons'
import { supabase } from '../lib/supabase'
import { useSession } from '../providers/SessionProvider'
import { useToast } from '../providers/ToastProvider'
import { friendly } from '../lib/format'

const EMOJI = ['📍', '🍜', '🎬', '☕', '🍻', '🏖️', '🎮', '🏃', '🎧', '🛒']

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

// "Drop a plan": crew-scoped, created by me, always with an expiry (plans are ephemeral).
export default function PlanModal({ onClose, onCreated }) {
  const { activeCrew, user } = useSession()
  const toast = useToast()
  const start = new Date(Date.now() + 60 * 60 * 1000); start.setMinutes(0, 0, 0)
  const [f, setF] = useState({ title: '', emoji: '📍', place_name: '', location: '', starts_at: toLocalInput(start), hours: '4' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    const starts = new Date(f.starts_at)
    if (Number.isNaN(starts.getTime())) return toast('Pick a start time.')
    const expires = new Date(starts.getTime() + Number(f.hours) * 3600 * 1000)
    if (expires <= new Date()) return toast('That plan would already be over.')
    setBusy(true)
    const { error } = await supabase.from('plans').insert({
      crew_id: activeCrew.id, created_by: user.id,
      title: f.title.trim(), emoji: f.emoji, place_name: f.place_name.trim() || null, location: f.location.trim() || null,
      starts_at: starts.toISOString(), expires_at: expires.toISOString(),
    })
    setBusy(false)
    if (error) return toast(friendly(error, 'Couldn’t drop the plan. Try again.'))
    toast('Plan dropped', 'ok'); onCreated?.(); onClose()
  }

  return (
    <Modal title="Drop a plan" icon={<Icon.clock />} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field"><span>Vibe</span>
          <div className="swatches">
            {EMOJI.map((em) => <button type="button" key={em} className={`swatch emoji ${f.emoji === em ? 'on' : ''}`} onClick={() => setF({ ...f, emoji: em })}>{em}</button>)}
          </div>
        </div>
        <label className="field"><span>What</span><input className="input" required autoFocus maxLength={60} placeholder="Ramen at Miss Kay's" value={f.title} onChange={set('title')} /></label>
        <div className="row2">
          <label className="field"><span>Place</span><input className="input" maxLength={60} placeholder="Miss Kay's" value={f.place_name} onChange={set('place_name')} /></label>
          <label className="field"><span>Area</span><input className="input" maxLength={60} placeholder="Fortitude Valley" value={f.location} onChange={set('location')} /></label>
        </div>
        <div className="row2">
          <label className="field"><span>When</span><input className="input" type="datetime-local" required value={f.starts_at} onChange={set('starts_at')} /></label>
          <label className="field"><span>Expires after</span>
            <select className="input" value={f.hours} onChange={set('hours')}>
              <option value="1">1 hour</option><option value="2">2 hours</option><option value="4">4 hours</option>
              <option value="8">8 hours</option><option value="24">1 day</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !f.title.trim()}>{busy ? 'Dropping…' : '＋ Drop it'}</button>
        </div>
      </form>
    </Modal>
  )
}
