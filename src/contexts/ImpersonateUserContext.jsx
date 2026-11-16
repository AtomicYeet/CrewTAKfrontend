import { createContext, useContext, useEffect } from 'react'

// CrewTAK: "Impersonate another user" was removed (15 Nov 2026) and the
// backend no longer honours the X-Impersonate-User-ID header.
//
// The task screens still read `impersonatedUser` in many places, where null
// already means "act as yourself". Rather than rewrite all of them, this
// context now always reports that nobody is being impersonated.

const noop = () => {}

const NOT_IMPERSONATING = Object.freeze({
  isImpersonating: false,
  impersonatedUser: null,
  originalUser: null,
  startImpersonation: noop,
  stopImpersonation: noop,
  setImpersonatedUser: noop,
  getEffectiveUser: currentUser => currentUser,
  getImpersonationHeaders: () => ({}),
  canImpersonate: () => false,
})

const ImpersonateUserContext = createContext(NOT_IMPERSONATING)

export const useImpersonateUser = () => useContext(ImpersonateUserContext)

export const ImpersonateUserProvider = ({ children }) => {
  // Clear anything left behind by an impersonation session from before the
  // feature was removed, so a browser can't stay stuck "acting as" someone.
  useEffect(() => {
    try {
      localStorage.removeItem('impersonation')
      localStorage.removeItem('impersonatedUserId')
    } catch {
      // storage unavailable; nothing to clear
    }
  }, [])

  return (
    <ImpersonateUserContext.Provider value={NOT_IMPERSONATING}>
      {children}
    </ImpersonateUserContext.Provider>
  )
}
