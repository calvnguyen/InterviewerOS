import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import CompanyAvatar from './CompanyAvatar'
import { Button } from '@/components/ui/button'
import {
  getApplicationActivity,
  getResumes,
  createResume,
  getInterviewPrep,
  upsertInterviewPrep,
  updateApplication,
} from '../lib/api.js'

const STAGE_LABELS = {
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

const STAGE_DOT_CLASSES = {
  applied: 'bg-indigo-500',
  phone_screen: 'bg-amber-500',
  interview: 'bg-blue-500',
  offer: 'bg-green-500',
  rejected: 'bg-red-500',
}

const NEXT_ACTION_BANNER = {
  'Follow up': 'bg-amber-50 border-amber-200 text-amber-800',
  'Awaiting response': 'bg-indigo-50 border-indigo-200 text-indigo-800',
  'Prepare for call': 'bg-blue-50 border-blue-200 text-blue-800',
  'Prepare for interview': 'bg-blue-50 border-blue-200 text-blue-800',
  'Respond to offer': 'bg-green-50 border-green-200 text-green-800',
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDomainFromEmail(email) {
  if (!email) return null
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return match ? match[1] : null
}

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function labelFor(entry) {
  switch (entry.action) {
    case 'created':
      return 'Application added'
    case 'stage_changed':
      return `Moved to ${(entry.metadata?.to_stage || '').replace('_', ' ')}`
    case 'notes_updated':
      return 'Notes updated'
    case 'gmail_imported':
      return 'Imported from Gmail'
    case 'updated':
      return 'Application updated'
    default:
      return entry.action
  }
}

export default function ApplicationDrawer({ app, onClose, onEdit, onDelete, onStageChange }) {
  const isOpen = !!app
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Resume state
  const [resumes, setResumes] = useState([])
  const [selectedResumeId, setSelectedResumeId] = useState(app?.resume_id || null)

  // Interview prep state
  const [prep, setPrep] = useState(null)
  const [prepLoading, setPrepLoading] = useState(false)

  useEffect(() => {
    if (!app) return
    setActivityLoading(true)
    getApplicationActivity(app.id)
      .then(data => setActivity(data.activity || []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false))
  }, [app?.id])

  // Sync selectedResumeId when the app changes
  useEffect(() => {
    setSelectedResumeId(app?.resume_id || null)
  }, [app?.id, app?.resume_id])

  // Fetch resumes on mount
  useEffect(() => {
    getResumes().then(d => setResumes(d.resumes || [])).catch(() => {})
  }, [])

  // Fetch prep when app is in interview/offer stage
  useEffect(() => {
    if (!app || !['interview', 'offer'].includes(app.stage)) {
      setPrep(null)
      return
    }
    setPrepLoading(true)
    getInterviewPrep(app.id)
      .then(d => setPrep(d.prep || { notes: '', checklist: [] }))
      .catch(() => setPrep({ notes: '', checklist: [] }))
      .finally(() => setPrepLoading(false))
  }, [app?.id, app?.stage])

  function savePrepNotes(notes) {
    const updated = { ...(prep || {}), notes }
    setPrep(updated)
    upsertInterviewPrep(app.id, updated)
  }

  function toggleChecklistItem(itemId) {
    const updated = {
      ...(prep || {}),
      checklist: (prep?.checklist || []).map(i =>
        i.id === itemId ? { ...i, done: !i.done } : i
      ),
    }
    setPrep(updated)
    upsertInterviewPrep(app.id, updated)
  }

  function addChecklistItem() {
    const text = window.prompt('Add checklist item:')
    if (!text?.trim()) return
    const item = { id: crypto.randomUUID(), text: text.trim(), done: false }
    const updated = { ...(prep || {}), checklist: [...(prep?.checklist || []), item] }
    setPrep(updated)
    upsertInterviewPrep(app.id, updated)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-xl flex flex-col transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {app && (
          <>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-3 pr-8">
                <CompanyAvatar
                  company={app.company}
                  domain={getDomainFromEmail(app.email_from)}
                  size="lg"
                />
                <div className="flex flex-col min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 leading-tight truncate">{app.company}</h2>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{app.role}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT_CLASSES[app.stage] || 'bg-slate-400'}`} />
                    <span className="text-xs font-medium text-slate-600">
                      {STAGE_LABELS[app.stage] || app.stage}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next action banner */}
            {app.next_action && (
              <div
                className={`mx-5 mt-4 px-3.5 py-2.5 rounded-lg border text-sm font-medium ${
                  NEXT_ACTION_BANNER[app.next_action] || 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Next: {app.next_action}
              </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Details */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Details</h3>
                <div className="flex flex-col gap-1.5">
                  {app.date_applied && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="text-slate-400 w-24 shrink-0">Applied</span>
                      <span>{formatDate(app.date_applied)}</span>
                    </div>
                  )}
                  {app.stale && (
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      No update in 7+ days
                    </div>
                  )}
                </div>
              </section>

              {/* Notes */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</h3>
                {app.notes ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{app.notes}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No notes yet</p>
                )}
              </section>

              {/* Resume Used */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resume Used</h3>
                <select
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
                  value={selectedResumeId || ''}
                  onChange={e => {
                    setSelectedResumeId(e.target.value || null)
                    updateApplication(app.id, { resume_id: e.target.value || null })
                  }}
                >
                  <option value="">No resume selected</option>
                  {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button
                  className="mt-1 text-xs text-indigo-600 hover:text-indigo-800"
                  onClick={() => {
                    const name = window.prompt('Resume name (e.g. "Software Engineer Resume v2"):')
                    if (!name?.trim()) return
                    createResume({ name: name.trim() }).then(d => setResumes(prev => [d.resume, ...prev]))
                  }}
                >
                  + Add resume
                </button>
              </section>

              {/* Interview Prep — only shown when stage is interview or offer */}
              {['interview', 'offer'].includes(app.stage) && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Interview Prep</h3>
                  {prepLoading ? (
                    <p className="text-sm text-slate-400 italic">Loading...</p>
                  ) : (
                    <>
                      <textarea
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none text-slate-700 placeholder:text-slate-400"
                        rows={3}
                        placeholder="Notes, questions to ask, things to research..."
                        value={prep?.notes || ''}
                        onChange={e => savePrepNotes(e.target.value)}
                      />
                      <div className="mt-2 space-y-1.5">
                        {(prep?.checklist || []).map(item => (
                          <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => toggleChecklistItem(item.id)}
                              className="rounded"
                            />
                            <span className={item.done ? 'line-through text-slate-400' : 'text-slate-700'}>
                              {item.text}
                            </span>
                          </label>
                        ))}
                        <button
                          className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                          onClick={addChecklistItem}
                        >
                          + Add item
                        </button>
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* Email */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</h3>
                {app.email_subject || app.email_snippet ? (
                  <div className="bg-slate-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 border border-slate-100 space-y-2">
                    {app.email_subject && (
                      <div>
                        <span className="text-slate-400 text-xs block mb-0.5">Subject</span>
                        <span>{app.email_subject}</span>
                      </div>
                    )}
                    {app.email_snippet && (
                      <div>
                        <span className="text-slate-400 text-xs block mb-0.5">Preview</span>
                        <span className="text-slate-600 leading-relaxed">{app.email_snippet}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No email preview available</p>
                )}
              </section>

              {/* Activity */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Activity</h3>
                <div className="space-y-2">
                  {activity.map(entry => (
                    <div key={entry.id} className="flex gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                      <div>
                        <span className="text-slate-700">{labelFor(entry)}</span>
                        <span className="text-slate-400 ml-2 text-xs">{relativeTime(entry.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && !activityLoading && (
                    <p className="text-xs text-slate-400">No activity yet</p>
                  )}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(app)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onDelete(app.id)}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
