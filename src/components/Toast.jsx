import { useEffect } from 'react'

export default function Toast({ mensaje, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-[5.5rem] left-1/2 -translate-x-1/2 z-[100] px-5 py-3 bg-emerald-600 text-white text-sm font-bold rounded-2xl shadow-xl flex items-center gap-2 whitespace-nowrap animate-bounce-once">
      {mensaje}
    </div>
  )
}
