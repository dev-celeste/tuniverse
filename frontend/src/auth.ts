import { API_BASE } from './api/client'

export const LOGIN_URL = `${API_BASE}/auth/login`

// Codes the backend sends back as /?login_error=<code> (see backend/routers/auth.py), plus two
// the app sets itself: not_invited (Spotify answers 403 for a non-allowlisted account) and
// session_expired (a signed-in visitor's session stopped working)
const LOGIN_ERRORS: Record<string, string> = {
  access_denied: 'Spotify login was cancelled. You can try again, or explore the demo instead.',
  invalid_state: 'That login link expired. Please connect Spotify again.',
  session_expired: 'Your session ended. Connect Spotify again to pick up where you left off.',
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
