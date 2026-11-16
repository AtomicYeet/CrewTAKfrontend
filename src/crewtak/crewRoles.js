// CrewTAK: crew roles, set from Settings → Crew Users (when adding someone,
// or from the dropdown on their row). The stored value "member" is shown as
// "Crew". Mirrors normalizeCrewRole / updateCrewRole on the backend.
export const CREW_ROLES = [
  {
    value: 'member',
    label: 'Crew',
    description: 'Regular crew member',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: "Can approve, edit and delete anyone's tasks",
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access, including Crew Users',
  },
]

export const DEFAULT_CREW_ROLE = 'member'

export const crewRoleLabel = role =>
  CREW_ROLES.find(r => r.value === role)?.label ?? 'Crew'
