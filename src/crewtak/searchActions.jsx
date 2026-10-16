import { FactCheckOutlined, TvOutlined } from '@mui/icons-material'

import { isHiddenRoute } from './features'

// Extra search-palette destinations for the CrewTAK pages.
export const CREWTAK_ACTIONS = [
  {
    id: 'action:log',
    provider: 'actions',
    title: 'Open completion log',
    subtitle: 'Navigation',
    keywords: 'log completion history record shift who done print',
    route: '/log',
    icon: <FactCheckOutlined />,
  },
  {
    id: 'action:display',
    provider: 'actions',
    title: 'Open wall display',
    subtitle: 'Navigation',
    keywords: 'wall display tv kiosk board screen',
    route: '/display',
    icon: <TvOutlined />,
  },
]

// Drops actions that lead to hidden features.
export const crewtakVisible = action =>
  !action.route || !isHiddenRoute(action.route.split('?')[0])
