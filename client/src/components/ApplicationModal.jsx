import { useState } from 'react'
import { createApplication, updateApplication, deleteApplication, parseEmail } from '../lib/api.js'

const STAGES = [
  { value: 'applied', label: 'Applied' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' }
]

export default function ApplicationModal({ application, onClose, onSave, onDelete }) {
  const isEdit = !!application

  const [company, setCompany] = useState(application?.company || '')
  const [role, setRole] = useState(application?.role || '')
  const [stage, setStage] = useState(application?.stage || 'applied')
  const [dateApplied, setDateApplied] = useState(
    application?.date_applied ? application.date_applied.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [notes, setNotes] = useState(application?.notes || '')

  const [fieldErrors, setFieldErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const [emailText, setEmailText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseMessage, setParseMessage] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function validate() {
    const errs = {}
    if (!company.trim()) errs.company = 'Company is required.'
    if (!role.trim()) errs.role = 'Role is required.'
    return errs
  }

  async function handleExtract() {
    if (!emailText.trim()) return
    setParsing(true)
    setParseMessage('')
    try {
      const result = await parseEmail(emailText)
      if (result.confidence === 'high') {
        if (result.company) setCompany(result.company)
        if (result.role) setRole(result.role)
        if (result.stage) setStage(result.stage)
        setParseMessage('Fields pre-filled from email.')
      } else {
        setParseMessage('Could not extract details. Please fill in manually.')
      }
    } catch (err) {
      setParseMessage('Extraction failed. Please fill in manually.')
    } finally {
      setParsing(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaveError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setSaving(true)

    const payload = {
      company: company.trim(),
      role: role.trim(),
      stage,
      date_applied: dateApplied,
      notes: notes.trim()
    }

    try {
      let result
      if (isEdit) {
        result = await updateApplication(application.id, payload)
      } else {
        result = await createApplication(payload)
      }
      onSave(result.application)
    } catch (err) {
      setSaveError('Could not save application. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteApplication(application.id)
      onDelete(application.id)
    } catch (err) {
      setDeleteError('Could not delete application. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit application' : 'Add application'}>
        <div style={styles.header}>
          <h2 style={styles.title}>{isEdit ? 'Edit Application' : 'Add Application'}</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close modal">&#x2715;</button>
        </div>

        <form onSubmit={handleSave} noValidate>
          <div style={styles.body}>
            {saveError && (
              <div style={styles.errorBox} role="alert">{saveError}</div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Company <span style={styles.required}>*</span></label>
              <input
                type="text"
                name="company"
                data-testid="company-input"
                value={company}
                onChange={e => { setCompany(e.target.value); setFieldErrors(p => ({ ...p, company: undefined })) }}
                style={{ ...styles.input, ...(fieldErrors.company ? styles.inputError : {}) }}
                placeholder="e.g. Acme Corp"
                disabled={saving}
              />
              {fieldErrors.company && <span style={styles.fieldError}>{fieldErrors.company}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Role <span style={styles.required}>*</span></label>
              <input
                type="text"
                name="role"
                data-testid="role-input"
                value={role}
                onChange={e => { setRole(e.target.value); setFieldErrors(p => ({ ...p, role: undefined })) }}
                style={{ ...styles.input, ...(fieldErrors.role ? styles.inputError : {}) }}
                placeholder="e.g. Product Manager"
                disabled={saving}
              />
              {fieldErrors.role && <span style={styles.fieldError}>{fieldErrors.role}</span>}
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Stage</label>
                <select
                  name="stage"
                  data-testid="stage-select"
                  value={stage}
                  onChange={e => setStage(e.target.value)}
                  style={styles.select}
                  disabled={saving}
                >
                  {STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Date Applied</label>
                <input
                  type="date"
                  name="date_applied"
                  data-testid="date-applied-input"
                  value={dateApplied}
                  onChange={e => setDateApplied(e.target.value)}
                  style={styles.input}
                  disabled={saving}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Notes</label>
              <textarea
                name="notes"
                data-testid="notes-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={styles.textarea}
                placeholder="Optional — interview feedback, contact name, etc."
                rows={3}
                disabled={saving}
              />
            </div>

            {!isEdit && (
              <div style={styles.emailSection}>
                <p style={styles.emailSectionLabel}>Or paste email content to pre-fill</p>
                <textarea
                  data-testid="email-paste-input"
                  value={emailText}
                  onChange={e => setEmailText(e.target.value)}
                  style={styles.textarea}
                  placeholder="Paste the email text here..."
                  rows={4}
                  disabled={parsing || saving}
                />
                {parseMessage && (
                  <p style={styles.parseMessage}>{parseMessage}</p>
                )}
                <button
                  type="button"
                  data-testid="extract-button"
                  onClick={handleExtract}
                  disabled={parsing || !emailText.trim() || saving}
                  style={{ ...styles.secondaryBtn, ...(parsing || !emailText.trim() ? styles.btnDisabled : {}) }}
                >
                  {parsing ? 'Extracting...' : 'Extract'}
                </button>
              </div>
            )}
          </div>

          <div style={styles.footer}>
            {isEdit && (
              <div style={styles.deleteSection}>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    data-testid="delete-application-button"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={styles.deleteBtn}
                    disabled={saving || deleting}
                  >
                    Delete
                  </button>
                ) : (
                  <div style={styles.confirmDelete}>
                    <span style={styles.confirmText}>Are you sure you want to delete this application?</span>
                    <button
                      type="button"
                      data-testid="confirm-delete-button"
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ ...styles.deleteBtn, marginLeft: '8px' }}
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    {deleteError && <span style={styles.fieldError}>{deleteError}</span>}
                  </div>
                )}
              </div>
            )}

            <div style={styles.saveSection}>
              <button
                type="button"
                onClick={onClose}
                style={styles.cancelBtn}
                disabled={saving || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid={isEdit ? 'save-application' : 'add-application-button'}
                disabled={saving || deleting}
                style={{ ...styles.saveBtn, ...(saving ? styles.btnDisabled : {}) }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#64748b',
    lineHeight: 1,
    padding: '4px'
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  row: {
    display: 'flex',
    gap: '12px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  required: {
    color: '#ef4444'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    background: '#fff',
    width: '100%'
  },
  inputError: {
    borderColor: '#ef4444'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#fff',
    width: '100%',
    cursor: 'pointer'
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    background: '#fff',
    width: '100%'
  },
  fieldError: {
    fontSize: '13px',
    color: '#ef4444'
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '14px'
  },
  emailSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  emailSectionLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  parseMessage: {
    fontSize: '13px',
    color: '#6366f1'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  deleteSection: {
    flex: 1
  },
  saveSection: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  confirmDelete: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  confirmText: {
    fontSize: '13px',
    color: '#374151'
  },
  saveBtn: {
    padding: '9px 20px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelBtn: {
    padding: '9px 16px',
    background: 'none',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },
  deleteBtn: {
    padding: '9px 16px',
    background: 'none',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#ef4444',
    cursor: 'pointer'
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    background: '#f1f5f9',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  }
}
