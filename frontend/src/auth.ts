import { API_BASE } from './api/client'

export const LOGIN_URL = `${API_BASE}/auth/login`

// Codes the backend sends back as /?login_error=<code> (see backend/routers/auth.py),
// plus not_invited, which the app sets when Spotify answers 403 for a non-allowlisted account
const LOGIN_ERRORS: Record<string, string> = {
  access_denied: 'Spotify login was cancelled. You can try again, or explore the demo instead.',
  invalid_state: 'That login link expired. Please connect Spotify again.',
  missing_code: "Spotify didn't finish the login. Please try again.",
  token_exchange_failed: "Spotify couldn't complete the login. Please try again in a moment.",
  not_invited: "This Spotify account isn't on the invite list yet. The demo universe shows the full experience.",
}

export function loginErrorMessage(code: string | null): string | null {
  if (!code) return null
  return LOGIN_ERRORS[code] ?? LOGIN_ERRORS.token_exchange_failed
}

/** Login is a redirect chain through Spotify, so it's a full-page navigation, not a fetch. */
export function startLogin() {
  window.location.assign(LOGIN_URL)
}
