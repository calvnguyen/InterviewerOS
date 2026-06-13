import { useRef, useEffect } from 'react'
import CompanyAvatar from './CompanyAvatar.jsx'
import { Badge } from '@/components/ui/badge'

const STAGE_LABELS = {
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

const STAGE_BADGE_CLASSES = {
  applied: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  phone_screen: 'bg-amber-50 text-amber-700 border-amber-100',
  interview: 'bg-blue-50 text-blue-700 border-blue-100',
  offer: 'bg-green-50 text-green-700 border-green-100',
  rejected: 'bg-red-50 text-red-600 border-red-100',
}

function relativeTime(iso) {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function SearchDropdown({ results, onSelect, activeIndex, onSetActiveIndex }) {
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current && activeIndex >= 0) {
      const item = listRef.current.children[activeIndex]
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  if (results.length === 0) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-[200] overflow-hidden max-h-[400px] overflow-y-auto">
      <div className="px-3.5 py-1.5 text-[11px] text-slate-400 font-medium uppercase tracking-wider border-b border-slate-100">
        Applications
      </div>
      <div ref={listRef}>
        {results.map(({ item: app }, idx) => (
          <button
            key={app.id}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors border-none cursor-pointer ${
              idx === activeIndex ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'
            }`}
            onMouseEnter={() => onSetActiveIndex(idx)}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onSelect(app)}
          >
            <CompanyAvatar company={app.company} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[13px] text-slate-900 truncate">{app.company}</span>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${STAGE_BADGE_CLASSES[app.stage]}`}>
                  {STAGE_LABELS[app.stage]}
                </Badge>
              </div>
              <div className="text-[12px] text-slate-500 truncate">{app.role}</div>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0 ml-2">
              {relativeTime(app.updated_at || app.date_applied)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
