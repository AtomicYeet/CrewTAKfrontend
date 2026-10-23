import { useQuery } from '@tanstack/react-query'
import moment from 'moment'

import { apiClient } from '@/utils/ApiClient'

import { shiftBoundsAt } from './shifts'

// Shared by Shift Info (/shift) and the Wall Display (/display).
//
// Picks are stored on the server per crew and per 48-hour tour. Watch times
// (stored as sleep.<day>.<n>) are also keyed by shift day, so they start empty
// again every morning when the shift day rolls over (Day 1 → Day 2 → next
// tour's Day 1). A person holds one phone and one watch time per day at most;
// assigning them somewhere new clears their old slot in that group.
//
// Rig (company) assignments are many-to-many and reset at shift change: each
// person-on-rig pairing is its own slot, company.<rig>.u<userId>.

export const PHONES = [
  { slot: 'phone.captain', label: "Captain's", short: 'Captain' },
  { slot: 'phone.ff1', label: 'Firefighter 1', short: 'FF1' },
  { slot: 'phone.ff2', label: 'Firefighter 2', short: 'FF2' },
  { slot: 'phone.ops', label: 'Ops', short: 'Ops' },
]

export const COMPANIES = [
  { slot: 'company.5181', label: '5181 Crash Truck', short: '5181 Crash' },
  { slot: 'company.5182', label: '5182 Crash Truck', short: '5182 Crash' },
  { slot: 'company.5184', label: '5184 Fire/EMS', short: '5184 Fire/EMS' },
  { slot: 'company.5132', label: '5132 EMS', short: '5132 EMS' },
]

// The slot recording that `userId` is on rig `co`.
export const rigSlot = (co, userId) => `${co.slot}.u${userId}`

// Everyone currently on rig `co`, as user ids.
export const rigMembers = (slots, co) =>
  Object.keys(slots)
    .filter(k => k.startsWith(`${co.slot}.u`) && slots[k] != null)
    .map(k => slots[k])

// Watch times. (Kept under the old "sleep" name in storage.)
export const SLEEP_BLOCKS = [
  { index: 0, label: '8p – 1130p' },
  { index: 1, label: '1130p – 3a' },
  { index: 2, label: '3a – 7a' },
]

export const sleepSlot = (shiftDay, index) => `sleep.${shiftDay}.${index}`

export const isPhoneSlot = slot => slot.startsWith('phone.')

// Slots sharing a group can't share a person (mirrors the server).
export const exclusiveGroup = slot => {
  if (slot.startsWith('phone.')) return 'phone.'
  if (slot.startsWith('sleep.')) return slot.slice(0, slot.lastIndexOf('.') + 1)
  return null
}

export const SHIFT_INFO_REFRESH_MS = 60 * 1000

export const tourAt = now => {
  const bounds = shiftBoundsAt(now)
  return bounds ? moment(bounds.start).format('YYYY-MM-DD') : null
}

export const shiftInfoQueryKey = tour => ['crewtakShiftInfo', tour]

export const fetchSlots = async tour => {
  const resp = await apiClient.get(
    `/crewtak/shift-info?tour=${encodeURIComponent(tour)}`,
  )
  if (!resp.ok) throw new Error('Could not load shift info')
  const body = await resp.json()
  const map = {}
  ;(body.res || []).forEach(s => {
    map[s.slot] = s.userId ?? null
  })
  return map
}

export const saveSlot = async ({ tour, slot, userId }) => {
  const resp = await apiClient.put(
    '/crewtak/shift-info',
    JSON.stringify({ tour, slot, userId }),
  )
  if (!resp.ok) {
    let msg = 'Could not save'
    try {
      msg = (await resp.json()).error || msg
    } catch {
      // keep the default message
    }
    throw new Error(msg)
  }
  return resp.json()
}

// What the slot map looks like right after `slot` is given to `userId`
// (mirrors the server, for an instant optimistic update).
export const applyPick = (slots, slot, userId) => {
  const next = { ...slots }
  const group = exclusiveGroup(slot)
  if (userId != null && group) {
    Object.keys(next).forEach(key => {
      if (key !== slot && key.startsWith(group) && next[key] === userId) {
        next[key] = null
      }
    })
  }
  next[slot] = userId
  return next
}

export const useShiftSlots = tour =>
  useQuery({
    queryKey: shiftInfoQueryKey(tour),
    queryFn: () => fetchSlots(tour),
    enabled: Boolean(tour),
    refetchInterval: SHIFT_INFO_REFRESH_MS,
  })
