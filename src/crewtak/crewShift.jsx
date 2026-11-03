import { Typography } from '@mui/joy'
import PropTypes from 'prop-types'

import { SHIFT_COLORS } from './shifts'

// CrewTAK crew groups: which shift (A/B/C) a person works, or Ops / Chief.
// Stored on the user as crewShift; set from Settings → Crew Users. Shown in
// small coloured text under the person's name, using the same colour as that
// shift's badge everywhere else (A blue, B orange, C green).

export const CREW_SHIFTS = [
  { value: 'A', label: 'A Shift', color: SHIFT_COLORS.A },
  { value: 'B', label: 'B Shift', color: SHIFT_COLORS.B },
  { value: 'C', label: 'C Shift', color: SHIFT_COLORS.C },
  { value: 'OPS', label: 'Ops', color: 'neutral' },
  { value: 'CHIEF', label: 'Chief', color: 'danger' },
]

export const crewShiftInfo = value =>
  CREW_SHIFTS.find(s => s.value === (value || '').toUpperCase()) || null

export const crewShiftLabel = value => crewShiftInfo(value)?.label || ''

// The small coloured "C Shift" line under a name. Renders nothing when unset.
export const CrewShiftTag = ({ shift, level = 'body-xs', sx }) => {
  const info = crewShiftInfo(shift)
  if (!info) return null
  return (
    <Typography
      level={level}
      textColor={`${info.color}.plainColor`}
      data-testid='crew-shift'
      sx={{ fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.3, ...sx }}
    >
      {info.label}
    </Typography>
  )
}

CrewShiftTag.propTypes = {
  level: PropTypes.string,
  shift: PropTypes.string,
  sx: PropTypes.object,
}
