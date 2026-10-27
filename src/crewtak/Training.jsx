import { SchoolOutlined } from '@mui/icons-material'
import { Container, Sheet, Typography } from '@mui/joy'

// Training: placeholder page, to be built out later.
const Training = () => (
  <Container maxWidth='md' sx={{ py: 3 }}>
    <Typography level='h2' sx={{ mb: 3 }}>
      Training
    </Typography>
    <Sheet
      variant='outlined'
      sx={{
        alignItems: 'center',
        borderRadius: 'lg',
        color: 'text.tertiary',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        py: 6,
        textAlign: 'center',
      }}
    >
      <SchoolOutlined sx={{ fontSize: 48, opacity: 0.6 }} />
      <Typography level='title-md' sx={{ color: 'text.secondary' }}>
        Nothing here yet
      </Typography>
      <Typography level='body-sm'>Training is coming soon.</Typography>
    </Sheet>
  </Container>
)

export default Training
