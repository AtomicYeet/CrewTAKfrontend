import { Box } from '@mui/joy'
import PropTypes from 'prop-types'

import { ACCENT } from './brand'

// "Crew" in the current text colour, "TAK" in the orange accent.
const Wordmark = ({ sx }) => (
  <Box
    component='span'
    dir='ltr'
    sx={{ display: 'inline-flex', alignItems: 'baseline', ...sx }}
  >
    Crew
    <Box component='span' sx={{ color: ACCENT }}>
      TAK
    </Box>
  </Box>
)

Wordmark.propTypes = { sx: PropTypes.object }

export default Wordmark
