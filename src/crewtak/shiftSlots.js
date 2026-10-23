import { useQuery } from '@tanstack/react-query'
import moment from 'moment'

import { apiClient } from '@/utils/ApiClient'

import { shiftBoundsAt } from './shifts'

// Shared by Shift Info (/shift) and the Wall Display (/display).
//
// Picks are stored on the server per crew and per 48-hour tour. Sleep blocks
// are also keyed by shift day, so they start empty again every morning when
// the shift day rolls over (Day 1 → Day 2 → next tour's Day 1). A person can
// hold only one phone: assigning them to a phone clears their old one.

export const PHONES = [
  { slot: 'phone.captain', label: "Captain's", short: 'Captain' },
  { slot: 'phone.ff1', label: 'Firefighter 1', short: 'FF1' },
  { slot: 'phone.ff2', label: 'Firefighter 2', short: 'FF2' },
  { slot: 'phone.ops', label: 'Ops', short: 'Ops' },
]

export const SLEEP_BLOCKS = [
  { index: 0, label: '8p – 1130p' },
  { index: 1, label: '1130p – 3a' },
  { index: 2, label: '3a – 7a' },
]

export const sleepSlot = (shiftDay, index) => `sleep.${shiftDay}.${index}`

export const isPhoneSlot = slot => slot.startsWith('phone.')

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
  if (userId != null && isPhoneSlot(slot)) {
    Object.keys(next).forEach(key => {
      if (key !== slot && isPhoneSlot(key) && next[key] === userId) {
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
