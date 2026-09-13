// Centralized & auto-normalizing API URL for production and local dev
const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const cleanUrl = rawUrl.trim().replace(/\/+$/, '')

export const API = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
export const apiBase = API.replace(/\/api$/, '')
