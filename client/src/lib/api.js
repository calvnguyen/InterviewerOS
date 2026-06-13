import { supabase } from './supabase.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

async function request(method, path, body) {
  const token = await getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options = { method, headers }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, options)

  if (response.status === 204) {
    return null
  }

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    error.code = data.error
    throw error
  }

  return data
}

export async function getApplications() {
  return request('GET', '/applications')
}

export async function getApplication(id) {
  return request('GET', `/applications/${id}`)
}

export async function createApplication(data) {
  return request('POST', '/applications', data)
}

export async function updateApplication(id, data) {
  return request('PUT', `/applications/${id}`, data)
}

export async function deleteApplication(id) {
  return request('DELETE', `/applications/${id}`)
}

export async function parseEmail(emailText) {
  return request('POST', '/applications/parse-email', { email_text: emailText })
}

export async function getLastSynced() {
  return request('GET', '/gmail/last-synced')
}

export async function syncGmail(googleToken) {
  return request('POST', '/gmail/sync', { google_token: googleToken })
}

export async function getApplicationActivity(id) {
  return request('GET', `/applications/${id}/activity`)
}

export async function getResumes() {
  return request('GET', '/resumes')
}

export async function createResume(data) {
  return request('POST', '/resumes', data)
}

export async function deleteResume(id) {
  return request('DELETE', `/resumes/${id}`)
}

export async function getInterviewPrep(applicationId) {
  return request('GET', `/applications/${applicationId}/prep`)
}

export async function upsertInterviewPrep(applicationId, data) {
  return request('PUT', `/applications/${applicationId}/prep`, data)
}
