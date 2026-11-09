import { Add, DeleteOutline, MeetingRoomOutlined } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Typography,
} from '@mui/joy'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'

import {
  AWS_DOORS,
  AWS_QUERY_KEY,
  awsStatus,
  createAwsEvent,
  deleteAwsEvent,
  doorLabel,
  eventsInTour,
  fmtAwsTime,
  fmtDuration,
  parseHHMM,
  useAwsEvents,
} from './aws'
import { SHIFT_COLORS, shiftAt, shiftBoundsAt, shiftDayAt } from './shifts'

// AWS module: add and delete AWS events (one door, a start and an end time).
// The wall display shows this shift's events read-only. Completed events
// clear out at shift change. Separate from tasks.

const useClock = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// Turns the form into start/end Dates. An end time earlier than the start
// runs past midnight into the next day.
const buildWindow = ({ date, endText, startText }) => {
  const s = parseHHMM(startText)
  const e = parseHHMM(endText)
  if (!date || !s || !e) return null
  const start = moment(date, 'YYYY-MM-DD').hours(s.h).minutes(s.m).toDate()
  const end = moment(date, 'YYYY-MM-DD').hours(e.h).minutes(e.m).toDate()
  if (end <= start) end.setDate(end.getDate() + 1)
  return { end, overnight: end.getDate() !== start.getDate(), start }
}

const shiftLabel = date => {
  const s = shiftAt(date)
  return s ? `${s} Shift · Day ${shiftDayAt(date)}` : ''
}

