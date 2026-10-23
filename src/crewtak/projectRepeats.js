import moment from 'moment'

// CrewTAK: "Google Calendar"-style future repeats.
//
// The server only ever stores a repeating task's *next* due date; the
// occurrence after that is worked out when the current one is completed or
// skipped. To show a task's later repeats on the timeline and calendar we
// run the same schedule math here (a port of internal/chore/scheduler.go),
// assuming each occurrence is done on time.
//
// Projected occurrences are display-only copies of the real task, marked
// `_projected: true`. They can't be completed or edited themselves; opening
// one opens the real task.
//
// Every repeat in CrewTAK currently runs forever (there is no "end after N
// times" or "until" setting yet), so projection stops at a horizon instead.

export const REPEAT_HORIZON_OPTIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 31, label: '1 month' },
  { days: 62, label: '2 months' },
]
export const DEFAULT_REPEAT_HORIZON_DAYS = 14

// Hard cap per task, so a "every 1 hour" task can't flood the page.
const MAX_PER_CHORE = 400

const PROJECTABLE = new Set([
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'interval',
  'days_of_the_week',
  'day_of_the_month',
])

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

// Weekday names as the server stores them, indexed by moment().day(). Not
// format('dddd'), which follows the UI language.
const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const readMetadata = chore => {
  const raw = chore.frequencyMetadata
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {}
    } catch {
      return {}
    }
  }
  return raw
}

const occurrencesOf = meta => {
  if (Array.isArray(meta.occurrences) && meta.occurrences.length) {
    return meta.occurrences.map(o => (o === -1 ? 'last' : String(o)))
  }
  if (Array.isArray(meta.weekNumbers) && meta.weekNumbers.length) {
    return meta.weekNumbers.map(String)
  }
  return []
}

const nthWeekdayInMonth = date => Math.floor((date.date() - 1) / 7) + 1
const isLastWeekdayInMonth = date =>
  date.clone().add(7, 'days').month() !== date.month()

const quarterStart = date =>
  date
    .clone()
    .month(Math.floor(date.month() / 3) * 3)
    .date(1)
    .startOf('day')
const nthWeekdayInQuarter = date => {
  const start = quarterStart(date)
  let count = 0
  for (const d = start.clone(); !d.isAfter(date, 'day'); d.add(1, 'day')) {
    if (d.day() === date.day()) count++
  }
  return count
}
const isLastWeekdayInQuarter = date =>
  Math.floor(date.clone().add(7, 'days').month() / 3) !==
    Math.floor(date.month() / 3) ||
  date.clone().add(7, 'days').year() !== date.year()

// The occurrence after `base` (a moment), or null when the schedule can't
// produce one.
const nextAfter = (chore, meta, base) => {
  const days = (meta.days || []).filter(Boolean).map(d => d.toLowerCase())

  switch (chore.frequencyType) {
    case 'days_of_the_week': {
      if (!days.length) return null
      const pattern = meta.weekPattern || 'every_week'
      if (pattern === 'every_week') {
        for (let i = 1; i <= 7; i++) {
          const d = base.clone().add(i, 'days')
          if (days.includes(WEEKDAYS[d.day()])) return d
        }
        return null
      }
      const occ = new Set(occurrencesOf(meta).map(o => o.toLowerCase()))
      if (!occ.size) return null
      const monthly = pattern === 'week_of_month'
      const d = base.clone()
      for (let i = 0; i < 730; i++) {
        d.add(1, 'day')
        if (!days.includes(WEEKDAYS[d.day()])) continue
        const n = monthly ? nthWeekdayInMonth(d) : nthWeekdayInQuarter(d)
        const last = monthly
          ? isLastWeekdayInMonth(d)
          : isLastWeekdayInQuarter(d)
        if (occ.has(String(n)) || (occ.has('last') && last)) return d.clone()
      }
      return null
    }
    case 'day_of_the_month': {
      const months = (meta.months || [])
        .filter(Boolean)
        .map(m => m.toLowerCase())
      const day = chore.frequency
      if (!months.length || !(day >= 1 && day <= 31)) return null
      for (let i = 0; i <= 12; i++) {
        const m = base.clone().startOf('month').add(i, 'months')
        const target = m
          .clone()
          .date(Math.min(day, m.daysInMonth()))
          .hours(base.hours())
          .minutes(base.minutes())
          .seconds(0)
        if (!target.isAfter(base)) continue
        if (months.includes(MONTH_NAMES[target.month()])) return target
      }
      return null
    }
    default:
      return null
  }
}

