import type { SpotifyUser } from './types'

export const API_BASE = '/api/v1'

/** A non-2xx response from the backend, carrying its status and `detail` message. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Same-origin through the Vite proxy (and the production rewrite), so the session cookie is sent
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    ...init,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      if (typeof body?.detail === 'string') detail = body.detail
    } catch {
      // error body wasn't JSON; keep the status text
    }
    throw new ApiError(response.status, detail)
  }

  return response.json() as Promise<T>
}

export const api = {
  me: () => request<SpotifyUser>('/spotify/me'),
  logout: () => request<{ logged_out: boolean }>('/auth/logout', { method: 'POST' }),
}
