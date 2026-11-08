import { CheckRounded } from '@mui/icons-material'
import {
  Avatar,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Modal,
  ModalClose,
  ModalDialog,
  Typography,
} from '@mui/joy'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'

import { useCircleMembers } from '@/queries/UserQueries'

import { crewShiftRank, CrewShiftTag } from './crewShift'
import {
  applyPick,
  exclusiveGroup,
  pairSlot,
  PHONES,
  saveSlot,
  shiftInfoQueryKey,
  SLEEP_BLOCKS,
  useShiftSlots,
} from './shiftSlots'

// Shared by Shift Info (/shift) and the Wall Display (/display): loads the
// tour's picks, saves changes (with an instant optimistic update), and
// renders the "who gets this?" picker. Picks are stored on the server either
// way, so a change made on the board shows up on Shift Info and vice versa.

const initials = name =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')

const slotLabel = slot => {
  const phone = PHONES.find(p => p.slot === slot)
  if (phone) return `the ${phone.label} phone`
  const block = SLEEP_BLOCKS.find(b => slot.endsWith(`.${b.index}`))
  const day = slot.split('.')[1]
  return block ? `the Day ${day} ${block.label} watch` : 'another spot'
}

export const useCrewMembers = () => {
  const { data: membersData } = useCircleMembers()
  const members = useMemo(
    () =>
      [...(membersData?.res || [])]
        .filter(m => m.isActive !== false)
        // By shift (A, B, C, Ops, Chief, then no shift), then by name.
        .sort(
          (a, b) =>
            crewShiftRank(a.crewShift) - crewShiftRank(b.crewShift) ||
            (a.displayName || a.username || '').localeCompare(
              b.displayName || b.username || '',
            ),
        ),
    [membersData],
  )
  const nameById = useMemo(() => {
    const map = new Map()
    ;(membersData?.res || []).forEach(m =>
      map.set(m.userId, m.displayName || m.username),
    )
    return map
  }, [membersData])
  return { members, nameById }
}

const MemberRow = ({ hint, member, onClick, selected }) => (
  <ListItem>
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{ borderRadius: 'md' }}
    >
      <ListItemDecorator>
        <Avatar size='sm' src={member.image || undefined}>
          {initials(member.displayName || member.username)}
        </Avatar>
      </ListItemDecorator>
      <ListItemContent>
        {member.displayName || member.username}
        <CrewShiftTag shift={member.crewShift} />
        {hint && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {hint}
          </Typography>
        )}
      </ListItemContent>
      {selected && <CheckRounded color='primary' />}
    </ListItemButton>
  </ListItem>
)

MemberRow.propTypes = {
  hint: PropTypes.string,
  member: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  selected: PropTypes.bool,
}

// `dark` forces the dark colour scheme on the picker so it matches the wall
// display, whatever theme the rest of the app is using.
export const useShiftPicker = (tour, { dark = false } = {}) => {
  const queryClient = useQueryClient()
  const { members, nameById } = useCrewMembers()
  const queryKey = shiftInfoQueryKey(tour)
  const { data: slots = {}, isError } = useShiftSlots(tour)

  const [error, setError] = useState(null)
  const mutation = useMutation({
    mutationFn: saveSlot,
    onMutate: async ({ note, slot, userId }) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      // One phone per person: their old phone empties straight away.
      queryClient.setQueryData(queryKey, old =>
        applyPick(old || {}, slot, userId, note),
      )
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous)
      setError(err.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const save = vars => tour && mutation.mutate({ tour, ...vars })

  // The slot whose picker is open: { slot, title }, or for a multi-pick
  // (rig crew, dinner cooks) { prefix, hint, title }.
  const [picking, setPicking] = useState(null)
  const close = () => setPicking(null)

  const assign = userId => {
    if (!picking) return
    save({ slot: picking.slot, userId })
    close()
  }

  const nameFor = slot => {
    const id = slots[slot]
    if (id == null) return null
    return nameById.get(id) || 'Former member'
  }

  const picker = (
    <Modal
      open={Boolean(picking)}
      onClose={close}
      data-joy-color-scheme={dark ? 'dark' : undefined}
      // The wall display sits above the app at z-index 1300.
      sx={{ zIndex: 1400 }}
    >
      <ModalDialog sx={{ maxWidth: 420, width: '100%' }}>
        <ModalClose />
        <DialogTitle>{picking?.title}</DialogTitle>
        {picking?.hint && (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {picking.hint}
          </Typography>
        )}
        <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {picking?.prefix && (
            <>
              {members.map(m => {
                const slot = pairSlot(picking.prefix, m.userId)
                const on = slots[slot] === m.userId
                return (
                  <MemberRow
                    key={m.userId}
                    member={m}
                    selected={on}
                    onClick={() => save({ slot, userId: on ? null : m.userId })}
                  />
                )
              })}
              <ListItem>
                <ListItemButton
                  color='primary'
                  variant='soft'
                  onClick={close}
                  sx={{ borderRadius: 'md', justifyContent: 'center' }}
                >
                  Done
                </ListItemButton>
              </ListItem>
            </>
          )}
          {picking &&
            !picking.prefix &&
            members.map(m => {
              const selected = slots[picking.slot] === m.userId
              // Picking someone moves them off their current slot in the
              // same group (phone, watch time).
              const group = exclusiveGroup(picking.slot)
              const currentSlot =
                group &&
                !selected &&
                Object.keys(slots).find(
                  k => k.startsWith(group) && slots[k] === m.userId,
                )
              return (
                <MemberRow
                  key={m.userId}
                  member={m}
                  selected={selected}
                  hint={
                    currentSlot
                      ? `Has ${slotLabel(currentSlot)}`
                      : undefined
                  }
                  onClick={() => assign(m.userId)}
                />
              )
            })}
          {picking && !picking.prefix && slots[picking.slot] != null && (
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
  )

  return {
    error,
    isError,
    nameById,
    nameFor,
    openPicker: setPicking,
    picker,
    save,
    slots,
  }
}
