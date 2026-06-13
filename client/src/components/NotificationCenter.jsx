import { useState, useRef, useEffect } from 'react'
import { Bell, Check, X, RefreshCw, AlertTriangle, Star, Mail } from 'lucide-react'

const TYPE_ICONS = {
  sync_complete: RefreshCw,
  sync_error: AlertTriangle,
  stale_alert: AlertTriangle,
  offer: Star,
  import: Mail,
}

const PRIORITY_ICON_CLASSES = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-slate-400',
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationCenter({ notifications, onMarkRead, onMarkAllRead, onDismiss }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors bg-transparent border-none cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={17} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[340px] bg-white rounded-xl shadow-xl border border-slate-200 z-[200] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-[12px] text-indigo-600 hover:text-indigo-800 bg-transparent border-none cursor-pointer font-medium"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">You&apos;re all caught up</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || Bell
                return (
                  <div
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    className={`flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !n.read ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${PRIORITY_ICON_CLASSES[n.priority] || 'text-slate-400'}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] text-slate-800 leading-snug ${!n.read ? 'font-semibold' : 'font-medium'}`}>
                        {n.title}
                      </p>
                      <p className="text-[12px] text-slate-500 mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{relativeTime(n.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); onDismiss(n.id) }}
                        className="text-slate-300 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0"
                      >
                        <X size={13} />
                      </button>
                      {!n.read && (
                        <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
