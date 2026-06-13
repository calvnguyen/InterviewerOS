import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import { getApplications, getLastSynced, syncGmail, updateApplication, deleteApplication } from '../lib/api.js'
import Logo from '../components/Logo.jsx'
import ApplicationModal from '../components/ApplicationModal.jsx'
import ApplicationDrawer from '../components/ApplicationDrawer.jsx'
import CompanyAvatar from '../components/CompanyAvatar.jsx'
import MetricsStrip from '../components/MetricsStrip.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Send, Phone, Calendar, Star, XCircle } from 'lucide-react'

const STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'phone_screen', label: 'Phone Screen' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
]

const STAGE_DOT_CLASSES = {
  applied: 'bg-indigo-500',
  phone_screen: 'bg-amber-500',
  interview: 'bg-blue-500',
  offer: 'bg-green-500',
  rejected: 'bg-red-500',
}

const NEXT_ACTION_CLASSES = {
  'Follow up': 'bg-amber-100 text-amber-700 border-amber-200',
  'Awaiting response': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Prepare for call': 'bg-blue-100 text-blue-700 border-blue-200',
  'Prepare for interview': 'bg-blue-100 text-blue-700 border-blue-200',
  'Respond to offer': 'bg-green-100 text-green-700 border-green-200',
}

