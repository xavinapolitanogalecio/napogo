import { useState, useEffect } from 'react'

const QUEUE_KEY = 'repartos_offline_queue'

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] }
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [queue, setQueue] = useState(loadQueue)

  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  function enqueue(item) {
    const next = [...loadQueue(), { ...item, ts: Date.now() }]
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next))
    setQueue(next)
  }

  function clearQueue() {
    localStorage.removeItem(QUEUE_KEY)
    setQueue([])
  }

  return { isOnline, queue, enqueue, clearQueue }
}
