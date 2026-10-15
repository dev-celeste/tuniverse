// Remembers (per tab) that this visitor had a working session, so a later 401 can be
// explained as "your session ended" instead of silently dropping them on the start screen.
const SIGNED_IN_KEY = 'tuniverse:signed-in'

export function markSignedIn() {
  try {
    sessionStorage.setItem(SIGNED_IN_KEY, '1')
  } catch {
    // storage blocked (private mode etc.): we just lose the "session ended" message
  }
}

export function clearSignedIn() {
  try {
    sessionStorage.removeItem(SIGNED_IN_KEY)
  } catch {
    // see markSignedIn
  }
}

export function wasSignedIn(): boolean {
  try {
    return sessionStorage.getItem(SIGNED_IN_KEY) === '1'
  } catch {
    return false
  }
}
