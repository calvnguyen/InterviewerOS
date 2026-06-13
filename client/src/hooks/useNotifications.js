import { useState, useCallback } from 'react'

let _seq = 0

export function useNotifications() {
  const [notifications, setNotifications] = useState([])

  const add = useCallback(({ type, title, message, priority = 'medium' }) => {
    const id = `notif-${++_seq}`
    setNotifications(prev => [
      { id, type, title, message, priority, read: false, created_at: new Date().toISOString() },
      ...prev,
    ])
    return id
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, add, markRead, markAllRead, dismiss, unreadCount }
}
