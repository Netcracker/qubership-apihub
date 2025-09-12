import { getPublicLink, useDownloadRuleset } from '@apihub/api-hooks/ApiQuality/useDownloadRuleset'
import type { Key } from '@apihub/entities/keys'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { DownloadIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DownloadIcon'
import { LinkIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LinkIcon'
import type { FC } from 'react'
import { useCopyToClipboard, useLocation } from 'react-use'

const ICON_COLOR = '#626D82'
const ICON_SIZE = '20px'

type ValidationRulesetFileControlsProps = {
  rulesetId: Key
}

export const ValidationRulesetFileControls: FC<ValidationRulesetFileControlsProps> = (props) => {
  const { rulesetId } = props

  const downloadRuleset = useDownloadRuleset()

  const { host, protocol } = useLocation()
  const [, copyToClipboard] = useCopyToClipboard()
  const showNotification = useShowSuccessNotification()

  return <>
    <ButtonWithHint
      size="small"
      area-label="Download Ruleset"
      hint='Download'
      className="hoverable"
      startIcon={<DownloadIcon color={ICON_COLOR} />}
      sx={{ height: ICON_SIZE }}
      onClick={() => downloadRuleset({ rulesetId })}
    />
    <ButtonWithHint
      size="small"
      area-label="Copy public link to ruleset"
      hint='Copy public URL'
      className="hoverable"
      startIcon={<LinkIcon color={ICON_COLOR} />}
      sx={{ height: ICON_SIZE }}
      onClick={() => {
        if (host && protocol) {
          const publicLink = getPublicLink(host, protocol, rulesetId)
          copyToClipboard(publicLink)
          showNotification({ message: 'Public URL copied' })
        }
      }}
    />
  </>
}
