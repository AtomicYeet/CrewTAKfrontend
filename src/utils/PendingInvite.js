import Cookies from 'js-cookie'

// CrewTAK: crew codes and "join a crew" were removed (15 Nov 2026). Crew
// admins add every login from Settings → Crew Users, so there is no invite to
// carry through sign-in any more. These helpers stay so the login, signup and
// app-link code that calls them keeps working, but they never hold an invite.

const INVITE_KEY = 'pending_circle_invite'
const REDIRECT_COOKIE = 'ca_redirect'

export const joinCirclePath = () => '/'

export const setPendingInvite = () => {}

export const clearPendingInvite = () => {
  try {
    localStorage.removeItem(INVITE_KEY)
  } catch {
    // Ignore unavailable storage during cleanup.
  }

  const redirect = Cookies.get(REDIRECT_COOKIE)
  if (redirect?.startsWith('/circle/join')) {
    Cookies.remove(REDIRECT_COOKIE)
  }
}

export const getPendingInvite = () => {
  // Drop anything saved before invites were removed.
  clearPendingInvite()
  return null
}
