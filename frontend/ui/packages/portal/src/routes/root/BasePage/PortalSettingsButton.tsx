import { type FC, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-use'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { PortalSettingsIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PortalSettingsIcon'

import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { getSettingsPath } from '../../NavigationProvider'
import { useSidePanelManager } from './PanelManager/SidePanelManager'

export const PortalSettingsButton: FC = memo(() => {
  const location = useLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const navigate = useNavigate()
  const { closeAll } = useSidePanelManager()

  const packageSettingsLinkHandle = useCallback((): void => {
    closeAll()
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
    closeAll,
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
