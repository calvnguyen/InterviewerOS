import { useState } from 'react'
import { createApplication, updateApplication, deleteApplication, parseEmail } from '../lib/api.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

const STAGES = [
  { value: 'applied', label: 'Applied' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
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
    } catch {
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
      notes: notes.trim(),
    }

    try {
      let result
      if (isEdit) {
        result = await updateApplication(application.id, payload)
      } else {
        result = await createApplication(payload)
      }
      onSave(result.application)
    } catch {
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
    } catch {
      setDeleteError('Could not delete application. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="max-w-[560px] max-h-[90vh] overflow-y-auto"
        aria-label={isEdit ? 'Edit application' : 'Add application'}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Application' : 'Add Application'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} noValidate>
          <div className="flex flex-col gap-4">
            {saveError && (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company">
                Company <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company"
                name="company"
                data-testid="company-input"
                value={company}
                onChange={e => { setCompany(e.target.value); setFieldErrors(p => ({ ...p, company: undefined })) }}
                className={fieldErrors.company ? 'border-destructive' : ''}
                placeholder="e.g. Acme Corp"
                disabled={saving}
              />
              {fieldErrors.company && (
                <span className="text-xs text-destructive">{fieldErrors.company}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role"
                name="role"
                data-testid="role-input"
                value={role}
                onChange={e => { setRole(e.target.value); setFieldErrors(p => ({ ...p, role: undefined })) }}
                className={fieldErrors.role ? 'border-destructive' : ''}
                placeholder="e.g. Product Manager"
                disabled={saving}
              />
              {fieldErrors.role && (
                <span className="text-xs text-destructive">{fieldErrors.role}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stage">Stage</Label>
                <Select value={stage} onValueChange={setStage} disabled={saving}>
                  <SelectTrigger id="stage" data-testid="stage-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date_applied">Date Applied</Label>
                <Input
                  id="date_applied"
                  type="date"
                  name="date_applied"
                  data-testid="date-applied-input"
                  value={dateApplied}
                  onChange={e => setDateApplied(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                data-testid="notes-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional — interview feedback, contact name, etc."
                rows={3}
                disabled={saving}
              />
            </div>

            {!isEdit && (
              <div className="border-t border-border pt-4 flex flex-col gap-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Or paste email content to pre-fill
                </p>
                <Textarea
                  data-testid="email-paste-input"
                  value={emailText}
                  onChange={e => setEmailText(e.target.value)}
                  placeholder="Paste the email text here..."
                  rows={4}
                  disabled={parsing || saving}
                />
                {parseMessage && (
                  <p className="text-xs text-primary">{parseMessage}</p>
                )}
                <Button
                  type="button"
                  data-testid="extract-button"
                  onClick={handleExtract}
                  disabled={parsing || !emailText.trim() || saving}
                  variant="secondary"
                  size="sm"
                  className="self-start"
                >
                  {parsing ? 'Extracting...' : 'Extract'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
            {isEdit && (
              <div className="flex-1">
                {!showDeleteConfirm ? (
                  <Button
                    type="button"
                    data-testid="delete-application-button"
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    size="sm"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={saving || deleting}
                  >
                    Delete
                  </Button>
                ) : (
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Are you sure?</span>
                    <Button
                      type="button"
                      data-testid="confirm-delete-button"
                      onClick={handleDelete}
                      disabled={deleting}
                      variant="destructive"
                      size="sm"
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    {deleteError && (
                      <span className="text-xs text-destructive">{deleteError}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={saving || deleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid={isEdit ? 'save-application' : 'add-application-button'}
                disabled={saving || deleting}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
