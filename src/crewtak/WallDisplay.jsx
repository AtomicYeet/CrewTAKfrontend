import { Bedtime, HomeRounded, PhoneInTalk } from '@mui/icons-material'
import { Box, Chip, IconButton, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useChores, useChoresHistory } from '@/queries/ChoreQueries'
import { useCircleMembers } from '@/queries/UserQueries'

import LogoSrc from '../assets/logo.svg'
import { ACCENT, BRAND_BLUE } from './brand'
import {
  PHONES,
  SLEEP_BLOCKS,
  sleepSlot,
  tourAt,
  useShiftSlots,
} from './shiftSlots'
import { shiftAt, shiftBoundsAt, shiftDayAt } from './shifts'
import Wordmark from './Wordmark'

// Full-screen station board for a wall TV or tablet. Read-only: crews check
// tasks off on their own phones so the log shows who did what.

const REFRESH_MS = 60 * 1000
const CLOCK_MS = 15 * 1000

const SHIFT_HEX = { A: BRAND_BLUE[400], B: ACCENT, C: '#3ccf8e' }

const BG = '#05080f'
const PANEL = '#0d1320'
const BORDER = 'rgba(255,255,255,0.08)'
const MUTED = 'rgba(255,255,255,0.55)'

// Keep the screen awake where the browser allows it.
const useWakeLock = () => {
  useEffect(() => {
    let lock = null
    let cancelled = false
    const request = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Not supported or not allowed; the board still works.
      }
    }
    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') request()
    }
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release?.().catch(() => {})
    }
  }, [])
}

const useNow = interval => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

