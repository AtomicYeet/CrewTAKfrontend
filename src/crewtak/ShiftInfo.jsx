import { Bedtime, CheckRounded, PhoneInTalk } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Chip,
  Container,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Modal,
  ModalClose,
  ModalDialog,
  Sheet,
  Typography,
} from '@mui/joy'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'

import { useCircleMembers } from '@/queries/UserQueries'
import { apiClient } from '@/utils/ApiClient'

import { ACCENT } from './brand'
import { SHIFT_COLORS, shiftAt, shiftBoundsAt, shiftDayAt } from './shifts'

// Shift Info: who carries each station phone this tour, and who has each
// overnight sleep block. Picks are stored on the server per crew and per
// 48-hour tour, so every device sees the same thing and a new tour starts
// blank.

const PHONES = [
  { slot: 'phone.captain', label: "Captain's" },
  { slot: 'phone.ff1', label: 'Firefighter 1' },
  { slot: 'phone.ff2', label: 'Firefighter 2' },
]

const SLEEP_BLOCKS = [
  { index: 0, label: '8p – 1130p' },
  { index: 1, label: '1130p – 3a' },
  { index: 2, label: '3a – 7a' },
]

const REFRESH_MS = 60 * 1000

const fetchSlots = async tour => {
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

const saveSlot = async ({ tour, slot, userId }) => {
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

// Re-render every minute so the tour and shift day roll over on their own.
const useMinuteClock = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const initials = name =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')

const PhoneBox = ({ label, name, onClick }) => (
  <Sheet
    component='button'
    type='button'
    onClick={onClick}
    variant='outlined'
    sx={{
      alignItems: 'flex-start',
      borderRadius: 'lg',
      borderTop: `4px solid ${ACCENT}`,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      font: 'inherit',
      gap: 1,
      minHeight: 120,
      p: 2,
      textAlign: 'left',
      transition: 'background-color 120ms, box-shadow 120ms',
      width: '100%',
      '&:hover': { bgcolor: 'background.level1', boxShadow: 'sm' },
      '&:focus-visible': {
        outline: '2px solid',
        outlineColor: 'primary.500',
        outlineOffset: 2,
      },
    }}
  >
    <Typography
      level='body-xs'
      startDecorator={<PhoneInTalk sx={{ fontSize: 16 }} />}
      sx={{ fontWeight: 'lg', letterSpacing: '0.06em', textTransform: 'uppercase' }}
    >
      {label}
    </Typography>
    {name ? (
      <Typography level='h3' sx={{ lineHeight: 1.15 }}>
        {name}
      </Typography>
    ) : (
      <Typography level='title-md' sx={{ color: 'text.tertiary' }}>
        Tap to assign
      </Typography>
    )}
  </Sheet>
)

PhoneBox.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string,
  onClick: PropTypes.func.isRequired,
}

const SleepRow = ({ label, name, onClick }) => (
  <ListItem>
    <ListItemButton onClick={onClick} sx={{ borderRadius: 'md', py: 1.5 }}>
      <ListItemContent
        sx={{
          alignItems: 'center',
          display: 'grid',
          gap: 2,
          gridTemplateColumns: 'minmax(110px, 140px) 24px 1fr',
        }}
      >
        <Typography level='title-md' sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {label}
        </Typography>
        <Typography sx={{ color: 'text.tertiary' }}>→</Typography>
        {name ? (
          <Typography level='title-lg'>{name}</Typography>
        ) : (
          <Typography level='body-md' sx={{ color: 'text.tertiary' }}>
            Tap to assign
          </Typography>
        )}
      </ListItemContent>
    </ListItemButton>
  </ListItem>
)

SleepRow.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string,
  onClick: PropTypes.func.isRequired,
}

