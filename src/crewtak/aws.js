import { useQuery } from '@tanstack/react-query'
import moment from 'moment'

import { apiClient } from '@/utils/ApiClient'

// AWS events: one door held for a set window. Added and deleted on the AWS
// page (/aws); the wall display lists the ones in the current 48-hour tour,
// struck through once they've ended. Completed events are cleared by the
// server at shift change. Nothing here touches tasks.

// Keep ids in step with the backend's AWSDoors (internal/crewtak/shiftinfo/aws.go).
export const AWS_DOORS = [
  { id: 'bc_east', label: 'BC East' },
  { id: 'bc_west', label: 'BC West' },
  { id: 'tsa', label: 'TSA' },
  { id: 'ff_door', label: 'FF Door' },
  { id: 'united', label: 'United' },
  { id: 'delta', label: 'Delta' },
  { id: 'american', label: 'American' },
  { id: 'allegiant', label: 'Allegiant' },
  { id: 'salt_room', label: 'Salt Room' },
  { id: 'basement', label: 'Basement' },
]

export const doorLabel = id => AWS_DOORS.find(d => d.id === id)?.label || id

export const AWS_QUERY_KEY = ['crewtakAws']
const AWS_REFRESH_MS = 60 * 1000

const errorFrom = async (resp, fallback) => {
  try {
    return (await resp.json()).error || fallback
  } catch {
    return fallback
  }
}

export const fetchAwsEvents = async () => {
  const resp = await apiClient.get('/crewtak/aws')
  if (!resp.ok)
    throw new Error(await errorFrom(resp, 'Could not load AWS events'))
  const body = await resp.json()
  return (body.res || []).map(e => ({
    ...e,
    start: new Date(e.startAt),
    end: new Date(e.endAt),
  }))
}

export const createAwsEvent = async ({ door, start, end }) => {
  const resp = await apiClient.post(
    '/crewtak/aws',
    JSON.stringify({
      door,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    }),
  )
  if (!resp.ok) throw new Error(await errorFrom(resp, 'Could not save'))
  return resp.json()
}

export const deleteAwsEvent = async id => {
  const resp = await apiClient.delete(`/crewtak/aws/${id}`)
  if (!resp.ok) throw new Error(await errorFrom(resp, 'Could not delete'))
  return resp.json()
}

export const useAwsEvents = () =>
  useQuery({
    queryKey: AWS_QUERY_KEY,
    queryFn: fetchAwsEvents,
    refetchInterval: AWS_REFRESH_MS,
  })

// Station-style 24-hour time: 1615.
export const fmtAwsTime = date => moment(date).format('HHmm')

// "45m", "1h", "1h 30m".
export const fmtDuration = ms => {
  if (!(ms > 0)) return '—'
  const minutes = Math.round(ms / 60000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`
}

export const awsStatus = (event, now) => {
  if (event.end <= now) return 'done'
  if (event.start <= now) return 'active'
  return 'upcoming'
}

// Events overlapping the tour `bounds` ({ start, end }), each tagged with the
// shift day (1 or 2) it starts on. Ones that started before the tour (running
// across shift change) count as Day 1.
export const eventsInTour = (events, bounds) => {
  if (!bounds) return []
  const day2 = moment(bounds.start).add(1, 'day').toDate()
  return (events || [])
    .filter(e => e.end > bounds.start && e.start < bounds.end)
    .map(e => ({ ...e, shiftDay: e.start >= day2 ? 2 : 1 }))
}

// "1615" or "16:15" → { h, m }, or null if it isn't a valid 24-hour time.
export const parseHHMM = text => {
  const t = (text || '').trim().replace(':', '')
  if (!/^\d{3,4}$/.test(t)) return null
  const h = Number(t.slice(0, -2))
  const m = Number(t.slice(-2))
  if (h > 23 || m > 59) return null
  return { h, m }
}
