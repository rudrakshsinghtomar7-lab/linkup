import { Icon } from '../../components/Icons'
import { avatarGradient, initials, timeAgo } from '../../lib/format'

export default function Feed({ items, loading, error, onReload }) {
  return (
    <section className="card" id="feed">
      <div className="head">
        <h2><span className="ic"><Icon.bars /></span>Live now</h2>
      </div>
      <div className="feed">
        {loading ? <div className="state">Listening…</div>
          : error ? <div className="state err">Couldn’t load activity.<button className="link" onClick={onReload}>Retry</button></div>
          : items.length === 0 ? <div className="state">Quiet for now. Drop a plan or share where you are.</div>
          : items.map((it) => (
            <div className="item" key={it.key}>
              <div className="dot" style={{ background: avatarGradient(it.person?.color) }}>{initials(it.person?.display_name)}</div>
              <div className="tx">{it.text}<small>{timeAgo(it.at)}</small></div>
            </div>
          ))}
      </div>
    </section>
  )
}
