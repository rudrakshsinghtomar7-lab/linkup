import { useState } from 'react'
import Modal from '../../components/Modal'
import { Icon } from '../../components/Icons'
import { useToast } from '../../providers/ToastProvider'
import { friendly } from '../../lib/format'

export default function TripModal({ onClose, onCreate }) {
  const toast = useToast()
  const [f, setF] = useState({ title: '', destination: '', start_date: '', end_date: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (f.start_date && f.end_date && f.end_date < f.start_date) return toast('The trip can’t end before it starts.')
    setBusy(true)
    try {
      await onCreate({ title: f.title.trim(), destination: f.destination.trim() || null, start_date: f.start_date || null, end_date: f.end_date || null })
      onClose()
    } catch (err) { toast(friendly(err, 'Couldn’t create the trip. Try again.')) }
    setBusy(false)
  }

  return (
    <Modal title="New trip" icon={<Icon.pin />} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field"><span>Trip name</span>
          <input className="input" required autoFocus maxLength={60} placeholder="Gold Coast road trip" value={f.title} onChange={set('title')} />
        </label>
        <label className="field"><span>Where</span>
          <input className="input" maxLength={80} placeholder="Surfers Paradise → Byron Bay" value={f.destination} onChange={set('destination')} />
        </label>
        <div className="row2">
          <label className="field"><span>Starts</span><input className="input" type="date" value={f.start_date} onChange={set('start_date')} /></label>
          <label className="field"><span>Ends</span><input className="input" type="date" value={f.end_date} onChange={set('end_date')} /></label>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !f.title.trim()}>{busy ? 'Creating…' : 'Create trip'}</button>
        </div>
      </form>
    </Modal>
  )
}