const ShiftInfo = () => {
  const now = useMinuteClock()
  const queryClient = useQueryClient()
  const { data: membersData } = useCircleMembers()

  const shift = shiftAt(now)
  const shiftDay = shiftDayAt(now)
  const bounds = shiftBoundsAt(now)
  const tour = bounds ? moment(bounds.start).format('YYYY-MM-DD') : null

  const members = useMemo(
    () =>
      [...(membersData?.res || [])].sort((a, b) =>
        (a.displayName || a.username || '').localeCompare(
          b.displayName || b.username || '',
        ),
      ),
    [membersData],
  )
  const nameById = useMemo(() => {
    const map = new Map()
    members.forEach(m => map.set(m.userId, m.displayName || m.username))
    return map
  }, [members])

  const queryKey = ['crewtakShiftInfo', tour]
  const { data: slots = {}, isError } = useQuery({
    queryKey,
    queryFn: () => fetchSlots(tour),
    enabled: Boolean(tour),
    refetchInterval: REFRESH_MS,
  })

  const [error, setError] = useState(null)
  const mutation = useMutation({
    mutationFn: saveSlot,
    onMutate: async ({ slot, userId }) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, old => ({ ...old, [slot]: userId }))
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous)
      setError(err.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  // The slot whose picker is open: { slot, title }.
  const [picking, setPicking] = useState(null)

  const assign = userId => {
    if (!picking || !tour) return
    mutation.mutate({ tour, slot: picking.slot, userId })
    setPicking(null)
  }

  const nameFor = slot => {
    const id = slots[slot]
    if (id == null) return null
    return nameById.get(id) || 'Former member'
  }

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
        <Typography level='h2'>Shift Info</Typography>
        {shift && (
          <Chip color={SHIFT_COLORS[shift]} size='lg' variant='solid'>
            {shift} Shift · Day {shiftDay}
          </Chip>
        )}
      </Box>

      {(error || isError) && (
        <Typography color='danger' level='body-sm' sx={{ mb: 2 }}>
          {error || 'Could not load shift info. Retrying…'}
        </Typography>
      )}

      <Typography
        level='title-sm'
        sx={{ letterSpacing: '0.08em', mb: 1.5, textTransform: 'uppercase' }}
      >
        Phone Assignments
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          mb: 4,
        }}
      >
        {PHONES.map(p => (
          <PhoneBox
            key={p.slot}
            label={p.label}
            name={nameFor(p.slot)}
            onClick={() =>
              setPicking({ slot: p.slot, title: `${p.label} phone` })
            }
          />
        ))}
      </Box>

      <Typography
        level='title-sm'
        startDecorator={<Bedtime sx={{ fontSize: 18 }} />}
        sx={{ letterSpacing: '0.08em', mb: 1, textTransform: 'uppercase' }}
      >
        Sleep Blocks
      </Typography>
      <Sheet variant='outlined' sx={{ borderRadius: 'lg', p: 1.5 }}>
        <Typography level='h4' sx={{ px: 1.5, pt: 0.5 }}>
          Shift Day {shiftDay ?? '—'}
        </Typography>
        <List size='lg' sx={{ '--ListItem-paddingX': '0px' }}>
          {SLEEP_BLOCKS.map(b => {
            const slot = `sleep.${shiftDay}.${b.index}`
            return (
              <SleepRow
                key={slot}
                label={b.label}
                name={nameFor(slot)}
                onClick={() =>
                  setPicking({ slot, title: `Sleep ${b.label}` })
                }
              />
            )
          })}
        </List>
      </Sheet>

      <Modal open={Boolean(picking)} onClose={() => setPicking(null)}>
        <ModalDialog sx={{ maxWidth: 420, width: '100%' }}>
          <ModalClose />
          <DialogTitle>{picking?.title}</DialogTitle>
          <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            {members.map(m => {
              const selected = picking && slots[picking.slot] === m.userId
              return (
                <ListItem key={m.userId}>
                  <ListItemButton
                    selected={selected}
                    onClick={() => assign(m.userId)}
                    sx={{ borderRadius: 'md' }}
                  >
                    <ListItemDecorator>
                      <Avatar size='sm' src={m.image || undefined}>
                        {initials(m.displayName || m.username)}
                      </Avatar>
                    </ListItemDecorator>
                    <ListItemContent>
                      {m.displayName || m.username}
                    </ListItemContent>
                    {selected && <CheckRounded color='primary' />}
                  </ListItemButton>
                </ListItem>
              )
            })}
            {picking && slots[picking.slot] != null && (
              <ListItem>
                <ListItemButton
                  color='danger'
                  onClick={() => assign(null)}
                  sx={{ borderRadius: 'md' }}
                >
                  Clear
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </ModalDialog>
      </Modal>
    </Container>
  )
}

export default ShiftInfo
