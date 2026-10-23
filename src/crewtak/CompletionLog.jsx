import { Download, OpenInNew, Print } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Container,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Sheet,
  Table,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useChores, useChoresHistory } from '@/queries/ChoreQueries'
import { useCircleMembers } from '@/queries/UserQueries'

import { SHIFT_COLORS, SHIFT_NAMES, shiftAt, shiftBoundsAt } from './shifts'

// Station-wide record of who completed (or skipped) which task, and when.
// Each entry is tagged with the crew that was on duty at that moment.

const STATUS = {
  1: { label: 'Done', color: 'success' },
  2: { label: 'Skipped', color: 'warning' },
}

const RANGES = [
  { value: 'shift', label: 'This shift' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom dates' },
]

const rangeBounds = (range, from, to) => {
  const now = moment()
  switch (range) {
    case 'shift': {
      const b = shiftBoundsAt(new Date())
      return { start: moment(b.start), end: now }
    }
    case 'today':
      return { start: moment().startOf('day'), end: now }
    case 'custom':
      return {
        start: from
          ? moment(from).startOf('day')
          : moment().subtract(7, 'days'),
        end: to ? moment(to).endOf('day') : now,
      }
    default:
      return {
        start: moment().subtract(Number(range), 'days').startOf('day'),
        end: now,
      }
  }
}

// Note text with paragraph and line breaks kept, for the detail popup.
const htmlToText = html =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const stripHtml = html =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Time spent from the task's start/pause timer, as HH:MM:SS.
const formatDuration = seconds => {
  if (typeof seconds !== 'number' || !(seconds > 0)) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

// Start time, with the day added when the task ran past midnight.
const startLabel = (start, end, dayFormat) =>
  !start
    ? ''
    : start.isSame(end, 'day')
      ? start.format('HH:mm')
      : start.format(`${dayFormat} HH:mm`)

const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`

const CompletionLog = () => {
  const [range, setRange] = useState('7')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [person, setPerson] = useState('all')
  const [shift, setShift] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(null)

  const { end, start } = rangeBounds(range, from, to)
  // The history endpoint takes "days back from now".
  const daysBack = Math.max(
    1,
    Math.ceil(moment().diff(start, 'days', true)) + 1,
  )
  const {
    data: history,
    handleLimitChange,
    isLoading,
  } = useChoresHistory(daysBack, true)
  // The hook keeps its own day count; keep it in step with the period.
  useEffect(() => {
    handleLimitChange(daysBack)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysBack])

  const { data: choresData } = useChores(true)
  const { data: membersData } = useCircleMembers()

  const members = membersData?.res || []
  const memberName = useMemo(() => {
    const map = new Map(members.map(m => [m.userId, m.displayName]))
    return id => map.get(id) || '—'
  }, [members])

  const choreName = useMemo(() => {
    const map = new Map((choresData?.res || []).map(c => [c.id, c.name]))
    return id => map.get(id) || 'Deleted task'
  }, [choresData])

  const rows = useMemo(
    () =>
      (history || [])
        .filter(h => STATUS[h.status] && h.performedAt)
        .map(h => {
          const at = moment(h.performedAt)
          return {
            id: h.id,
            choreId: h.choreId,
            at,
            task: choreName(h.choreId),
            by: memberName(h.completedBy),
            byId: h.completedBy,
            shift: shiftAt(at.toDate()),
            status: h.status,
            notes: stripHtml(h.notes),
            notesFull: htmlToText(h.notes),
            duration: formatDuration(h.duration),
            // Start = end - timer duration; blank when the timer wasn't used.
            start:
              h.duration > 0
                ? moment(at).subtract(h.duration, 'seconds')
                : null,
          }
        })
        .filter(r => r.at.isSameOrAfter(start) && r.at.isSameOrBefore(end))
        .filter(r => person === 'all' || r.byId === person)
        .filter(r => shift === 'all' || r.shift === shift)
        .filter(r => status === 'all' || String(r.status) === status)
        .sort((a, b) => b.at.valueOf() - a.at.valueOf()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      history,
      choreName,
      memberName,
      person,
      shift,
      status,
      start.valueOf(),
      end.valueOf(),
    ],
  )

  const rangeText = `${start.format('ddd D MMM YYYY HH:mm')} – ${end.format('ddd D MMM YYYY HH:mm')}`

  const exportCsv = () => {
    const header = [
      'Date',
      'Start',
      'End',
      'Duration',
      'Task',
      'Completed by',
      'Shift',
      'Status',
      'Notes',
    ]
    const lines = rows.map(r =>
      [
        r.at.format('YYYY-MM-DD'),
        startLabel(r.start, r.at, 'YYYY-MM-DD'),
        r.at.format('HH:mm'),
        r.duration,
        r.task,
        r.by,
        r.shift,
        STATUS[r.status].label,
        r.notesFull,
      ]
        .map(csvCell)
        .join(','),
    )
    const blob = new Blob(
      [[header.map(csvCell).join(','), ...lines].join('\n')],
      {
        type: 'text/csv;charset=utf-8',
      },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crewtak-log-${start.format('YYYYMMDD')}-${end.format('YYYYMMDD')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Container
      maxWidth='lg'
      sx={{
        px: { xs: 2, sm: 3 },
        pt: { xs: 1, sm: 2 },
        pb: 6,
        '@media print': {
          maxWidth: '100% !important',
          p: 0,
          '& .no-print': { display: 'none !important' },
        },
      }}
    >
      <Box
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography level='h2'>Completion log</Typography>
          <Typography level='body-sm' textColor='text.tertiary'>
            {rangeText} · {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
          </Typography>
        </Box>
        <Box className='no-print' sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<Download />}
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            CSV
          </Button>
          <Button
            variant='solid'
            startDecorator={<Print />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Box>

      <Sheet
        className='no-print'
        variant='outlined'
        sx={{
          borderRadius: 'lg',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr 1fr',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          mb: 2,
          p: 2,
        }}
      >
        <FormControl>
          <FormLabel>Period</FormLabel>
          <Select value={range} onChange={(_, v) => v && setRange(v)}>
            {RANGES.map(r => (
              <Option key={r.value} value={r.value}>
                {r.label}
              </Option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Person</FormLabel>
          <Select value={person} onChange={(_, v) => v != null && setPerson(v)}>
            <Option value='all'>Everyone</Option>
            {members.map(m => (
              <Option key={m.userId} value={m.userId}>
                {m.displayName}
              </Option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Shift</FormLabel>
          <Select value={shift} onChange={(_, v) => v && setShift(v)}>
            <Option value='all'>All shifts</Option>
            {SHIFT_NAMES.map(s => (
              <Option key={s} value={s}>
                {s} Shift
              </Option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Status</FormLabel>
          <Select value={status} onChange={(_, v) => v && setStatus(v)}>
            <Option value='all'>Done and skipped</Option>
            <Option value='1'>Done</Option>
            <Option value='2'>Skipped</Option>
          </Select>
        </FormControl>
        {range === 'custom' && (
          <>
            <FormControl>
              <FormLabel>From</FormLabel>
              <Input
                type='date'
                value={from}
                onChange={e => setFrom(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>To</FormLabel>
              <Input
                type='date'
                value={to}
                onChange={e => setTo(e.target.value)}
              />
            </FormControl>
          </>
        )}
      </Sheet>

      <Sheet
        variant='outlined'
        sx={{
          borderRadius: 'lg',
          overflow: 'auto',
          '@media print': { border: 0 },
        }}
      >
        <Table
          stickyHeader
          hoverRow
          sx={{
            '--TableCell-paddingX': '12px',
            minWidth: 640,
            '& th': { fontWeight: 700 },
            '@media print': { fontSize: '10pt', minWidth: 0 },
          }}
        >
          <thead>
            <tr>
              <th style={{ width: 110 }}>Date</th>
              <th style={{ width: 64 }}>Start</th>
              <th style={{ width: 64 }}>End</th>
              <th style={{ width: 84 }}>Duration</th>
              <th>Task</th>
              <th style={{ width: 130 }}>Completed by</th>
              <th style={{ width: 60 }}>Shift</th>
              <th style={{ width: 84 }}>Status</th>
              <th style={{ width: '22%' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                style={{ cursor: 'pointer' }}
              >
                <td>{r.at.format('ddd D MMM')}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {startLabel(r.start, r.at, 'ddd')}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.at.format('HH:mm')}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.duration || '—'}
                </td>
                <td>
                  <Typography level='body-sm' fontWeight='md'>
                    {r.task}
                  </Typography>
                </td>
                <td>{r.by}</td>
                <td>
                  <Chip size='sm' variant='soft' color={SHIFT_COLORS[r.shift]}>
                    {r.shift}
                  </Chip>
                </td>
                <td>
                  <Chip size='sm' variant='soft' color={STATUS[r.status].color}>
                    {STATUS[r.status].label}
                  </Chip>
                </td>
                <td>
                  <Typography
                    level='body-sm'
                    textColor='text.secondary'
                    noWrap
                    title={r.notes}
                  >
                    {r.notes}
                  </Typography>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <Typography
                    level='body-sm'
                    textColor='text.tertiary'
                    sx={{ py: 3, textAlign: 'center' }}
                  >
                    No entries for this period.
                  </Typography>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Sheet>

      <LogEntryDialog entry={selected} onClose={() => setSelected(null)} />
    </Container>
  )
}

// Full details for one log entry, including the whole note.
const Detail = ({ children, label }) => (
  <Box>
    <Typography level='body-xs' textColor='text.tertiary'>
      {label}
    </Typography>
    <Typography level='body-md' sx={{ fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </Typography>
  </Box>
)

const LogEntryDialog = ({ entry, onClose }) => {
  const navigate = useNavigate()
  return (
    <Modal open={Boolean(entry)} onClose={onClose}>
      <ModalDialog sx={{ width: 'min(560px, 94vw)' }}>
        <ModalClose />
        {entry && (
          <>
            <DialogTitle sx={{ pr: 4 }}>{entry.task}</DialogTitle>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip size='sm' variant='soft' color={STATUS[entry.status].color}>
                {STATUS[entry.status].label}
              </Chip>
              <Chip size='sm' variant='soft' color={SHIFT_COLORS[entry.shift]}>
                {entry.shift} Shift
              </Chip>
            </Box>
            <DialogContent>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  mt: 1,
                }}
              >
                <Detail label='Completed by'>{entry.by}</Detail>
                <Detail label='Date'>
                  {entry.at.format('dddd D MMMM YYYY')}
                </Detail>
                <Detail label='Start'>
                  {entry.start ? entry.start.format('ddd D MMM HH:mm') : '—'}
                </Detail>
                <Detail label='End'>
                  {entry.at.format('ddd D MMM HH:mm')}
                </Detail>
                <Detail label='Duration'>{entry.duration || '—'}</Detail>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography level='body-xs' textColor='text.tertiary'>
                Notes
              </Typography>
              <Typography
                level='body-md'
                sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {entry.notesFull || 'No notes.'}
              </Typography>
            </DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                variant='plain'
                startDecorator={<OpenInNew />}
                onClick={() => navigate(`/tasks/${entry.choreId}`)}
                disabled={!entry.choreId}
              >
                Open task
              </Button>
            </Box>
          </>
        )}
      </ModalDialog>
    </Modal>
  )
}

Detail.propTypes = { children: PropTypes.node, label: PropTypes.string }
LogEntryDialog.propTypes = { entry: PropTypes.object, onClose: PropTypes.func }

export default CompletionLog
