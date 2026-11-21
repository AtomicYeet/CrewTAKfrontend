import { MapOutlined } from '@mui/icons-material'

import ModulePlaceholder from './ModulePlaceholder'

// Live Map module (/map): work in progress.
// Planned: live ADS-B air traffic around KATW plus weather overlays.
const LiveMap = () => (
  <ModulePlaceholder
    title='Live Map'
    icon={MapOutlined}
    message='Live air traffic (ADS-B) and weather overlays are coming soon.'
  />
)

export default LiveMap
