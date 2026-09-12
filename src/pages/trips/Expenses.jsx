import { useState } from 'react'
import Modal from '../../components/Modal'
import { Icon } from '../../components/Icons'
import { Av } from '../../components/Avatar'
import { useToast } from '../../providers/ToastProvider'
import { friendly, money } from '../../lib/format'

function ExpenseModal({ onClose, onAdd, members }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    const n = Number(amount)
    if (!(n > 0)) return toast('Enter an amount above zero.')
    setBusy(true)
    try { await onAdd({ title: title.trim(), amount: Math.round(n * 100) / 100 }); onClose() }
    catch (err) { toast(friendly(err, 'Couldn’t add the expense. Try again.')) }
    setBusy(false)
  }
  return (
    <Modal title="Add an expense" icon={<Icon.money />} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field"><span>What for</span><input className="input" required autoFocus maxLength={60} placeholder="Airbnb — 2 nights" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field"><span>Amount you paid</span><input className="input" required type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <div className="state">Split equally ÷ {members.length} across the crew.</div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !title.trim() || !amount}>{busy ? 'Adding…' : 'Add expense'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Expenses({ trip, members, userId, data }) {
  const { balances, recent, loading, error, reload, add } = data
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))
  const mine = Number(balances?.find((b) => b.user_id === userId)?.balance ?? 0)
  const dir = (n) => (Math.abs(n) < 0.005 ? 'even' : n > 0 ? 'get' : 'owe')
  const amtText = (n) => (dir(n) === 'even' ? 'settled' : `${n > 0 ? '+' : '−'} $${money(Math.abs(n))}`)

  return (
    <section className="card full" id="money">
      <div className="head">
        <h2><span className="ic"><Icon.money /></span>Who owes who</h2>
        <button className="link" onClick={() => setAdding(true)}>＋ Add an expense</button>
      </div>
      {loading ? <div className="state">Loading balances…</div>
        : error ? <div className="state err">Couldn’t load expenses.<button className="link" onClick={reload}>Retry</button></div>
        : (
          <div className="expwrap">
            <div>
              {balances.length === 0 && <div className="state">No balances yet.</div>}
              {[...balances].sort((a, b) => Number(b.balance) - Number(a.balance)).map((b) => {
                const p = byId[b.user_id]; const n = Number(b.balance); const d = dir(n)
                return (
                  <div className="bal" key={b.user_id}>
                    <Av person={p} />
                    <div className="who">{b.user_id === userId ? 'You' : p?.display_name || 'Member'}
                      <small>{d === 'get' ? 'is owed by the group' : d === 'owe' ? (b.user_id === userId ? 'owe the group' : 'owes the group') : 'square with everyone'}</small>
                    </div>
                    <div className={`amt ${d}`}>{amtText(n)}</div>
                  </div>
                )
              })}
            </div>
            <div>
              <div className="recent-h">Recent expenses</div>
              {recent.length === 0 && <div className="state">No expenses yet. Add the first one.</div>}
              {recent.map((r) => (
                <div className="exp" key={r.id}>
                  <div><div className="t">{r.title}</div>
                    <small>{r.paid_by === userId ? 'You' : r.profiles?.display_name || 'Someone'} paid · split ÷ {r.expense_shares?.[0]?.count ?? 0}</small></div>
                  <b>${money(r.amount)}</b>
                </div>
              ))}
              <div className="settle">
                <div className="total"><small>Your balance</small><b className={`amt ${dir(mine)}`}>{amtText(mine)}</b></div>
                <button className="btn primary" onClick={() => toast('Settling up lands in the next phase — for now, sort it in person.', 'ok')}>Settle up</button>
              </div>
            </div>
          </div>
        )}
      {adding && <ExpenseModal members={members} onClose={() => setAdding(false)} onAdd={(f) => add({ ...f, tripId: trip?.id, memberIds: members.map((m) => m.id) })} />}
    </section>
  )
}
