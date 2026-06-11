import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import { getApplications, getLastSynced, syncGmail, updateApplication } from '../lib/api.js'
import ApplicationModal from '../components/ApplicationModal.jsx'

const STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'phone_screen', label: 'Phone Screen' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' }
]

const STAGE_COLORS = {
  applied: '#6366f1',
  phone_screen: '#f59e0b',
  interview: '#3b82f6',
  offer: '#10b981',
  rejected: '#ef4444'
}

const NEXT_ACTION_COLORS = {
  'Follow up': '#f59e0b',
  'Awaiting response': '#6366f1',
  'Prepare for call': '#3b82f6',
  'Prepare for interview': '#3b82f6',
  'Respond to offer': '#10b981'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ApplicationCard({ app, onEdit, onStageChange, stageChanging }) {
  const [moveOpen, setMoveOpen] = useState(false)
  const otherStages = STAGES.filter(s => s.key !== app.stage)
  const actionColor = NEXT_ACTION_COLORS[app.next_action] || '#64748b'

  return (
    <div
      style={{
        ...cardStyles.card,
        borderLeft: app.stale ? '3px solid #f59e0b' : '3px solid transparent'
      }}
      title={app.stale ? 'No update in 7+ days' : undefined}
    >
      {app.stale && (
        <div style={cardStyles.staleBadge} title="No update in 7+ days">
          Needs attention
        </div>
      )}

      <div style={cardStyles.company}>{app.company}</div>
      <div style={cardStyles.role}>{app.role}</div>
      <div style={cardStyles.date}>{formatDate(app.date_applied)}</div>

      {app.next_action && (
        <div style={{ ...cardStyles.nextAction, background: actionColor + '18', color: actionColor }}>
          {app.next_action}
        </div>
      )}

      <div style={cardStyles.actions}>
        <div style={cardStyles.moveWrapper}>
          <button
            style={cardStyles.moveBtn}
            onClick={() => setMoveOpen(o => !o)}
            disabled={stageChanging}
            data-testid={`move-btn-${app.id}`}
          >
            Move to ▾
          </button>
          {moveOpen && (
            <div style={cardStyles.dropdown}>
              {otherStages.map(s => (
                <button
                  key={s.key}
                  style={cardStyles.dropdownItem}
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

        <button
          style={cardStyles.editBtn}
          onClick={() => onEdit(app)}
          data-testid={`edit-btn-${app.id}`}
        >
          Edit
        </button>
      </div>
    </div>
  )
}

const cardStyles = {
  card: {
    background: '#fff',
    borderRadius: '10px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: '10px',
    position: 'relative',
    transition: 'box-shadow 0.15s'
  },
  staleBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#92400e',
    background: '#fef3c7',
    borderRadius: '4px',
    padding: '2px 6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  company: {
    fontWeight: '700',
    fontSize: '15px',
    color: '#0f172a',
    marginBottom: '2px',
    paddingRight: '80px'
  },
  role: {
    fontSize: '13px',
    color: '#475569',
    marginBottom: '6px'
  },
  date: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '8px'
  },
  nextAction: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '20px',
    padding: '3px 10px',
    marginBottom: '10px'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  moveWrapper: {
    position: 'relative'
  },
  moveBtn: {
    fontSize: '12px',
    padding: '5px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#f8fafc',
    cursor: 'pointer',
    color: '#374151'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 100,
    minWidth: '140px',
    overflow: 'hidden'
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '9px 14px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer'
  },
  editBtn: {
    fontSize: '12px',
    padding: '5px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#f8fafc',
    cursor: 'pointer',
    color: '#374151'
  }
}

export default function Pipeline() {
  const { signOut, user, providerToken } = useSession()
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
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
  }, [providerToken]) // re-run when token arrives from context after OAuth redirect

  const loadApplications = useCallback(async () => {
    setLoadError('')
    try {
      const data = await getApplications()
      setApplications(data.applications || [])
    } catch (err) {
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

  function handleEdit(app) {
    setModalApp(app)
  }

  function handleAddNew() {
    setModalApp(null)
  }

  function handleModalSave(savedApp) {
    setApplications(prev => {
      const exists = prev.find(a => a.id === savedApp.id)
      if (exists) {
        return prev.map(a => a.id === savedApp.id ? savedApp : a)
      }
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
    // Optimistic update
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: newStage } : a))
    try {
      const result = await updateApplication(appId, { stage: newStage })
      setApplications(prev => prev.map(a => a.id === appId ? result.application : a))
    } catch (err) {
      // Revert
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: previousStage } : a))
      setStageError('Could not move application. Please try again.')
    } finally {
      setStageChanging(false)
    }
  }

  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = applications.filter(a => a.stage === s.key)
    return acc
  }, {})

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.brandIcon}>I</span>
          <span style={styles.brandName}>InterviewOS</span>
        </div>
        <div style={styles.navRight}>
          {lastSynced && (
            <span style={styles.lastSynced}>
              Last synced {formatDate(lastSynced)}
            </span>
          )}
          <button
            style={{ ...styles.syncBtn, ...(syncing ? styles.btnDisabled : {}) }}
            onClick={handleSyncGmail}
            disabled={syncing}
            data-testid="sync-gmail-button"
          >
            {syncing ? 'Syncing...' : 'Sync Gmail'}
          </button>
          <button
            style={styles.addBtn}
            onClick={handleAddNew}
            data-testid="add-application-button"
          >
            + Add application
          </button>
          <button
            style={styles.logoutBtn}
            onClick={handleLogout}
            data-testid="logout-button"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Sync status messages */}
      {syncMessage && (
        <div style={styles.syncSuccess}>
          {syncMessage}
          <button style={styles.bannerClose} onClick={() => setSyncMessage('')}>&#x2715;</button>
        </div>
      )}
      {syncError && (
        <div style={styles.syncError}>
          {syncError}
          <button style={styles.bannerClose} onClick={() => setSyncError('')}>&#x2715;</button>
        </div>
      )}
      {stageError && (
        <div style={styles.syncError}>
          {stageError}
          <button style={styles.bannerClose} onClick={() => setStageError('')}>&#x2715;</button>
        </div>
      )}

      {/* Board area */}
      <main style={styles.main}>
        {loading ? (
          <div style={styles.center}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading your pipeline...</p>
          </div>
        ) : loadError ? (
          <div style={styles.center}>
            <p style={styles.errorText}>{loadError}</p>
            <button style={styles.retryBtn} onClick={loadApplications}>Retry</button>
          </div>
        ) : applications.length === 0 ? (
          <div style={styles.center}>
            <div style={styles.emptyIcon}>&#128196;</div>
            <p style={styles.emptyTitle}>No applications yet</p>
            <p style={styles.emptySubtitle}>Add your first job application to get started.</p>
            <button
              style={styles.addBtnLarge}
              onClick={handleAddNew}
              data-testid="empty-add-application-button"
            >
              + Add application
            </button>
          </div>
        ) : (
          <div style={styles.board}>
            {STAGES.map(s => (
              <div key={s.key} style={styles.column}>
                <div style={styles.columnHeader}>
                  <div style={{ ...styles.columnDot, background: STAGE_COLORS[s.key] }} />
                  <span style={styles.columnTitle}>{s.label}</span>
                  <span style={styles.columnCount}>{grouped[s.key].length}</span>
                </div>
                <div style={styles.cardList}>
                  {grouped[s.key].length === 0 ? (
                    <div style={styles.emptyColumn}>No applications</div>
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

      {/* Application Modal */}
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

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column'
  },
  navbar: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 24px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 200,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  brandIcon: {
    width: '30px',
    height: '30px',
    background: '#6366f1',
    color: '#fff',
    borderRadius: '7px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '15px'
  },
  brandName: {
    fontWeight: '700',
    fontSize: '17px',
    color: '#0f172a'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  gmailConnected: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  connectedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981'
  },
  gmailEmail: {
    fontSize: '13px',
    color: '#374151'
  },
  syncBtn: {
    padding: '6px 14px',
    background: '#f1f5f9',
    border: '1px solid #d1d5db',
    borderRadius: '7px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#374151'
  },
  disconnectedLabel: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  addBtn: {
    padding: '7px 16px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  logoutBtn: {
    padding: '7px 14px',
    background: 'none',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer'
  },
  gmailBanner: {
    background: '#eff6ff',
    borderBottom: '1px solid #bfdbfe',
    padding: '12px 24px',
    fontSize: '14px',
    color: '#1d4ed8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  syncSuccess: {
    background: '#f0fdf4',
    borderBottom: '1px solid #bbf7d0',
    padding: '10px 24px',
    fontSize: '14px',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  syncError: {
    background: '#fef2f2',
    borderBottom: '1px solid #fecaca',
    padding: '10px 24px',
    fontSize: '14px',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  bannerClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: 'inherit',
    opacity: 0.6,
    padding: '0 4px'
  },
  connectBanner: {
    background: '#fff',
    border: '1px solid #e0e7ff',
    borderRadius: '12px',
    margin: '20px 24px 0',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(99,102,241,0.1)'
  },
  connectBannerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px'
  },
  connectBannerIcon: {
    fontSize: '24px'
  },
  connectBannerSub: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px'
  },
  connectBtn: {
    padding: '8px 18px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  main: {
    flex: 1,
    padding: '24px',
    overflow: 'hidden'
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '12px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px'
  },
  errorText: {
    color: '#dc2626',
    fontSize: '16px',
    fontWeight: '500'
  },
  retryBtn: {
    padding: '9px 20px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  emptyIcon: {
    fontSize: '48px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a'
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#64748b'
  },
  addBtnLarge: {
    marginTop: '8px',
    padding: '10px 24px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  board: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '16px',
    alignItems: 'flex-start'
  },
  column: {
    minWidth: '260px',
    flex: '0 0 260px',
    background: '#e8edf4',
    borderRadius: '12px',
    padding: '14px',
    maxHeight: 'calc(100vh - 180px)',
    display: 'flex',
    flexDirection: 'column'
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid #d1dce8'
  },
  columnDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  columnTitle: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b'
  },
  columnCount: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569'
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px'
  },
  emptyColumn: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '24px 0'
  }
}
