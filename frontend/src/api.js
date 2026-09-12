const FALLBACK_BASE_URL = 'https://localhost:7045'
const API_BASE_STORAGE_KEY = 'whitecode-api-base-url'
const ACCESS_TOKEN_STORAGE_KEY = 'whitecode-access-token'
const STUDENT_ID_STORAGE_KEY = 'whitecode-student-id'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const getStoredBaseUrl = () => localStorage.getItem(API_BASE_STORAGE_KEY)
  || import.meta.env.VITE_API_BASE_URL
  || FALLBACK_BASE_URL

const createRequestId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

// A bare SQL wildcard yields the complete first page on the current API.  The `%all%`
// cache bucket contains an older empty response in the running development instance,
// so using `%` keeps public discovery and every picker useful while preserving normal
// typed-name searches.
const withAllSearch = (query = {}) => ({
  ...query,
  wordForSearch: !query.wordForSearch || query.wordForSearch === 'all'
    ? '%'
    : query.wordForSearch,
})

const readError = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (payload && typeof payload === 'object') {
    const validation = payload.errors && Object.values(payload.errors).flat().join(' ')
    return {
      payload,
      message: validation || payload.message || payload.title || payload.error || `تعذر إكمال الطلب (${response.status})`,
    }
  }

  return { payload, message: payload || `تعذر إكمال الطلب (${response.status})` }
}

export class WhiteCodeApi {
  constructor({ onSessionChange } = {}) {
    this.baseUrl = getStoredBaseUrl().replace(/\/$/, '')
    this.onSessionChange = onSessionChange
    this.locale = 'ar'
  }

  setLocale(locale) { this.locale = locale === 'en' ? 'en' : 'ar' }

  configureBaseUrl(url) {
    const cleaned = url.trim().replace(/\/$/, '')
    if (!/^https?:\/\//i.test(cleaned)) {
      throw new ApiError('اكتب رابط الـ API كاملًا، مثل https://localhost:7045.', 0)
    }
    this.baseUrl = cleaned
    localStorage.setItem(API_BASE_STORAGE_KEY, cleaned)
  }

  get token() {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  }

  setToken(token) {
    if (token) localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    this.onSessionChange?.(token || null)
  }

  get studentId() {
    return localStorage.getItem(STUDENT_ID_STORAGE_KEY)
  }

  setStudentId(id) {
    if (id) localStorage.setItem(STUDENT_ID_STORAGE_KEY, id)
  }

  asset(path) {
    if (!path) return ''
    return /^https?:\/\//i.test(path) ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
  }

