import { useCircleMembers, useUserProfile } from '../queries/UserQueries'
import { isParentUser } from '../utils/UserHelpers'

// CrewTAK: who may manage crew logins and crew settings. The original
// account owner always can; anyone else needs the admin role in the crew
// (set from Settings → Crew). Mirrors crewManager() on the backend.
export const isCrewAdmin = (profile, members) => {
  if (!profile) return false
  if (isParentUser(profile)) return true
  const me = (members || []).find(member => member.userId === profile.id)
  return me?.role === 'admin'
}

export const useCrewAdmin = () => {
  const { data: userProfile } = useUserProfile()
  const { data: membersData } = useCircleMembers()
  return isCrewAdmin(userProfile, membersData?.res)
}
