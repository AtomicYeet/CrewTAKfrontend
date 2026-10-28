import {
  AccountCircle,
  Api,
  CalendarMonth,
  Circle,
  CloudQueue,
  Code,
  FamilyRestroom,
  Language,
  Notifications,
  Palette,
  Person,
  PrivacyTip,
  Security,
  Settings,
  Storage,
  ViewSidebar,
} from '@mui/icons-material'

import { HIDE } from '@/crewtak/features'

// Single source of truth for the settings sections: id, icon, and access
// gating (parentOnly = owner only, unless crewAdmin also lets crew admins in).
// Titles/descriptions live in locales/settings.json under
// `overview.sections.<id>`, keyed off the same ids.
export const SETTINGS_SECTIONS = [
  { id: 'bridge', icon: CloudQueue, parentOnly: true, isBeta: true },
  { id: 'profile', icon: Person },
  { id: 'circle', icon: Circle, parentOnly: true, crewAdmin: true },
  { id: 'account', icon: AccountCircle, parentOnly: true },
  // CrewTAK: crew admins (not just the owner) manage crew logins.
  { id: 'subaccounts', icon: FamilyRestroom, parentOnly: true, crewAdmin: true },
  { id: 'notifications', icon: Notifications },
  { id: 'mfa', icon: Security, parentOnly: true },
  { id: 'apitokens', icon: Api, parentOnly: true },
  { id: 'calendar', icon: CalendarMonth },
  { id: 'storage', icon: Storage },
  // Default landing view, plus whichever chrome this device actually has:
  // the bottom bar on mobile, the sidepanel on desktop.
  { id: 'layout', icon: ViewSidebar },
  { id: 'theme', icon: Palette },
  { id: 'localization', icon: Language, isBeta: true },
  { id: 'advanced', icon: Settings },
  { id: 'privacy', icon: PrivacyTip },
  { id: 'developer', icon: Code },
].filter(
  ({ id }) =>
    // CrewTAK: notifications and the push-notification bridge are hidden.
    !(HIDE.notifications && (id === 'notifications' || id === 'bridge')),
)