const EMPTY_STATE_CONFIG = {
  applied: {
    Icon: Send,
    title: 'No applications yet',
    description: 'Add one manually or sync your Gmail inbox.',
  },
  phone_screen: {
    Icon: Phone,
    title: 'No calls scheduled',
    description: 'Applications move here when a recruiter reaches out.',
  },
  interview: {
    Icon: Calendar,
    title: 'No interviews upcoming',
    description: "You'll see interviews here once scheduled.",
  },
  offer: {
    Icon: Star,
    title: 'No offers yet',
    description: "Keep going — you're making progress.",
  },
  rejected: {
    Icon: XCircle,
    title: 'Nothing here',
    description: "Rejections happen — they're part of the process.",
  },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Draggable card wrapper
function DraggableCard({ app, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { app },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-40' : ''}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

// Droppable column wrapper
function DroppableColumn({ stageKey, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2.5 min-h-[60px] rounded-lg transition-colors ${
        isOver ? 'bg-indigo-50/60' : ''
      }`}
    >
      {children}
    </div>
  )
}

function ApplicationCard({ app, onEdit, onStageChange, stageChanging, onCardClick }) {
  const [moveOpen, setMoveOpen] = useState(false)
  const otherStages = STAGES.filter(s => s.key !== app.stage)

  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm relative transition-shadow hover:shadow-md cursor-pointer ${
        app.stale ? 'border-l-[3px] border-amber-400' : 'border-l-[3px] border-transparent'
      }`}
      title={app.stale ? 'No update in 7+ days' : undefined}
      onClick={() => onCardClick(app)}
    >
      {app.stale && (
        <Badge className="absolute top-2.5 right-2.5 text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 uppercase tracking-wide">
          Needs attention
        </Badge>
      )}

      {/* Company name with avatar */}
      <div className="flex items-center gap-2 mb-0.5 pr-24">
        <CompanyAvatar company={app.company} size="sm" />
        <span className="font-bold text-[15px] text-slate-900 leading-tight truncate">{app.company}</span>
      </div>
      <div className="text-[13px] text-slate-500 mb-1.5 pl-8">{app.role}</div>
      <div className="text-[12px] text-slate-400 mb-2 pl-8">{formatDate(app.date_applied)}</div>

      {app.next_action && (
        <Badge
          variant="outline"
          className={`text-[11px] font-semibold mb-2.5 ${NEXT_ACTION_CLASSES[app.next_action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
        >
          {app.next_action}
        </Badge>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={e => { e.stopPropagation(); setMoveOpen(o => !o) }}
            disabled={stageChanging}
            data-testid={`move-btn-${app.id}`}
          >
            Move to &#9662;
          </Button>
          {moveOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
              {otherStages.map(s => (
                <button
                  key={s.key}
                  className="w-full px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                  onClick={e => {
                    e.stopPropagation()
                    setMoveOpen(false)
                    onStageChange(app.id, s.key, app.stage)
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2.5"
          onClick={e => { e.stopPropagation(); onEdit(app) }}
          data-testid={`edit-btn-${app.id}`}
        >
          Edit
        </Button>
      </div>
    </div>
  )
}

// Ghost card shown in DragOverlay
function GhostCard({ app }) {
  return (
    <div className="bg-white rounded-xl p-3.5 shadow-xl border border-indigo-200 opacity-95 w-full cursor-grabbing">
      <div className="flex items-center gap-2 mb-0.5">
        <CompanyAvatar company={app.company} size="sm" />
        <span className="font-bold text-[15px] text-slate-900 leading-tight truncate">{app.company}</span>
      </div>
      <div className="text-[13px] text-slate-500 pl-8">{app.role}</div>
    </div>
  )
}

export default function Pipeline() {
  const { signOut, providerToken } = useSession()
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [lastSynced, setLastSynced] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState('')

  const [modalApp, setModalApp] = useState(undefined) // undefined=closed, null=add, object=edit
  const [stageChanging, setStageChanging] = useState(false)
  const [stageError, setStageError] = useState('')

  const [drawerApp, setDrawerApp] = useState(undefined)
  const [stageFilter, setStageFilter] = useState('all')

  // dnd-kit: active drag item
  const [activeApp, setActiveApp] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // Auto-sync on first mount
  useEffect(() => {
    async function autoSync() {
      if (providerToken) {
        setSyncing(true)
        setSyncMessage('Scanning your inbox...')
        try {
          const result = await syncGmail(providerToken)
          setLastSynced(result.last_synced_at || new Date().toISOString())
          if (result.imported > 0) {
            setSyncMessage(`${result.imported} new application${result.imported !== 1 ? 's' : ''} imported.`)
          } else {
            setSyncMessage('Inbox scanned. No new applications found.')
          }
          await loadApplications()
        } catch {
          setSyncError('Gmail sync failed. Click "Sync Gmail" to retry.')
        } finally {
          setSyncing(false)
        }
      }
    }
    autoSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerToken])

  const loadApplications = useCallback(async () => {
    setLoadError('')
    try {
      const data = await getApplications()
      setApplications(data.applications || [])
    } catch {
      setLoadError('Could not load your pipeline.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLastSynced = useCallback(async () => {
    try {
      const data = await getLastSynced()
      setLastSynced(data.last_synced_at)
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    loadApplications()
    loadLastSynced()
  }, [loadApplications, loadLastSynced])

  async function handleSyncGmail() {
    setSyncing(true)
    setSyncError('')
    setSyncMessage('')
    try {
      if (!providerToken) {
        setSyncError('Gmail access expired. Please sign out and sign back in with Google.')
        setSyncing(false)
        return
      }
      const result = await syncGmail(providerToken)
      setLastSynced(result.last_synced_at || new Date().toISOString())
      setSyncMessage(`${result.imported} new application${result.imported !== 1 ? 's' : ''} imported.`)
      await loadApplications()
    } catch (err) {
      setSyncError(err.message || 'Gmail sync failed. Try again.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleEdit(app) { setModalApp(app) }
  function handleAddNew() { setModalApp(null) }

  function handleModalSave(savedApp) {
    setApplications(prev => {
      const exists = prev.find(a => a.id === savedApp.id)
      if (exists) return prev.map(a => a.id === savedApp.id ? savedApp : a)
      return [...prev, savedApp]
    })
    setModalApp(undefined)
  }

  function handleModalDelete(deletedId) {
    setApplications(prev => prev.filter(a => a.id !== deletedId))
    setModalApp(undefined)
  }

  async function handleStageChange(appId, newStage, previousStage) {
    setStageChanging(true)
    setStageError('')
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: newStage } : a))
    try {
      const result = await updateApplication(appId, { stage: newStage })
      setApplications(prev => prev.map(a => a.id === appId ? result.application : a))
    } catch {
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: previousStage } : a))
      setStageError('Could not move application. Please try again.')
    } finally {
      setStageChanging(false)
    }
  }

  async function handleDrawerDelete(appId) {
    try {
      await deleteApplication(appId)
      setApplications(prev => prev.filter(a => a.id !== appId))
      setDrawerApp(undefined)
    } catch {
      setStageError('Could not delete application. Please try again.')
    }
  }

  // dnd-kit handlers
  function handleDragStart(event) {
    const app = applications.find(a => a.id === event.active.id)
    if (app) setActiveApp(app)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveApp(null)

    if (!over) return

    const activeId = active.id
    const overColumnId = over.id

    // over.id is a stage key (from DroppableColumn)
    const validStages = STAGES.map(s => s.key)
    if (!validStages.includes(overColumnId)) return

    const app = applications.find(a => a.id === activeId)
    if (!app) return
    if (app.stage === overColumnId) return

    handleStageChange(activeId, overColumnId, app.stage)
  }

  const filtered = search.trim()
    ? applications.filter(a => a.company.toLowerCase().includes(search.toLowerCase()))
    : applications

  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = filtered.filter(a => a.stage === s.key)
    return acc
  }, {})

  const visibleStages = stageFilter === 'all'
    ? STAGES
    : STAGES.filter(s => s.key === stageFilter)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 h-[60px] flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-bold text-[17px] text-slate-900">InterviewerOS</span>
          <Input
            className="ml-4 h-8 text-sm bg-slate-50 w-[220px]"
            type="text"
            placeholder="Search by company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastSynced && (
            <span className="text-xs text-slate-400">Last synced {formatDate(lastSynced)}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncGmail}
            disabled={syncing}
            data-testid="sync-gmail-button"
          >
            {syncing ? 'Syncing...' : 'Sync Gmail'}
          </Button>
          <Button
            size="sm"
            onClick={handleAddNew}
            data-testid="add-application-button"
          >
            + Add application
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            data-testid="logout-button"
          >
            Log out
          </Button>
        </div>
      </header>

      {/* Status banners */}
      {syncMessage && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-2.5 text-sm text-green-800 flex items-center justify-between">
          {syncMessage}
          <button className="opacity-60 hover:opacity-100 text-base bg-transparent border-none cursor-pointer" onClick={() => setSyncMessage('')}>&#x2715;</button>
        </div>
      )}
      {syncError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-sm text-red-700 flex items-center justify-between">
          {syncError}
          <button className="opacity-60 hover:opacity-100 text-base bg-transparent border-none cursor-pointer" onClick={() => setSyncError('')}>&#x2715;</button>
        </div>
      )}
      {stageError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-sm text-red-700 flex items-center justify-between">
          {stageError}
          <button className="opacity-60 hover:opacity-100 text-base bg-transparent border-none cursor-pointer" onClick={() => setStageError('')}>&#x2715;</button>
        </div>
      )}

      {/* Board */}
      <main className="flex-1 p-6 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <div className="w-10 h-10 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading your pipeline...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <p className="text-base font-medium text-red-600">{loadError}</p>
            <Button onClick={loadApplications}>Retry</Button>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <div className="text-5xl">&#x1F4C4;</div>
            <p className="text-xl font-bold text-slate-900">No applications yet</p>
            <p className="text-sm text-slate-500">Add your first job application to get started.</p>
            <Button onClick={handleAddNew} data-testid="empty-add-application-button">
              + Add application
            </Button>
          </div>
        ) : (
          <>
            {/* Metrics strip */}
            <MetricsStrip applications={applications} />

            {/* Stage filter pills */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  stageFilter === 'all'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setStageFilter('all')}
              >
                All
              </button>
              {STAGES.map(s => (
                <button
                  key={s.key}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    stageFilter === s.key
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setStageFilter(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Kanban board with DnD */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div
                className={`grid gap-4 ${
                  stageFilter === 'all' ? 'grid-cols-5' : 'grid-cols-1'
                }`}
              >
                {visibleStages.map(s => {
                  const emptyConfig = EMPTY_STATE_CONFIG[s.key]
                  const EmptyIcon = emptyConfig?.Icon

                  return (
                    <div
                      key={s.key}
                      className={`flex flex-col bg-white rounded-xl border border-slate-100 p-3 shadow-sm ${
                        stageFilter !== 'all' ? 'max-w-md' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT_CLASSES[s.key]}`} />
                        <span className="font-semibold text-sm text-slate-700">{s.label}</span>
                        <span className="text-xs text-slate-400 ml-auto">{grouped[s.key].length}</span>
                      </div>

                      <DroppableColumn stageKey={s.key}>
                        {grouped[s.key].length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                            {EmptyIcon && (
                              <EmptyIcon size={24} className="text-slate-300" />
                            )}
                            <p className="text-sm font-medium text-slate-400">{emptyConfig?.title}</p>
                            <p className="text-xs text-slate-300 max-w-[160px] leading-relaxed">{emptyConfig?.description}</p>
                          </div>
                        ) : (
                          grouped[s.key].map(app => (
                            <DraggableCard key={app.id} app={app}>
                              <ApplicationCard
                                app={app}
                                onEdit={handleEdit}
                                onStageChange={handleStageChange}
                                stageChanging={stageChanging}
                                onCardClick={setDrawerApp}
                              />
                            </DraggableCard>
                          ))
                        )}
                      </DroppableColumn>
                    </div>
                  )
                })}
              </div>

              {/* Drag overlay ghost card */}
              <DragOverlay>
                {activeApp ? <GhostCard app={activeApp} /> : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </main>

      {/* Drawer */}
      <ApplicationDrawer
        app={drawerApp}
        onClose={() => setDrawerApp(undefined)}
        onEdit={app => {
          setDrawerApp(undefined)
          setModalApp(app)
        }}
        onDelete={handleDrawerDelete}
        onStageChange={handleStageChange}
      />

      {/* Modal */}
      {modalApp !== undefined && (
        <ApplicationModal
          application={modalApp}
          onClose={() => setModalApp(undefined)}
          onSave={handleModalSave}
          onDelete={handleModalDelete}
        />
      )}
    </div>
  )
}
