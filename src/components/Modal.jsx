import { useEffect } from 'react'

export default function Modal({ title, icon, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true">
        {title && <h3>{icon && <span className="ic">{icon}</span>}{title}</h3>}
        {children}
      </div>
    </div>
  )
}