// Time left in the tour, e.g. "9 Hours and 56 Minutes" (hours run past 24
// on a 48-hour shift). Rounded up so it never reads 0 while still on shift.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const untilChange = (end, now) => {
  const minutes = Math.max(0, Math.ceil((end - now) / 60000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${plural(h, 'Hour')} and ${plural(m, 'Minute')}`
}

const dueLabel = (date, now) => {
  const due = moment(date)
  const end = moment(due)
  // Tasks without a set time are stored as due at 23:59.
  const allDay = end.hours() === 23 && end.minutes() === 59
  if (due.isSame(now, 'day')) return allDay ? 'Today' : due.format('HH:mm')
  if (due.isSame(moment(now).subtract(1, 'day'), 'day'))
    return allDay ? 'Yesterday' : `Yest. ${due.format('HH:mm')}`
  return allDay ? due.format('ddd D MMM') : due.format('ddd D MMM HH:mm')
}

const Column = ({ accent, children, count, title }) => (
  <Box
    sx={{
      bgcolor: PANEL,
      border: `1px solid ${BORDER}`,
      borderTop: `4px solid ${accent}`,
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        alignItems: 'baseline',
        display: 'flex',
        justifyContent: 'space-between',
        px: 3,
        pt: 2.5,
        pb: 1.5,
      }}
    >
      <Typography
        sx={{
          color: '#fff',
          fontSize: 'clamp(1.1rem, 1.6vw, 1.7rem)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          color: accent,
          fontSize: 'clamp(1.6rem, 2.6vw, 2.8rem)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {count}
      </Typography>
    </Box>
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', px: 1.5, pb: 1.5 }}>
      {children}
    </Box>
  </Box>
)

Column.propTypes = {
  accent: PropTypes.string,
  children: PropTypes.node,
  count: PropTypes.number,
  title: PropTypes.string,
}

// `done` strikes the name through; `dim` only greys it (upcoming tasks).
const Row = ({ dim, done, meta, metaColor, name }) => (
  <Box
    sx={{
      alignItems: 'center',
      borderBottom: `1px solid ${BORDER}`,
      display: 'flex',
      gap: 2,
      justifyContent: 'space-between',
      px: 1.5,
      py: 'clamp(0.5rem, 1.1vh, 1rem)',
      '&:last-of-type': { borderBottom: 'none' },
    }}
  >
    <Typography
      sx={{
        color: done || dim ? MUTED : '#fff',
        fontSize: 'clamp(1rem, 1.55vw, 1.65rem)',
        fontWeight: 600,
        lineHeight: 1.2,
        minWidth: 0,
        overflow: 'hidden',
        textDecoration: done ? 'line-through' : 'none',
        textDecorationColor: 'rgba(255,255,255,0.35)',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </Typography>
    <Typography
      sx={{
        color: metaColor || MUTED,
        flexShrink: 0,
        fontSize: 'clamp(0.9rem, 1.25vw, 1.35rem)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        textAlign: 'right',
      }}
    >
      {meta}
    </Typography>
  </Box>
)

Row.propTypes = {
  dim: PropTypes.bool,
  done: PropTypes.bool,
  meta: PropTypes.node,
  metaColor: PropTypes.string,
  name: PropTypes.string,
}

const Empty = ({ children }) => (
  <Typography
    sx={{
      color: MUTED,
      fontSize: 'clamp(1rem, 1.4vw, 1.5rem)',
      px: 1.5,
      py: 2,
    }}
  >
    {children}
  </Typography>
)

Empty.propTypes = { children: PropTypes.node }

// Small header panel: phone holders (left of the clock) or tonight's sleep
// blocks (right of the clock). Read-only here; picks are made on /shift.
const AssignmentPanel = ({ icon, rows, title }) => (
  <Box
    sx={{
      bgcolor: PANEL,
      border: `1px solid ${BORDER}`,
      borderRadius: '14px',
      minWidth: 0,
      px: 'clamp(10px, 1vw, 18px)',
      py: 'clamp(6px, 0.7vw, 12px)',
    }}
  >
    <Typography
      startDecorator={icon}
      sx={{
        color: MUTED,
        fontSize: 'clamp(0.7rem, 0.85vw, 0.95rem)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        mb: 0.5,
        textTransform: 'uppercase',
      }}
    >
      {title}
    </Typography>
    <Box
      sx={{
        columnGap: 'clamp(8px, 0.9vw, 16px)',
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        rowGap: 0.25,
      }}
    >
      {rows.map(r => (
        <Box key={r.key} sx={{ display: 'contents' }}>
          <Typography
            sx={{
              color: MUTED,
              fontSize: 'clamp(0.8rem, 1vw, 1.15rem)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {r.label}
          </Typography>
          <Typography
            sx={{
              color: r.name ? '#fff' : 'rgba(255,255,255,0.3)',
              fontSize: 'clamp(0.85rem, 1.1vw, 1.3rem)',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {r.name || '—'}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
)

AssignmentPanel.propTypes = {
  icon: PropTypes.node,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      name: PropTypes.string,
    }),
  ).isRequired,
  title: PropTypes.string.isRequired,
}

const WallDisplay = () => {
  useWakeLock()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const now = useNow(CLOCK_MS)
  const { data: choresData } = useChores(false)
  // Two days of history always covers the whole 48-hour shift.
  const { data: history } = useChoresHistory(3, true)
  const { data: membersData } = useCircleMembers()

  // Pull fresh data every minute even when no live update arrives.
  useEffect(() => {
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      queryClient.invalidateQueries({ queryKey: ['choresHistory'] })
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [queryClient])

  const shift = shiftAt(now)
  const shiftDay = shiftDayAt(now)
  const bounds = shiftBoundsAt(now)

  const membersById = useMemo(() => {
    const map = new Map()
    ;(membersData?.res || []).forEach(m => map.set(m.userId, m.displayName))
    return map
  }, [membersData])

  // Phone holders and tonight's sleep blocks (from Shift Info).
  const { data: slots = {} } = useShiftSlots(tourAt(now))
  const slotName = slot =>
    slots[slot] == null ? null : membersById.get(slots[slot]) || 'Former member'
  const phoneRows = PHONES.map(p => ({
    key: p.slot,
    label: p.short,
    name: slotName(p.slot),
  }))
  const sleepRows = SLEEP_BLOCKS.map(b => ({
    key: `sleep-${b.index}`,
    label: b.label,
    name: shiftDay ? slotName(sleepSlot(shiftDay, b.index)) : null,
  }))

  const { dueToday, overdue, upNext } = useMemo(() => {
    const chores = (choresData?.res || []).filter(
      c => c.isActive !== false && c.nextDueDate,
    )
    const endOfToday = moment(now).endOf('day')
    const endOfTomorrow = moment(now).add(1, 'day').endOf('day')
    const sorted = [...chores].sort(
      (a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate),
    )
    return {
      overdue: sorted.filter(c => moment(c.nextDueDate).isBefore(now)),
      dueToday: sorted.filter(
        c =>
          !moment(c.nextDueDate).isBefore(now) &&
          moment(c.nextDueDate).isSameOrBefore(endOfToday),
      ),
      upNext: sorted.filter(
        c =>
          moment(c.nextDueDate).isAfter(endOfToday) &&
          moment(c.nextDueDate).isSameOrBefore(endOfTomorrow),
      ),
    }
  }, [choresData, now])

  const doneThisShift = useMemo(() => {
    if (!bounds) return []
    const names = new Map((choresData?.res || []).map(c => [c.id, c.name]))
    return (history || [])
      .filter(
        h =>
          h.status === 1 &&
          h.performedAt &&
          new Date(h.performedAt) >= bounds.start,
      )
      .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))
      .map(h => ({
        id: h.id,
        name: names.get(h.choreId) || h.choreName || 'Task',
        by: membersById.get(h.completedBy) || '',
        at: moment(h.performedAt).format('HH:mm'),
      }))
  }, [history, bounds, choresData, membersById])

  const shiftColor = SHIFT_HEX[shift] || ACCENT

  return (
    <Box
      sx={{
        bgcolor: BG,
        color: '#fff',
        display: 'grid',
        gap: 'clamp(12px, 1.4vw, 24px)',
        gridTemplateRows: 'auto 1fr',
        height: '100dvh',
        inset: 0,
        overflow: 'hidden',
        p: 'clamp(12px, 1.6vw, 32px)',
        position: 'fixed',
        zIndex: 1300,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          alignItems: 'center',
          display: 'grid',
          gap: 'clamp(10px, 1.2vw, 20px)',
          // Wide screens: logo | phones | clock | sleep | shift, all one row.
          // Narrower screens move phones and sleep to a second row.
          gridTemplateAreas: {
            xs: `"brand clock shift" "phones phones sleep"`,
            lg: `"brand phones clock sleep shift"`,
          },
          gridTemplateColumns: {
            xs: 'auto 1fr auto',
            lg: 'auto minmax(0, 1fr) auto minmax(0, 1fr) auto',
          },
        }}
      >
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            gap: 1.5,
            gridArea: 'brand',
          }}
        >
          {/* Touchscreens have no back button, so give them a way out. */}
          <IconButton
            aria-label='Back to tasks'
            onClick={() => navigate('/')}
            variant='soft'
            sx={{
              '--IconButton-size': 'clamp(44px, 3.6vw, 64px)',
              bgcolor: 'rgba(255,255,255,0.08)',
              borderRadius: '14px',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
            }}
          >
            <HomeRounded sx={{ fontSize: 'clamp(24px, 2vw, 36px)' }} />
          </IconButton>
          <Box
            component='img'
            src={LogoSrc}
            alt=''
            sx={{ height: 'clamp(36px, 3.4vw, 64px)', width: 'auto' }}
          />
          <Typography
            sx={{
              color: '#fff',
              fontSize: 'clamp(1.4rem, 2.4vw, 2.6rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            <Wordmark />
          </Typography>
        </Box>

        <Box sx={{ gridArea: 'phones', minWidth: 0 }}>
          <AssignmentPanel
            icon={<PhoneInTalk sx={{ fontSize: '1.1em' }} />}
            rows={phoneRows}
            title='Phones'
          />
        </Box>

        <Box sx={{ gridArea: 'clock', textAlign: 'center' }}>
          <Typography
            sx={{
              color: '#fff',
              fontSize: 'clamp(2.6rem, 5.5vw, 6rem)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {moment(now).format('HH:mm')}
          </Typography>
          <Typography
            sx={{
              color: MUTED,
              fontSize: 'clamp(0.9rem, 1.3vw, 1.4rem)',
              fontWeight: 600,
              mt: 0.5,
            }}
          >
            {moment(now).format('dddd D MMMM')}
          </Typography>
        </Box>

        <Box sx={{ gridArea: 'sleep', minWidth: 0 }}>
          <AssignmentPanel
            icon={<Bedtime sx={{ fontSize: '1.1em' }} />}
            rows={sleepRows}
            title={shiftDay ? `Sleep · Day ${shiftDay}` : 'Sleep'}
          />
        </Box>

        <Box sx={{ gridArea: 'shift', justifySelf: 'end', textAlign: 'right' }}>
          {shift && (
            <>
              <Chip
                variant='solid'
                sx={{
                  bgcolor: shiftColor,
                  color: '#05080f',
                  fontSize: 'clamp(1.1rem, 1.9vw, 2.1rem)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  px: 2,
                  py: 0.75,
                }}
              >
                {shift} SHIFT · DAY {shiftDay}
              </Chip>
              {bounds && (
                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 'clamp(0.85rem, 1.15vw, 1.25rem)',
                    fontWeight: 600,
                    mt: 0.75,
                  }}
                >
                  {untilChange(bounds.end, now)} until shift change
                </Typography>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Columns */}
      <Box
        sx={{
          display: 'grid',
          gap: 'clamp(12px, 1.4vw, 24px)',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          minHeight: 0,
        }}
      >
        <Column title='Overdue' count={overdue.length} accent='#ff4d4f'>
          {overdue.length === 0 ? (
            <Empty>Nothing overdue.</Empty>
          ) : (
            overdue.map(c => (
              <Row
                key={c.id}
                name={c.name}
                meta={dueLabel(c.nextDueDate, now)}
                metaColor='#ff7875'
              />
            ))
          )}
        </Column>

        <Column
          title='Due today'
          count={dueToday.length}
          accent={BRAND_BLUE[400]}
        >
          {dueToday.length === 0 ? (
            <Empty>All of today&apos;s tasks are done.</Empty>
          ) : (
            dueToday.map(c => (
              <Row
                key={c.id}
                name={c.name}
                meta={
                  c.status === 1 ? 'In progress' : dueLabel(c.nextDueDate, now)
                }
                metaColor={c.status === 1 ? ACCENT : undefined}
              />
            ))
          )}
          {upNext.length > 0 && (
            <>
              <Typography
                sx={{
                  color: MUTED,
                  fontSize: 'clamp(0.85rem, 1.1vw, 1.15rem)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  px: 1.5,
                  pt: 2,
                  pb: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Tomorrow
              </Typography>
              {upNext.map(c => (
                <Row
                  key={c.id}
                  name={c.name}
                  meta={dueLabel(c.nextDueDate, now)}
                  dim
                />
              ))}
            </>
          )}
        </Column>

        <Column
          title='Done this shift'
          count={doneThisShift.length}
          accent={shiftColor}
        >
          {doneThisShift.length === 0 ? (
            <Empty>Nothing checked off yet this shift.</Empty>
          ) : (
            doneThisShift.map(h => (
              <Row
                key={h.id}
                name={h.name}
                meta={h.by ? `${h.by} · ${h.at}` : h.at}
                done
              />
            ))
          )}
        </Column>
      </Box>
    </Box>
  )
}

export default WallDisplay
