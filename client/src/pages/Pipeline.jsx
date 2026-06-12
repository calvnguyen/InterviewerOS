import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import { getApplications, getLastSynced, syncGmail, updateApplication } from '../lib/api.js'
import Logo from '../components/Logo.jsx'
import ApplicationModal from '../components/ApplicationModal.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ApplicationCard({ app, onEdit, onStageChange, stageChanging }) {
  const [moveOpen, setMoveOpen] = useState(false)
  const otherStages = STAGES.filter(s => s.key !== app.stage)

  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm relative transition-shadow hover:shadow-md cursor-default ${
        app.stale ? 'border-l-[3px] border-amber-400' : 'border-l-[3px] border-transparent'
      }`}
      title={app.stale ? 'No update in 7+ days' : undefined}
    >
      {app.stale && (
        <Badge className="absolute top-2.5 right-2.5 text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 uppercase tracking-wide">
          Needs attention
        </Badge>
      )}

      <div className="font-bold text-[15px] text-slate-900 mb-0.5 pr-24 leading-tight">{app.company}</div>
      <div className="text-[13px] text-slate-500 mb-1.5">{app.role}</div>
      <div className="text-[12px] text-slate-400 mb-2">{formatDate(app.date_applied)}</div>

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
            onClick={() => setMoveOpen(o => !o)}
            disabled={stageChanging}
            data-testid={`move-btn-${app.id}`}
          >
            Move to ▾
          </Button>
          {moveOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
              {otherStages.map(s => (
                <button
                  key={s.key}
                  className="w-full px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                  onClick={() => {
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
          onClick={() => onEdit(app)}
          data-testid={`edit-btn-${app.id}`}
        >
          Edit
        </Button>
      </div>
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

  // Auto-sync on first mount using the Google provider_token from the Supabase session
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
  }, [])

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

  const filtered = search.trim()
    ? applications.filter(a => a.company.toLowerCase().includes(search.toLowerCase()))
    : applications

  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = filtered.filter(a => a.stage === s.key)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
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
          <button className="opacity-60 hover:opacity-100 text-base bg-transparent border-none cursor-pointer" onClick={() => setSyncMessage('')}>✕</button>
        </div>
      )}
      {syncError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-sm text-red-700 flex items-center justify-between">
          {syncError}
          <button className="opacity-60 hover:opacity-100 text-base bg-transparent border-none cursor-pointer" onClick={() => setSyncError('')}>✕</button>
        </div>
      )}
      {stageError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-sm text-red-700 flex items-center justify-between">
          {stageError}
          <button className="opacity-60 hover:opacity-100 text-base bg-transparent border-none cursor-pointer" onClick={() => setStageError('')}>✕</button>
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
            <div className="text-5xl">📄</div>
            <p className="text-xl font-bold text-slate-900">No applications yet</p>
            <p className="text-sm text-slate-500">Add your first job application to get started.</p>
            <Button onClick={handleAddNew} data-testid="empty-add-application-button">
              + Add application
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {STAGES.map(s => (
              <div key={s.key} className="flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT_CLASSES[s.key]}`} />
                  <span className="font-semibold text-sm text-slate-700">{s.label}</span>
                  <span className="text-xs text-slate-400 ml-auto">{grouped[s.key].length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {grouped[s.key].length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-4">No applications</div>
                  ) : (
                    grouped[s.key].map(app => (
                      <ApplicationCard
                        key={app.id}
                        app={app}
                        onEdit={handleEdit}
                        onStageChange={handleStageChange}
                        stageChanging={stageChanging}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
