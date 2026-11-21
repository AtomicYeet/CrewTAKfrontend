import { CalendarMonthOutlined } from '@mui/icons-material'

import ModulePlaceholder from './ModulePlaceholder'

// Schedule module (/schedule): work in progress.
// Deliberately separate from tasks / chores and their due dates and repeats,
// and from the live shift data (Shift Info, AWS, phone hand-offs). It will get
// its own data when it's built out.
const Schedule = () => (
  <ModulePlaceholder
    title='Schedule'
    icon={CalendarMonthOutlined}
    message='The schedule is coming soon.'
  />
)

export default Schedule
