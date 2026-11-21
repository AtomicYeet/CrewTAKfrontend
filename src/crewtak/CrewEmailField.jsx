import { CloseRounded, MailOutlineRounded } from '@mui/icons-material'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  Input,
  Link,
  Typography,
} from '@mui/joy'
import { useState } from 'react'

import {
  CREW_EMAIL_HINT,
  isValidCrewEmail,
  normalizeCrewEmail,
} from './crewEmail'

// Email line on each row of Settings → Crew Users. Shows the address (or
// "Add email"); tap to edit in place. Optional: saving an empty box removes
// it. onSave(email) resolves true when the server accepted it.
const CrewEmailField = ({ email, name, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const start = () => {
    setValue(email || '')
    setError(null)
    setEditing(true)
  }

  const save = async () => {
    const next = normalizeCrewEmail(value)
    if (!isValidCrewEmail(next)) {
      setError("That doesn't look like a valid email address")
      return
    }
    if (next === (email || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(next)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (!editing) {
    return (
      <Box
        sx={{ alignItems: 'center', display: 'flex', gap: 0.5, minWidth: 0 }}
      >
        <MailOutlineRounded
          sx={{ color: 'text.tertiary', flexShrink: 0, fontSize: 16 }}
        />
        <Link
          component='button'
          type='button'
          level='body-sm'
          underline='hover'
          color={email ? 'neutral' : 'primary'}
          onClick={start}
          aria-label={`${email ? 'Change' : 'Add'} email: ${name}`}
          data-testid='crew-email-link'
          sx={{
            minWidth: 0,
            overflow: 'hidden',
            textAlign: 'start',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email || 'Add email'}
        </Link>
      </Box>
    )
  }

  return (
    <FormControl error={!!error} sx={{ my: 0.5, maxWidth: 420 }}>
      <Box sx={{ alignItems: 'center', display: 'flex', gap: 0.75 }}>
        <Input
          size='sm'
          type='email'
          autoFocus
          autoComplete='off'
          placeholder='name@example.com'
          value={value}
          onChange={e => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              save()
            } else if (e.key === 'Escape') {
              setEditing(false)
            }
          }}
          slotProps={{ input: { 'aria-label': `Email: ${name}` } }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Button size='sm' loading={saving} onClick={save}>
          Save
        </Button>
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          aria-label='Cancel'
          disabled={saving}
          onClick={() => setEditing(false)}
        >
          <CloseRounded />
        </IconButton>
      </Box>
      <FormHelperText>
        {error || (
          <Typography level='body-xs' textColor='text.tertiary'>
            {CREW_EMAIL_HINT} Leave empty to remove.
          </Typography>
        )}
      </FormHelperText>
    </FormControl>
  )
}

export default CrewEmailField