  media(path) {
    if (!path) return ''
    // ASP.NET's static-file security policy uses Cross-Origin-Resource-Policy: same-site.
    // In development Vite serves this path through its same-origin proxy, which keeps videos
    // playable while the API remains on https://localhost:7045.
    if (import.meta.env.DEV && !/^https?:\/\//i.test(path)) return `/media/${path.replace(/^\//, '')}`
    return this.asset(path)
  }

  async mediaExists(path) {
    try {
      const response = await fetch(this.media(path), { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  async request(path, options = {}, retried = false) {
    const {
      method = 'GET', body, formData, auth = true, idempotent = false, headers = {}, signal,
    } = options
    const requestHeaders = new Headers({ 'Accept-Language': this.locale, Accept: 'application/json', ...headers })
    const token = this.token
    if (auth && token) requestHeaders.set('Authorization', `Bearer ${token}`)
    if (idempotent) requestHeaders.set('Idempotency-Key', options.idempotencyKey || createRequestId())
    if (body !== undefined && !formData) requestHeaders.set('Content-Type', 'application/json')

    let response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: formData || (body === undefined ? undefined : JSON.stringify(body)),
        credentials: 'include',
        signal,
      })
    } catch (error) {
      throw new ApiError(`تعذر الوصول إلى الـ API. تأكد من الرابط ومن إضافته إلى CORS. ${error.message}`, 0)
    }

    if (response.status === 401 && auth && !retried && !path.startsWith('/api/authentication/')) {
      try {
        const refreshed = await this.request('/api/authentication/refresh', { method: 'POST', auth: false })
        if (refreshed?.accessToken) {
          this.setToken(refreshed.accessToken)
          return this.request(path, options, true)
        }
      } catch {
        // The original 401 below is more useful to the interface.
      }
      this.setToken(null)
    }

    if (!response.ok) {
      const failure = await readError(response)
      throw new ApiError(failure.message, response.status, failure.payload)
    }
    if (response.status === 204) return null
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }

  login(data) { return this.request('/api/authentication/login', { method: 'POST', body: data, auth: false }) }
  register(data) { return this.request('/api/authentication/register', { method: 'POST', body: data, auth: false }) }
  refresh() { return this.request('/api/authentication/refresh', { method: 'POST', auth: false }) }
  logout() { return this.request('/api/authentication/logout', { method: 'POST' }) }
  logoutAll() { return this.request('/api/authentication/logout-all', { method: 'POST' }) }
  resendConfirmation(email) { return this.request('/api/emailverification/resend-email-confirmation', { method: 'POST', body: { email }, auth: false }) }
  confirmEmail(userId, token) { return this.request(`/api/emailverification/confirm-email?${new URLSearchParams({ userId, token })}`, { auth: false }) }
  requestPasswordReset(email) { return this.request('/api/password/reset-password', { method: 'POST', body: { email }, auth: false }) }
  resendPasswordReset(email) { return this.request('/api/password/resend-reset-password', { method: 'POST', body: { email }, auth: false }) }

  // The backend currently exposes this as GET while requiring [FromBody]. Browsers cannot attach
  // a body to a GET request. Query values are sent so a backend corrected to [FromQuery] works
  // without any frontend change; see the in-app note on the reset screen.
  confirmPasswordReset({ userId, token, newPassword, confirmPassword }) {
    const query = new URLSearchParams({ userId, token, newPassword, confirmPassword })
    return this.request(`/api/password/confirm-reset-password?${query}`, { method: 'GET', auth: false })
  }

  getLiveness() { return this.request('/health/live', { auth: false }) }

  getCourses(query = {}) { return this.request(`/api/course?${new URLSearchParams(withAllSearch(query))}`, { auth: false }) }
  getCourse(id) { return this.request(`/api/course/${id}`) }
  createCourse(data) { return this.request('/api/course', { method: 'POST', body: data, idempotent: true }) }
  updateCourse(id, data) { return this.request(`/api/course/${id}`, { method: 'PUT', body: data, idempotent: true }) }
  deleteCourse(id) { return this.request(`/api/course/${id}`, { method: 'DELETE', idempotent: true }) }

  getDepartments(query = {}) {
    return this.request(`/api/department?${new URLSearchParams(withAllSearch(query))}`, { auth: false })
  }
  getDepartment(id) { return this.request(`/api/department/${id}`, { auth: false }) }
  createDepartment(formData) { return this.request('/api/department', { method: 'POST', formData, idempotent: true }) }
  updateDepartment(id, formData) { return this.request(`/api/department/${id}`, { method: 'PUT', formData, idempotent: true }) }
  deleteDepartment(id) { return this.request(`/api/department/${id}`, { method: 'DELETE', idempotent: true }) }

  getInstructors(query = {}) { return this.request(`/api/instructor?${new URLSearchParams(withAllSearch(query))}`) }
  getInstructor(id) { return this.request(`/api/instructor/${id}`) }
  assignInstructor(data) { return this.request('/api/instructor', { method: 'POST', body: data, idempotent: true }) }
  updateInstructor(id, data) { return this.request(`/api/instructor/${id}`, { method: 'PUT', body: data, idempotent: true }) }
  deleteInstructor(id) { return this.request(`/api/instructor/${id}`, { method: 'DELETE', idempotent: true }) }

  async getUsers(query = {}) {
    const result = await this.request(`/api/user?${new URLSearchParams(withAllSearch(query))}`)
    return result?.value || []
  }

  getSections(courseId) { return this.request(`/api/section/by-course/${courseId}`) }
  createSection(formData) { return this.request('/api/section', { method: 'POST', formData, idempotent: true }) }
  updateSection(id, formData) { return this.request(`/api/section/${id}`, { method: 'PUT', formData, idempotent: true }) }
  deleteSection(id) { return this.request(`/api/section/${id}`, { method: 'DELETE', idempotent: true }) }

  getEnrollmentsByCourse(courseId) { return this.request(`/api/enrollment/by-course/${courseId}`) }
  getEnrollmentsByStudent(studentId) { return this.request(`/api/enrollment/by-student/${studentId}`) }
  enroll(courseId) {
    // The action route requires the path parameter, while the controller binds FromQuery.
    // Sending both is compatible with the current backend implementation.
    return this.request(`/api/enrollment/${courseId}?courseId=${courseId}`, { method: 'POST', idempotent: true })
  }
  unenroll(studentId, courseId) {
    return this.request(`/api/enrollment?${new URLSearchParams({ studentId, courseId })}`, { method: 'DELETE', idempotent: true })
  }

  assignStudent() { return this.request('/api/student', { method: 'POST', idempotent: true }) }
  async getCurrentStudent() {
    const result = await this.request('/api/student/me')
    return result?.value || result
  }
  async getStudents(query = {}) {
    const result = await this.request(`/api/student?${new URLSearchParams(withAllSearch(query))}`)
    return result?.value || []
  }
  deleteStudent(id) { return this.request(`/api/student/${id}`, { method: 'DELETE', idempotent: true }) }

  getProfile() { return this.request('/api/profile') }
  updateProfile(formData) { return this.request('/api/profile', { method: 'PATCH', formData, idempotent: true }) }
}

export const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(atob(payload).split('').map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')))
  } catch {
    return {}
  }
}

export const getRoles = (token) => {
  const payload = decodeJwt(token)
  const rawRoles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || payload.roles || []
  return Array.isArray(rawRoles) ? rawRoles : [rawRoles]
}
