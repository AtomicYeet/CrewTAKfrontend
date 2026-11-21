import { Chip, Container, Sheet, Stack, Typography } from '@mui/joy'

// Shared "work in progress" page for CrewTAK modules that are on the side nav
// but not built yet (Schedule, Live Map, Fire Extinguishers).
const ModulePlaceholder = ({ title, icon: Icon, message, children }) => (
  <Container maxWidth='md' sx={{ py: 3 }}>
    <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 3 }}>
      <Typography level='h2'>{title}</Typography>
      <Chip size='sm' variant='soft' color='warning'>
        WIP
      </Chip>
    </Stack>
    <Sheet
      variant='outlined'
      sx={{
        alignItems: 'center',
        borderRadius: 'lg',
        color: 'text.tertiary',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        px: 2,
        py: 6,
        textAlign: 'center',
      }}
    >
      {Icon && <Icon sx={{ fontSize: 48, opacity: 0.6 }} />}
      <Typography level='title-md' sx={{ color: 'text.secondary' }}>
        Nothing here yet
      </Typography>
      <Typography level='body-sm'>{message}</Typography>
      {children}
    </Sheet>
  </Container>
)

export default ModulePlaceholder
