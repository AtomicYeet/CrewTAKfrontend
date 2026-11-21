import {
  DarkModeOutlined,
  GroupAdd,
  LightModeOutlined,
  Logout,
  Settings,
  Tune,
  WorkspacePremium,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Divider,
  Dropdown,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Typography,
  useColorScheme,
} from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import useStickyState from '../hooks/useStickyState'
import { CrewShiftTag } from '../crewtak/crewShift'
import { HIDE } from '../crewtak/features'
import { useCrewAdmin } from '../crewtak/useCrewAdmin'
import { useUserProfile } from '../queries/UserQueries'
import { apiClient } from '../utils/ApiClient'
import { isPlusAccount, resolvePhotoURL } from '../utils/Helpers'
import SubscriptionModal from './SubscriptionModal'

const UserProfileAvatar = ({ showDetails = false }) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { mode, setMode } = useColorScheme()
  const { data: userProfile } = useUserProfile()
  // CrewTAK: crew admins get a shortcut to Settings → Crew Users.
  const crewAdmin = useCrewAdmin()
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [themeMode, setThemeMode] = useStickyState(mode, 'themeMode')
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up('lg'))

  if (!userProfile) return null

  const currentUser = userProfile
  const isPlusUser = isPlusAccount(userProfile)

  const getSubscriptionStatus = () => {
    if (!userProfile) return t('userMenu.planFree')

    if (userProfile.subscription === 'active') {
      return t('userMenu.planPlus')
    }

    if (
      userProfile.subscription === 'cancelled' &&
      moment().isBefore(userProfile.expiration)
    ) {
      return t('userMenu.planPlusExpiring')
    }

    return t('userMenu.planFree')
  }

  const handleLogout = () => {
    apiClient.handleLogout()
  }

  const handleSupportEmail = () => {
    window.location.href = 'mailto:support@donetick.com'
  }

  const isDarkMode = themeMode === 'dark'

  const handleThemeToggle = () => {
    const newThemeMode = isDarkMode ? 'light' : 'dark'
    setThemeMode(newThemeMode)
    setMode(newThemeMode)
  }

  return (
    <>
      <Dropdown>
        <MenuButton
          variant='plain'
          sx={{
            p: showDetails ? 0.75 : 0,
            width: showDetails ? '100%' : 'auto',
            border: 'none',
            backgroundColor: 'transparent',
            borderRadius: showDetails ? 'var(--joy-radius-md)' : '50%',
            '&:hover': {
              backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              // transform: 'scale(1.05)',
              // transition: 'all 0.2s ease',
            },
            '&:active': {
              // transform: 'scale(0.95)',
            },
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: 1,
              minWidth: 0,
              width: '100%',
            }}
          >
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={resolvePhotoURL(currentUser?.image || currentUser?.avatar)}
                alt={currentUser?.displayName || currentUser?.name}
                size='md'
                sx={{
                  width: 36,
                  height: 36,
                  border: '2px solid var(--joy-palette-background-surface)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
            </Box>
            {showDetails && (
              <Box sx={{ minWidth: 0, textAlign: 'start' }}>
                <Typography
                  level='title-sm'
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentUser?.displayName || currentUser?.name}
                </Typography>
                <CrewShiftTag shift={currentUser?.crewShift} />
                <Typography
                  level='body-xs'
                  sx={{
                    color: 'text.tertiary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentUser?.email}
                </Typography>
              </Box>
            )}
          </Box>
        </MenuButton>
        <Menu
          placement='bottom-end'
          sx={{
            minWidth: 280,
            p: 1,
            '--List-gap': '4px',
            boxShadow: 'var(--joy-shadow-lg)',
            border: '1px solid var(--joy-palette-divider)',
            borderRadius: 'var(--joy-radius-md)',
          }}
        >
          <Sheet sx={{ p: 2, borderRadius: 'var(--joy-radius-sm)', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={resolvePhotoURL(currentUser?.image || currentUser?.avatar)}
                alt={currentUser?.displayName || currentUser?.name}
                size='lg'
                sx={{
                  width: 48,
                  height: 48,
                  border: '2px solid var(--joy-palette-background-surface)',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  level='title-md'
                  sx={{
                    fontWeight: 600,
                    color: 'var(--joy-palette-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.25,
                  }}
                >
                  {currentUser?.displayName || currentUser?.name}
                </Typography>
                <CrewShiftTag shift={currentUser?.crewShift} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    level='body-sm'
                    sx={{
                      color: 'var(--joy-palette-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {currentUser?.email}
                  </Typography>
                  {isPlusUser && !HIDE.subscription && (
                    <Typography
                      level='body-xs'
                      sx={{
                        color: 'var(--joy-palette-warning-600)',
                        fontWeight: 500,
                        fontSize: '11px',
                      }}
                    >
                      {getSubscriptionStatus()}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Sheet>

          <MenuItem
            onClick={() => navigate('/settings')}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-neutral-500)' }}>
              <Settings />
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                {t('settings')}
              </Typography>
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-text-tertiary)' }}
              >
                {t('userMenu.accountPrefs')}
              </Typography>
            </ListItemContent>
          </MenuItem>

          {crewAdmin && (
            <MenuItem
              onClick={() => navigate('/settings/subaccounts')}
              sx={{
                borderRadius: 'var(--joy-radius-sm)',
                '&:hover': {
                  backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
                },
              }}
            >
              <ListItemDecorator
                sx={{ color: 'var(--joy-palette-primary-500)' }}
              >
                <GroupAdd />
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                  {t('userMenu.crewUsers')}
                </Typography>
                <Typography
                  level='body-xs'
                  sx={{ color: 'var(--joy-palette-text-tertiary)' }}
                >
                  {t('userMenu.crewUsersDescription')}
                </Typography>
              </ListItemContent>
            </MenuItem>
          )}
          {isLargeScreen && (
            <MenuItem
              onClick={() => navigate('/settings/layout')}
              sx={{
                borderRadius: 'var(--joy-radius-sm)',
                '&:hover': {
                  backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
                },
              }}
            >
              <ListItemDecorator
                sx={{ color: 'var(--joy-palette-neutral-500)' }}
              >
                <Tune />
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                  {t('userMenu.sidePanelSettings')}
                </Typography>
                <Typography
                  level='body-xs'
                  sx={{ color: 'var(--joy-palette-text-tertiary)' }}
                >
                  {t('userMenu.sidePanelSettingsDescription')}
                </Typography>
              </ListItemContent>
            </MenuItem>
          )}

          <MenuItem
            onClick={handleThemeToggle}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-neutral-500)' }}>
              {isDarkMode ? <LightModeOutlined /> : <DarkModeOutlined />}
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                {isDarkMode
                  ? t('userMenu.switchToLight')
                  : t('userMenu.switchToDark')}
              </Typography>
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-text-tertiary)' }}
              >
                {t('userMenu.toggleThemeAppearance')}
              </Typography>
            </ListItemContent>
          </MenuItem>

          {!isPlusUser && !HIDE.subscription && (
            <MenuItem
              onClick={() => navigate('/settings/account')}
              sx={{
                borderRadius: 'var(--joy-radius-sm)',
                '&:hover': {
                  backgroundColor: 'var(--joy-palette-warning-softHoverBg)',
                },
              }}
            >
              <ListItemDecorator
                sx={{ color: 'var(--joy-palette-warning-500)' }}
              >
                <WorkspacePremium />
              </ListItemDecorator>
              <ListItemContent>
                <Typography
                  level='body-sm'
                  sx={{
                    fontWeight: 500,
                  }}
                >
                  {t('userMenu.upgradeToPlus')}
                </Typography>
                <Typography level='body-xs'>
                  {t('userMenu.unlockPremium')}
                </Typography>
              </ListItemContent>
            </MenuItem>
          )}

          {/* <MenuItem
            onClick={handleSupportEmail}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-info-500)' }}>
              <Email />
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                Support
              </Typography>
              <Typography
                level='body-xs'
                sx={{ color: 'var(--joy-palette-text-tertiary)' }}
              >
                support@donetick.com
              </Typography>
            </ListItemContent>
          </MenuItem> */}

          <Divider sx={{ my: 1 }} />

          <MenuItem
            onClick={handleLogout}
            sx={{
              borderRadius: 'var(--joy-radius-sm)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-danger-softHoverBg)',
              },
            }}
          >
            <ListItemDecorator sx={{ color: 'var(--joy-palette-danger-500)' }}>
              <Logout />
            </ListItemDecorator>
            <ListItemContent>
              <Typography
                level='body-sm'
                sx={{ fontWeight: 500, color: 'var(--joy-palette-danger-500)' }}
              >
                {t('logout')}
              </Typography>
            </ListItemContent>
          </MenuItem>
        </Menu>
      </Dropdown>

      <SubscriptionModal
        open={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </>
  )
}

UserProfileAvatar.propTypes = {
  showDetails: PropTypes.bool,
}

export default UserProfileAvatar
