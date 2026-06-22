import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const subjectApi = {
  getAll: () => api.get('/subjects').then(r => r.data),
  create: (data) => api.post('/subjects', data).then(r => r.data),
  update: (id, data) => api.put(`/subjects/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/subjects/${id}`),
}

export const cycleApi = {
  get: () => api.get('/cycle').then(r => r.data),
}

export const sessionApi = {
  start: (subjectId) => api.post('/sessions/start', { subjectId }).then(r => r.data),
  stop: (id, data) => api.post(`/sessions/${id}/stop`, data).then(r => r.data),
  create: (data) => api.post('/sessions', data).then(r => r.data),
  getHistory: (params) => api.get('/sessions', { params }).then(r => r.data),
  update: (id, data) => api.put(`/sessions/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/sessions/${id}`),
}

export const revisionApi = {
  getToday: () => api.get('/revisions/today').then(r => r.data),
  getPending: () => api.get('/revisions/pending').then(r => r.data),
  complete: (id) => api.post(`/revisions/${id}/complete`).then(r => r.data),
}

export const dashboardApi = {
  get: () => api.get('/dashboard').then(r => r.data),
}

export const topicApi = {
  getBySubject: (subjectId) => api.get(`/subjects/${subjectId}/topics`).then(r => r.data),
  create: (subjectId, data) => api.post(`/subjects/${subjectId}/topics`, data).then(r => r.data),
  update: (id, data) => api.put(`/topics/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/topics/${id}`),
}

export const statsApi = {
  getWeekly:       () => api.get('/stats/weekly').then(r => r.data),
  getSubjects:     () => api.get('/stats/subjects').then(r => r.data),
  getCalendar:     () => api.get('/stats/calendar').then(r => r.data),
  getAccuracy:     () => api.get('/stats/accuracy').then(r => r.data),
  getSummary:      () => api.get('/stats/summary').then(r => r.data),
  getAccuracyTrend: () => api.get('/stats/accuracy-trend').then(r => r.data),
}

export const simulationApi = {
  getAll: () => api.get('/simulations').then(r => r.data),
  create: (data) => api.post('/simulations', data).then(r => r.data),
  delete: (id) => api.delete(`/simulations/${id}`),
  addResult: (id, data) => api.post(`/simulations/${id}/results`, data).then(r => r.data),
  getResults: (id) => api.get(`/simulations/${id}/results`).then(r => r.data),
  getComparison: () => api.get('/simulations/comparison').then(r => r.data),
}

export const noteApi = {
  getAll:      (params) => api.get('/notes', { params }).then(r => r.data),
  create:      (data) => api.post('/notes', data).then(r => r.data),
  update:      (id, data) => api.put(`/notes/${id}`, data).then(r => r.data),
  delete:      (id) => api.delete(`/notes/${id}`),
}

export const questionApi = {
  getAll:    (params) => api.get('/questions', { params }).then(r => r.data),
  create:    (data) => api.post('/questions', data).then(r => r.data),
  update:    (id, data) => api.put(`/questions/${id}`, data).then(r => r.data),
  delete:    (id) => api.delete(`/questions/${id}`),
  practice:  (params) => api.get('/questions/practice', { params }).then(r => r.data),
}

export const reportApi = {
  downloadWeekly: () => api.get('/reports/weekly', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
    const a = document.createElement('a'); a.href = url; a.download = 'relatorio-semanal.pdf'
    document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
  }),
}

export const weeklyPlanApi = {
  getAll:      () => api.get('/weekly-plan').then(r => r.data),
  create:      (data) => api.post('/weekly-plan', data).then(r => r.data),
  update:      (id, data) => api.put(`/weekly-plan/${id}`, data).then(r => r.data),
  delete:      (id) => api.delete(`/weekly-plan/${id}`),
  getProgress: () => api.get('/weekly-plan/progress').then(r => r.data),
}

export const preferencesApi = {
  get: () => api.get('/preferences').then(r => r.data),
  update: (data) => api.put('/preferences', data).then(r => r.data),
}

export const userApi = {
  updateProfile: (data) => api.put('/auth/me', data).then(r => r.data),
}

export const authApi = {
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }).then(r => r.data),
}

export const examPlanApi = {
  listAvailable: () => api.get('/exam-plans/available').then(r => r.data),
  getAll: () => api.get('/exam-plans').then(r => r.data),
  import: (slug) => api.post(`/exam-plans/${slug}/import`).then(r => r.data),
  getSubjects: (id) => api.get(`/exam-plans/${id}/subjects`).then(r => r.data),
  getProgress: (id) => api.get(`/exam-plans/${id}/progress`).then(r => r.data),
  createCustom: (name) => api.post('/exam-plans/custom', { name }).then(r => r.data),
  createSubject: (planId, data) => api.post(`/exam-plans/${planId}/subjects`, data).then(r => r.data),
  renamePlan: (id, name) => api.put(`/exam-plans/${id}/name`, { name }).then(r => r.data),
  deletePlan: (id) => api.delete(`/exam-plans/${id}`),
  deleteSubject: (id) => api.delete(`/subjects/${id}`),
  updateSubject: (id, data) => api.put(`/subjects/${id}`, data).then(r => r.data),
  bulkImport: (data) => api.post('/exam-plans/bulk-import', data).then(r => r.data),
}

export const editalParserApi = {
  parse: (text) => api.post('/edital-parser', { text }).then(r => r.data),
  getUsage: () => api.get('/edital-parser/usage').then(r => r.data),
}

export default api