// The k-th occurrence after `anchor` for fixed-step schedules. Stepping from
// the anchor (instead of from the previous result) keeps month-end dates from
// drifting (Jan 31 → Feb 28 → Mar 28 ...).
const fixedStep = (chore, meta, anchor, k) => {
  switch (chore.frequencyType) {
    case 'daily':
      return anchor.clone().add(k, 'days')
    case 'weekly':
      return anchor.clone().add(7 * k, 'days')
    case 'monthly':
      return anchor.clone().add(k, 'months')
    case 'yearly':
      return anchor.clone().add(k, 'years')
    case 'interval': {
      const n = Number(chore.frequency) || 0
      if (n <= 0) return null
      const unit = meta.unit
      if (!['hours', 'days', 'weeks', 'months', 'years'].includes(unit)) {
        return null
      }
      return anchor.clone().add(n * k, unit)
    }
    default:
      return undefined // not a fixed-step schedule
  }
}

const isProjectable = chore =>
  chore &&
  !chore._projected &&
  chore.nextDueDate &&
  chore.isActive !== false &&
  PROJECTABLE.has(chore.frequencyType)

// Future occurrences (Date objects) of one task, after its real next due
// date, that fall after `from` and up to `until`.
export const futureOccurrences = (chore, from, until) => {
  if (!isProjectable(chore)) return []
  const meta = readMetadata(chore)
  const anchor = moment(chore.nextDueDate)
  const out = []

  if (fixedStep(chore, meta, anchor, 1) !== undefined) {
    for (let k = 1; out.length < MAX_PER_CHORE; k++) {
      const d = fixedStep(chore, meta, anchor, k)
      if (!d || !d.isAfter(anchor)) break
      if (d.isAfter(until)) break
      if (d.isAfter(from)) out.push(d.toDate())
    }
    return out
  }

  let d = anchor
  for (let guard = 0; out.length < MAX_PER_CHORE && guard < 5000; guard++) {
    const next = nextAfter(chore, meta, d)
    if (!next || !next.isAfter(d) || next.isAfter(until)) break
    if (next.isAfter(from)) out.push(next.toDate())
    d = next
  }
  return out
}

// Real tasks plus a display-only copy for every future repeat up to
// `horizonDays` from now. Projected copies drop any in-progress/paused state
// so they group as plain upcoming work.
export const expandRepeats = (chores, horizonDays) => {
  if (!horizonDays || !Array.isArray(chores) || !chores.length) return chores
  const now = moment()
  const until = moment().add(horizonDays, 'days').endOf('day')
  const out = [...chores]
  for (const chore of chores) {
    for (const date of futureOccurrences(chore, now, until)) {
      const iso = date.toISOString()
      out.push({
        ...chore,
        nextDueDate: iso,
        status: 0,
        _projected: true,
        _projectedKey: `${chore.id}@${iso}`,
      })
    }
  }
  return out
}

export const isProjected = chore => Boolean(chore?._projected)

const STORAGE_KEY = 'crewtak.repeatHorizonDays'

// 0 means "off".
export const loadRepeatHorizon = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_REPEAT_HORIZON_DAYS
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_REPEAT_HORIZON_DAYS
  } catch {
    return DEFAULT_REPEAT_HORIZON_DAYS
  }
}
export const saveRepeatHorizon = days => {
  try {
    localStorage.setItem(STORAGE_KEY, String(days))
  } catch {
    // storage unavailable: keep the choice for this session only
  }
}
