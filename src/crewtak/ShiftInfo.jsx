import {
  LocalFireDepartment,
  PhoneInTalk,
  RestaurantMenu,
  Visibility,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  Container,
  FormHelperText,
  Input,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  Sheet,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'

import { ACCENT } from './brand'
import { useShiftPicker } from './ShiftPicker'
import {
  COMPANIES,
  DINNER_NOTE_MAX,
  dinnerNoteSlot,
  dinnerPrefix,
  pairMembers,
  PHONES,
  rigMembers,
  SHIFT_DAYS,
  SLEEP_BLOCKS,
  sleepSlot,
  tourAt,
} from './shiftSlots'
import { SHIFT_COLORS, shiftAt, shiftDayAt } from './shifts'

// Shift Info: who carries each station phone this tour, who has each overnight
// watch time on Day 1 and Day 2, which company each person rides, and the
// dinner plan for each day. See shiftSlots.js for how picks are stored and
// reset.

// Re-render every minute so the tour and shift day roll over on their own.
const useMinuteClock = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

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
          gridTemplateColumns: 'minmax(110px, 170px) 24px 1fr',
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

// "Day 1" / "Day 2" heading, with a Today chip on the current shift day.
const DayHeading = ({ day, today }) => (
  <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, px: 1.5, pt: 0.5 }}>
    <Typography level='h4'>Day {day}</Typography>
    {today && (
      <Chip color='primary' size='sm' variant='soft'>
        Today
      </Chip>
    )}
  </Box>
)

DayHeading.propTypes = {
  day: PropTypes.number.isRequired,
  today: PropTypes.bool,
}

// What's for dinner. Saves when the box loses focus or on Enter; picks up
// other people's edits while it isn't being typed in.
const DinnerNote = ({ day, onSave, value }) => {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const save = () => {
    setEditing(false)
    if (draft.trim() !== value.trim()) onSave(draft.trim())
  }

  return (
    <Box sx={{ px: 1.5, pb: 1 }}>
      <Input
        aria-label={`Day ${day} dinner description`}
        placeholder="What's for dinner?"
        value={draft}
        onFocus={() => setEditing(true)}
        onChange={e => setDraft(e.target.value.slice(0, DINNER_NOTE_MAX))}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') e.target.blur()
        }}
        slotProps={{ input: { maxLength: DINNER_NOTE_MAX } }}
      />
      <FormHelperText sx={{ justifyContent: 'flex-end' }}>
        {draft.length}/{DINNER_NOTE_MAX}
      </FormHelperText>
    </Box>
  )
}

DinnerNote.propTypes = {
  day: PropTypes.number.isRequired,
  onSave: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
}

const ShiftInfo = () => {
  const now = useMinuteClock()

  const shift = shiftAt(now)
  const shiftDay = shiftDayAt(now)
  const tour = tourAt(now)

  const {
    error,
    isError,
    nameById,
    nameFor,
    openPicker: setPicking,
    picker,
    save,
    slots,
  } = useShiftPicker(tour)

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
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            justifyContent: 'flex-end',
          }}
        >
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              level='title-lg'
              sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}
            >
              {moment(now).format('HH:mm')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {moment(now).format('dddd D MMMM YYYY')}
            </Typography>
          </Box>
          {shift && (
            <Chip color={SHIFT_COLORS[shift]} size='lg' variant='solid'>
              {shift} Shift · Day {shiftDay}
            </Chip>
          )}
        </Box>
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
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
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
        startDecorator={<Visibility sx={{ fontSize: 18 }} />}
        sx={{ letterSpacing: '0.08em', mb: 1, textTransform: 'uppercase' }}
      >
        Watch Times
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {SHIFT_DAYS.map(day => (
          <Sheet
            key={day}
            data-testid={`watch-day-${day}`}
            variant='outlined'
            sx={{ borderRadius: 'lg', p: 1.5 }}
          >
            <DayHeading day={day} today={day === shiftDay} />
            <List size='lg' sx={{ '--ListItem-paddingX': '0px' }}>
              {SLEEP_BLOCKS.map(b => {
                const slot = sleepSlot(day, b.index)
                return (
                  <SleepRow
                    key={slot}
                    label={b.label}
                    name={nameFor(slot)}
                    onClick={() =>
                      setPicking({ slot, title: `Day ${day} watch ${b.label}` })
                    }
                  />
                )
              })}
            </List>
          </Sheet>
        ))}
      </Box>

      <Typography
        level='title-sm'
        startDecorator={<LocalFireDepartment sx={{ fontSize: 18 }} />}
        sx={{
          letterSpacing: '0.08em',
          mb: 1,
          mt: 4,
          textTransform: 'uppercase',
        }}
      >
        Company Assignments
      </Typography>
      <Sheet variant='outlined' sx={{ borderRadius: 'lg', p: 1.5 }}>
        <List size='lg' sx={{ '--ListItem-paddingX': '0px' }}>
          {COMPANIES.map(co => {
            const names = rigMembers(slots, co)
              .map(id => nameById.get(id) || 'Former member')
              .join(', ')
            return (
              <SleepRow
                key={co.slot}
                label={co.label}
                name={names || null}
                onClick={() =>
                  setPicking({
                    hint: 'Tap everyone on this rig. People can be on more than one rig.',
                    prefix: co.slot,
                    title: co.label,
                  })
                }
              />
            )
          })}
        </List>
      </Sheet>

      <Typography
        level='title-sm'
        startDecorator={<RestaurantMenu sx={{ fontSize: 18 }} />}
        sx={{
          letterSpacing: '0.08em',
          mb: 1,
          mt: 4,
          textTransform: 'uppercase',
        }}
      >
        Dinner Plans
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {SHIFT_DAYS.map(day => {
          const prefix = dinnerPrefix(day)
          const cooks = pairMembers(slots, prefix)
            .map(id => nameById.get(id) || 'Former member')
            .join(', ')
          return (
            <Sheet
              key={day}
              data-testid={`dinner-day-${day}`}
              variant='outlined'
              sx={{ borderRadius: 'lg', p: 1.5 }}
            >
              <DayHeading day={day} today={day === shiftDay} />
              <List size='lg' sx={{ '--ListItem-paddingX': '0px' }}>
                <SleepRow
                  label='Cooking'
                  name={cooks || null}
                  onClick={() =>
                    setPicking({
                      hint: "Tap everyone cooking. Pick as many as you need.",
                      prefix,
                      title: `Day ${day} dinner`,
                    })
                  }
                />
              </List>
              <DinnerNote
                day={day}
                value={slots[dinnerNoteSlot(day)] || ''}
                onSave={note => save({ note, slot: dinnerNoteSlot(day) })}
              />
            </Sheet>
          )
        })}
      </Box>

      {picker}
    </Container>
  )
}

export default ShiftInfo