const AddLine = ({ onCancel, onSaved }) => {
  const queryClient = useQueryClient()
  const [door, setDoor] = useState(null)
  const [date, setDate] = useState(() => moment().format('YYYY-MM-DD'))
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [error, setError] = useState(null)

  const span = buildWindow({ date, endText, startText })
  const startBad = startText.trim() !== '' && !parseHHMM(startText)
  const endBad = endText.trim() !== '' && !parseHHMM(endText)

  const mutation = useMutation({
    mutationFn: createAwsEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AWS_QUERY_KEY })
      onSaved()
    },
    onError: err => setError(err.message),
  })

  const submit = e => {
    e.preventDefault()
    setError(null)
    if (!door) {
      setError('Pick a door')
    } else if (!span) {
      setError('Enter start and end as 24-hour times, like 1615')
    } else {
      mutation.mutate({ door, end: span.end, start: span.start })
    }
  }

  const timeInput = (label, value, setValue, bad) => (
    <FormControl error={bad} sx={{ width: { xs: '100%', sm: 110 } }}>
      <FormLabel>{label}</FormLabel>
      <Input
        aria-label={`${label} time`}
        placeholder='1615'
        value={value}
        onChange={e =>
          setValue(e.target.value.replace(/[^\d:]/g, '').slice(0, 5))
        }
        slotProps={{ input: { inputMode: 'numeric', maxLength: 5 } }}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      />
    </FormControl>
  )

  return (
    <Sheet
      component='form'
      data-testid='aws-add-line'
      onSubmit={submit}
      variant='outlined'
      sx={{ borderRadius: 'lg', mb: 3, p: 2 }}
    >
      <Box
        sx={{
          alignItems: 'flex-end',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <FormControl
          sx={{ minWidth: 170, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
        >
          <FormLabel>Door</FormLabel>
          <Select
            aria-label='Door'
            placeholder='Pick a door'
            value={door}
            onChange={(_e, v) => setDoor(v)}
          >
            {AWS_DOORS.map(d => (
              <Option key={d.id} value={d.id}>
                {d.label}
              </Option>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ width: { xs: '100%', sm: 170 } }}>
          <FormLabel>Date</FormLabel>
          <Input
            aria-label='Date'
            type='date'
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </FormControl>
        {timeInput('Start', startText, setStartText, startBad)}
        {timeInput('End', endText, setEndText, endBad)}
        <Box sx={{ minWidth: 110, pb: 0.75 }}>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            Duration
          </Typography>
          <Typography
            data-testid='aws-duration'
            level='title-lg'
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {span ? fmtDuration(span.end - span.start) : '—'}
          </Typography>
        </Box>
      </Box>
      {span && (
        <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 1 }}>
          {moment(span.start).format('ddd D MMM HHmm')} –{' '}
          {moment(span.end).format(span.overnight ? 'ddd D MMM HHmm' : 'HHmm')}
          {span.overnight ? ' (runs past midnight)' : ''}
          {shiftLabel(span.start) ? ` · ${shiftLabel(span.start)}` : ''}
        </Typography>
      )}
      {error && (
        <Typography color='danger' level='body-sm' sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
        <Button variant='plain' color='neutral' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' loading={mutation.isPending}>
          Add event
        </Button>
      </Box>
    </Sheet>
  )
}

AddLine.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
}

const STATUS_CHIP = {
  active: { color: 'warning', label: 'Now' },
  done: { color: 'neutral', label: 'Done' },
}

// One event line. Delete takes two taps so a stray touch can't remove it.
const EventLine = ({ event, now, onDelete, showDate }) => {
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!confirming) return undefined
    const id = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(id)
  }, [confirming])

  const status = awsStatus(event, now)
  const done = status === 'done'
  const chip = STATUS_CHIP[status]
  return (
    <Box
      data-testid={`aws-line-${event.id}`}
      data-status={status}
      sx={{
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'grid',
        gap: { xs: 1, sm: 2 },
        // Door (+ Now/Done) | time | duration | delete
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr) auto 36px 64px',
          sm: 'minmax(0, 1fr) auto 56px 72px',
        },
        px: 1.5,
        py: 1,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Typography
          level='title-md'
          sx={{
            color: done ? 'text.tertiary' : undefined,
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {doorLabel(event.door)}
        </Typography>
        {chip && (
          <Chip color={chip.color} size='sm' variant='soft'>
            {chip.label}
          </Chip>
        )}
      </Box>
      <Typography
        level='body-md'
        sx={{
          color: done ? 'text.tertiary' : undefined,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
          textDecoration: done ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {showDate && (
          <Box component='span' sx={{ display: { xs: 'block', sm: 'inline' } }}>
            {moment(event.start).format('ddd D MMM')}
            <Box
              component='span'
              sx={{ display: { xs: 'none', sm: 'inline' } }}
            >
              {' · '}
            </Box>
          </Box>
        )}
        {fmtAwsTime(event.start)}–{fmtAwsTime(event.end)}
      </Typography>
      <Typography
        level='body-sm'
        sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
      >
        {fmtDuration(event.end - event.start)}
      </Typography>
      {confirming ? (
        <Button
          color='danger'
          data-testid='aws-confirm-delete'
          size='sm'
          onClick={() => onDelete(event.id)}
          sx={{ justifySelf: 'end', minWidth: 0, px: 1 }}
        >
          Delete
        </Button>
      ) : (
        <IconButton
          aria-label={`Delete ${doorLabel(event.door)} ${fmtAwsTime(event.start)}`}
          color='neutral'
          size='sm'
          variant='plain'
          onClick={() => setConfirming(true)}
          sx={{ justifySelf: 'end' }}
        >
          <DeleteOutline />
        </IconButton>
      )}
    </Box>
  )
}

EventLine.propTypes = {
  event: PropTypes.object.isRequired,
  now: PropTypes.instanceOf(Date).isRequired,
  onDelete: PropTypes.func.isRequired,
  showDate: PropTypes.bool,
}

const Group = ({ children, title, today }) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, mb: 1 }}>
      <Typography
        level='title-sm'
        sx={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {title}
      </Typography>
      {today && (
        <Chip color='primary' size='sm' variant='soft'>
          Today
        </Chip>
      )}
    </Box>
    <Sheet variant='outlined' sx={{ borderRadius: 'lg', py: 0.5 }}>
      {children}
    </Sheet>
  </Box>
)

Group.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string.isRequired,
  today: PropTypes.bool,
}

const AWS = () => {
  const now = useClock()
  const queryClient = useQueryClient()
  const { data: events = [], isError, isLoading } = useAwsEvents()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const shift = shiftAt(now)
  const shiftDay = shiftDayAt(now)
  const bounds = shiftBoundsAt(now)

  const remove = useMutation({
    mutationFn: deleteAwsEvent,
    onMutate: async id => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: AWS_QUERY_KEY })
      const previous = queryClient.getQueryData(AWS_QUERY_KEY)
      queryClient.setQueryData(AWS_QUERY_KEY, old =>
        (old || []).filter(e => e.id !== id),
      )
      return { previous }
    },
    onError: (err, _id, ctx) => {
      queryClient.setQueryData(AWS_QUERY_KEY, ctx?.previous)
      setError(err.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: AWS_QUERY_KEY }),
  })

  const { byDay, later } = useMemo(() => {
    const inTour = eventsInTour(events, bounds)
    const ids = new Set(inTour.map(e => e.id))
    return {
      byDay: [1, 2].map(day => inTour.filter(e => e.shiftDay === day)),
      // Loaded for later shifts (and anything left from before this tour).
      later: events.filter(e => !ids.has(e.id)),
    }
  }, [events, bounds])

  const line = (e, showDate = false) => (
    <EventLine
      key={e.id}
      event={e}
      now={now}
      onDelete={id => remove.mutate(id)}
      showDate={showDate}
    />
  )

  return (
    <Container maxWidth='md' sx={{ py: 3 }}>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography level='h2' startDecorator={<MeetingRoomOutlined />}>
          AWS
        </Typography>
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 1.5 }}>
          <Typography
            level='title-lg'
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {moment(now).format('HH:mm')}
          </Typography>
          {shift && (
            <Chip color={SHIFT_COLORS[shift]} size='lg' variant='solid'>
              {shift} Shift · Day {shiftDay}
            </Chip>
          )}
        </Box>
      </Box>

      {adding ? (
        <AddLine
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      ) : (
        <Button
          startDecorator={<Add />}
          onClick={() => setAdding(true)}
          sx={{ mb: 3 }}
        >
          Add AWS Event
        </Button>
      )}

      {(error || isError) && (
        <Typography color='danger' level='body-sm' sx={{ mb: 2 }}>
          {error || 'Could not load AWS events. Retrying…'}
        </Typography>
      )}

      {[1, 2].map(day => (
        <Group
          key={day}
          title={`This shift · Day ${day}${
            bounds
              ? ` · ${moment(bounds.start)
                  .add(day - 1, 'day')
                  .format('ddd D MMM')}`
              : ''
          }`}
          today={day === shiftDay}
        >
          {byDay[day - 1].length ? (
            byDay[day - 1].map(e => line(e))
          ) : (
            <Typography
              level='body-sm'
              sx={{ color: 'text.tertiary', px: 1.5, py: 1 }}
            >
              {isLoading ? 'Loading…' : 'No events'}
            </Typography>
          )}
        </Group>
      ))}

      {later.length > 0 && (
        <Group title='Later shifts'>{later.map(e => line(e, true))}</Group>
      )}

      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
        Events show on the wall display during their shift and are struck
        through once they end. Completed events clear out at shift change.
      </Typography>
    </Container>
  )
}

export default AWS
