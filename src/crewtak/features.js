// CrewTAK customisations.
//
// Every Donetick feature CrewTAK doesn't use is switched off here. Hidden
// features stay in the code (so upstream updates merge cleanly) but leave no
// trace in the UI: no menu items, settings, form fields or empty headings.
// Flip a flag to false to bring a feature back.

export const HIDE = {
  priority: true,
  labels: true,
  attachments: true,
  points: true, // points, rewards, redeeming
  approval: true, // "require admin approval"
  things: true, // Things and thing-state triggers
  notifications: true,
  privacy: true, // public/limited task visibility
  schedulingPrefs: true, // reschedule from due vs completion date
  adaptiveRepeat: true,
  yearlyRepeat: true,
  upstreamFeedback: true, // feedback/bug-report forms that go to donetick.com
  legal: true, // privacy policy / terms links and policy-update notices
  activities: true, // Activities page (the completion log replaces it)
  nfc: true, // "Write to NFC tag" task action
  nudge: true, // "Send nudge" task action
}

// Routes that belong to hidden features. Visiting one redirects home.
export const HIDDEN_ROUTE_PREFIXES = [
  ...(HIDE.things ? ['/things'] : []),
  ...(HIDE.labels ? ['/labels'] : []),
  ...(HIDE.points ? ['/points', '/rewards'] : []),
  ...(HIDE.notifications
    ? ['/settings/notifications', '/settings/bridge']
    : []),
  ...(HIDE.legal ? ['/privacy', '/terms'] : []),
  ...(HIDE.activities ? ['/activities'] : []),
]

export const isHiddenRoute = path =>
  HIDDEN_ROUTE_PREFIXES.some(p => path === p || path.startsWith(p + '/'))

// Repeat types removed from the frequency picker.
export const HIDDEN_FREQUENCY_TYPES = [
  ...(HIDE.adaptiveRepeat ? ['adaptive'] : []),
  ...(HIDE.yearlyRepeat ? ['yearly'] : []),
]
