import { NorthEastRounded } from '@mui/icons-material'
import { memo, useCallback } from 'react'
import { navigateToExternalPage, VS_CODE_EXTENSION_URL } from '../../../entities/external-navigation'
import { ButtonWithHint } from '../ButtonWithHint'

export const VsCodeExtensionButton = memo(() => {
  const handleClick = useCallback(() => navigateToExternalPage(VS_CODE_EXTENSION_URL), [])
  return (
    <ButtonWithHint
      title="VS Code Extension"
      hint="Open APIHUB VS Code Extension on Visual Studio Marketplace"
      color="inherit"
      size="large"
      endIcon={<NorthEastRounded />}
      onClick={handleClick}
      data-testid="VsCodeExtensionButton"
    />
  )
})

VsCodeExtensionButton.displayName = 'VsCodeExtensionButton'
