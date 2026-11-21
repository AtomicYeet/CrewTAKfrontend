// CrewTAK: optional email on each crew login (Settings → Crew Users).
// Used later for notifications and password resets. Not required; the server
// lowercases it and keeps it unique across accounts.

export const normalizeCrewEmail = value => (value || '').trim().toLowerCase()

// Empty is fine (email is optional). Otherwise a single plain address.
export const isValidCrewEmail = value => {
  const email = normalizeCrewEmail(value)
  if (!email) return true
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const CREW_EMAIL_HINT =
  'Optional. Used for notifications and password resets later.'
