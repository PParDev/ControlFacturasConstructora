import { useEffect, useState } from 'react'
import { subscribe } from '../lib/toast'

const DURATION = 4500

const STYLES = {
  success: {
    bar:  'bg-emerald-500',
    icon: '✓',
    iconBg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    title: 'text-emerald-800',
  },
  error: {
    bar:  'bg-red-500',
    icon: '✕',
    iconBg: 'bg-red-100 text-red-700',
    border: 'border-red-200',
    title: 'text-red-800',
  },
  warning: {
    bar:  'bg-yellow-400',
    icon: '⚠',
    iconBg: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-200',
    title: 'text-yellow-800',
  },
  info: {
    bar:  'bg-blue-500',
    icon: 'i',
    iconBg: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    title: 'text-blue-800',
  },
}

function ToastItem({ t, onClose }) {
  const s = STYLES[t.type] || STYLES.info
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const enter = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(enter)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  return (
    <div
      className={`
        flex items-start gap-3 bg-white border ${s.border} rounded-xl shadow-lg
        px-4 py-3 w-[340px] max-w-[90vw] overflow-hidden relative
        transition-all duration-200 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {/* Colored left bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar} rounded-l-xl`} />

      {/* Icon */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${s.iconBg} ml-1`}>
        {s.icon}
      </div>

      {/* Message */}
      <div className={`flex-1 text-sm font-medium leading-snug ${s.title} pr-4`}>
        {t.msg}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-2.5 right-2.5 text-gray-300 hover:text-gray-500 text-lg leading-none transition-colors"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

export function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribe((t) => {
      setToasts(p => [...p, t])
      setTimeout(() => {
        setToasts(p => p.filter(x => x.id !== t.id))
      }, DURATION)
    })
  }, [])

  const remove = (id) => setToasts(p => p.filter(x => x.id !== id))

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem t={t} onClose={() => remove(t.id)} />
        </div>
      ))}
    </div>
  )
}
