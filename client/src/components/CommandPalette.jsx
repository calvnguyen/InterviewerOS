import { useState, useEffect, useRef, useCallback } from 'react'
import { useFuseSearch } from '../hooks/useFuseSearch.js'
import CompanyAvatar from './CompanyAvatar.jsx'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Filter } from 'lucide-react'

const STAGE_LABELS = {
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

const STAGE_BADGE_CLASSES = {
  applied: 'bg-indigo-50 text-indigo-700',
  phone_screen: 'bg-amber-50 text-amber-700',
  interview: 'bg-blue-50 text-blue-700',
  offer: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const STATIC_ACTIONS = [
  { id: 'add', label: 'Add application', description: 'Create a new job application', Icon: Plus },
  { id: 'sync', label: 'Sync Gmail', description: 'Import emails from your inbox', Icon: RefreshCw },
  { id: 'stage:applied', label: 'Filter: Applied', Icon: Filter },
  { id: 'stage:phone_screen', label: 'Filter: Phone Screen', Icon: Filter },
  { id: 'stage:interview', label: 'Filter: Interview', Icon: Filter },
  { id: 'stage:offer', label: 'Filter: Offer', Icon: Filter },
]

export default function CommandPalette({ isOpen, onClose, applications, onSelectApp, onAction }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)

  const fuseResults = useFuseSearch(applications, query)

  const filteredActions = query
    ? STATIC_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : STATIC_ACTIONS

  const totalItems = fuseResults.length + filteredActions.length

  const execute = useCallback((item) => {
    if (!item) return
    if (item._kind === 'app') {
      onSelectApp(item)
    } else {
      onAction(item.id)
    }
    onClose()
  }, [onSelectApp, onAction, onClose])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [isOpen])

  useEffect(() => { setActiveIdx(0) }, [query])

  useEffect(() => {
    function handleKey(e) {
      if (!isOpen) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, totalItems - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const appCount = fuseResults.length
        if (activeIdx < appCount) {
          execute({ ...fuseResults[activeIdx].item, _kind: 'app' })
        } else {
          execute({ ...filteredActions[activeIdx - appCount], _kind: 'action' })
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, activeIdx, fuseResults, filteredActions, totalItems, execute, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[14vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[560px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search applications, actions..."
            className="flex-1 text-[15px] text-slate-900 placeholder-slate-400 border-none outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-sm leading-none"
            >
              ✕
            </button>
          )}
          <kbd className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono shrink-0">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {totalItems === 0 && query ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-300 mt-1">Try a different search or browse actions below</p>
            </div>
          ) : (
            <>
              {fuseResults.length > 0 && (
                <section>
                  <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Applications
                  </div>
                  {fuseResults.map(({ item: app }, i) => (
                    <button
                      key={app.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-none text-left transition-colors ${
                        activeIdx === i ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => execute({ ...app, _kind: 'app' })}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      <CompanyAvatar company={app.company} size="sm" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[13px] text-slate-900">{app.company}</span>
                        <span className="text-slate-400 text-[13px] mx-1.5">—</span>
                        <span className="text-[13px] text-slate-600">{app.role}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${STAGE_BADGE_CLASSES[app.stage]}`}>
                        {STAGE_LABELS[app.stage]}
                      </Badge>
                    </button>
                  ))}
                </section>
              )}

              {filteredActions.length > 0 && (
                <section>
                  <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </div>
                  {filteredActions.map((action, i) => {
                    const globalIdx = fuseResults.length + i
                    const Icon = action.Icon
                    return (
                      <button
                        key={action.id}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-none text-left transition-colors ${
                          activeIdx === globalIdx ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'
                        }`}
                        onClick={() => execute({ ...action, _kind: 'action' })}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-slate-600" />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-slate-800">{action.label}</div>
                          {action.description && (
                            <div className="text-[11px] text-slate-400">{action.description}</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2 flex gap-4 text-[11px] text-slate-400">
          <span><kbd className="bg-slate-100 px-1 rounded text-[10px] font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="bg-slate-100 px-1 rounded text-[10px] font-mono">↵</kbd> select</span>
          <span><kbd className="bg-slate-100 px-1 rounded text-[10px] font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
