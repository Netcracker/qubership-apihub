import { type FC, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-use'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { PortalSettingsIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PortalSettingsIcon'

import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useEventBus } from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import { getSettingsPath } from '../../NavigationProvider'

export const PortalSettingsButton: FC = memo(() => {
  const location = useLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const navigate = useNavigate()
  const { hideAiAssistantPanel } = useEventBus()

  const packageSettingsLinkHandle = useCallback((): void => {
    hideAiAssistantPanel()
    setBackwardLocation({
      ...backwardLocation,
      fromPackageSettings: {
        pathname: location.pathname!,
        search: location.search!,
      },
    })
    navigate(getSettingsPath())
  }, [
    backwardLocation,
    hideAiAssistantPanel,
    location.pathname,
    location.search,
    navigate,
    setBackwardLocation,
  ])

  return (
    <ButtonWithHint
      hint="Portal Settings"
      startIcon={<PortalSettingsIcon />}
      aria-label="Portal Settings"
      size="large"
      color="inherit"
      data-testid="PortalSettingsButton"
      onClick={packageSettingsLinkHandle}
    />
  )
})

PortalSettingsButton.displayName = 'PortalSettingsButton'
