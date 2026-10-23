import { EventRepeat } from '@mui/icons-material'
import { Box, Chip, Typography } from '@mui/joy'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'

import { getRecurrentChipText } from '@/utils/ChoreCardHelpers'

// A future repeat of a task, shown on the timeline/calendar for planning.
// It's a preview: you can't complete it from here. Tapping it opens the real
// task (which is always the current, earliest occurrence).
const ProjectedChoreCard = ({ chore, performers = [] }) => {
  const navigate = useNavigate()
  const due = moment(chore.nextDueDate)
  const endOfDay =
    due.hours() === 23 && due.minutes() === 59 && due.seconds() === 59
  const when = endOfDay
    ? due.format('ddd, MMM D')
    : due.format('ddd, MMM D · h:mm A')

  const assignee =
    chore.assignedTo == null
      ? 'Anyone'
      : performers.find(p => p.userId === chore.assignedTo)?.displayName ||
        'Assigned'

  let repeatText = ''
  try {
    repeatText = getRecurrentChipText(chore)
  } catch {
    repeatText = ''
  }

  return (
    <Box
      role='button'
      tabIndex={0}
      onClick={() => navigate(`/tasks/${chore.id}`)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/tasks/${chore.id}`)
        }
      }}
      title='Upcoming repeat (opens the task)'
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        mb: 0.5,
        borderRadius: 'md',
        border: '1px dashed',
        borderColor: 'neutral.outlinedBorder',
        bgcolor: 'background.surface',
        opacity: 0.72,
        cursor: 'pointer',
        '&:hover': { opacity: 1, bgcolor: 'background.level1' },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'neutral.softBg',
          color: 'text.tertiary',
        }}
      >
        <EventRepeat sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          level='body-md'
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {chore.name}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {[repeatText, assignee].filter(Boolean).join(' • ')}
        </Typography>
      </Box>
      <Chip size='sm' variant='outlined' color='neutral'>
        {when}
      </Chip>
    </Box>
  )
}

ProjectedChoreCard.propTypes = {
  chore: PropTypes.object.isRequired,
  performers: PropTypes.array,
}

export default ProjectedChoreCard
