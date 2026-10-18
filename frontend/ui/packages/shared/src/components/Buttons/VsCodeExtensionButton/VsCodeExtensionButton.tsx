import { NorthEastRounded } from '@mui/icons-material'
import { memo, useCallback } from 'react'
import { navigateToExternalPage, VS_CODE_EXTENSION_URL } from '../../../entities/external-navigation'
import { ButtonWithHint } from '../ButtonWithHint'
import { styled } from '@mui/material/styles'

export const VsCodeExtensionButton = memo(() => {
  const handleClick = useCallback(() => navigateToExternalPage(VS_CODE_EXTENSION_URL), [])
  return (
    <StyledVsCodeExtensionButton
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

const StyledVsCodeExtensionButton = styled(ButtonWithHint)(({ theme }) => ({
  padding: theme.spacing(1, 1),
  fontSize: theme.typography.button.fontSize,
  fontWeight: theme.typography.button.fontWeight,
}))

VsCodeExtensionButton.displayName = 'VsCodeExtensionButton'
