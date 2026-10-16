// CrewTAK shift rotation: three crews (A, B, C) working 48 on / 96 off.
//
// The rotation is fixed, so the crew on duty at any moment can be worked out
// from one known shift start. No schedule is stored anywhere.

export const SHIFT_NAMES = ['A', 'B', 'C']
export const SHIFT_HOURS = 48
export const SHIFT_CHANGE = '07:00'

// A Shift came on duty at 07:00 on Friday 16 October 2026 (America/Chicago).
const ANCHOR = { year: 2026, month: 10, day: 16, shiftIndex: 0 }

const HOUR_MS = 60 * 60 * 1000
const CYCLE_HOURS = SHIFT_HOURS * SHIFT_NAMES.length

// Wall-clock hours since the anchor in station local time. Working in local
// time keeps the 07:00 change at 07:00 across daylight-saving switches.
const localHoursSinceAnchor = date => {
  const d = date instanceof Date ? date : new Date(date)
  const [changeHour, changeMinute] = SHIFT_CHANGE.split(':').map(Number)
  const anchorLocal = new Date(
    ANCHOR.year,
    ANCHOR.month - 1,
    ANCHOR.day,
    changeHour,
    changeMinute,
  )
  // Compare as if both were UTC wall clocks so DST offsets cancel out.
  const asWallClock = x =>
    Date.UTC(
      x.getFullYear(),
      x.getMonth(),
      x.getDate(),
      x.getHours(),
      x.getMinutes(),
      x.getSeconds(),
    )
  return (asWallClock(d) - asWallClock(anchorLocal)) / HOUR_MS
}

const mod = (n, m) => ((n % m) + m) % m

// Returns 'A', 'B' or 'C' for the crew on duty at `date` (default: now).
export const shiftAt = (date = new Date()) => {
  const hours = localHoursSinceAnchor(date)
  if (Number.isNaN(hours)) return null
  const slot = Math.floor(mod(hours, CYCLE_HOURS) / SHIFT_HOURS)
  return SHIFT_NAMES[(ANCHOR.shiftIndex + slot) % SHIFT_NAMES.length]
}

// Day 1 or day 2 of the current 48-hour tour.
export const shiftDayAt = (date = new Date()) => {
  const hours = localHoursSinceAnchor(date)
  if (Number.isNaN(hours)) return null
  return Math.floor(mod(hours, SHIFT_HOURS) / 24) + 1
}

// When the tour on duty at `date` started, and when the next crew comes on.
export const shiftBoundsAt = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date)
  const hours = localHoursSinceAnchor(d)
  if (Number.isNaN(hours)) return null
  const intoShift = mod(hours, SHIFT_HOURS)
  const start = new Date(d)
  start.setTime(d.getTime() - intoShift * HOUR_MS)
  // Snap to the exact change time in local wall-clock terms.
  const [changeHour, changeMinute] = SHIFT_CHANGE.split(':').map(Number)
  const startLocal = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    changeHour,
    changeMinute,
  )
  if (startLocal > d) startLocal.setDate(startLocal.getDate() - 1)
  const end = new Date(startLocal)
  end.setDate(end.getDate() + SHIFT_HOURS / 24)
  return { start: startLocal, end, next: shiftAt(end) }
}

// Colour per crew, used for the small shift badges.
export const SHIFT_COLORS = { A: 'primary', B: 'warning', C: 'success' }
