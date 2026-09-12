import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()
  const show = useCallback((text, kind = 'err') => {
    clearTimeout(timer.current)
    setToast({ text, kind })
    timer.current = setTimeout(() => setToast(null), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.text}</div>}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
