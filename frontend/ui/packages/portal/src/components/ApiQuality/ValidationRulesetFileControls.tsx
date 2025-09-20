import { getPublicLink, useDownloadRuleset } from '@apihub/api-hooks/ApiQuality/useDownloadRuleset'
import type { Key } from '@apihub/entities/keys'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { DownloadIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/DownloadIconMui'
import { LinkIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LinkIcon'
import type { FC } from 'react'
import { useCopyToClipboard, useLocation } from 'react-use'

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
      hint="Download"
      startIcon={<DownloadIconMui color="action" fontSize="small" />}
      onClick={() => downloadRuleset({ rulesetId })}
      data-testid="DownloadButton"
    />
    <ButtonWithHint
      size="small"
      area-label="Copy public link to ruleset"
      hint="Copy public URL"
      startIcon={<LinkIcon color="action" fontSize="small" />}
      onClick={(event) => {
        if (host && protocol) {
          // prevents the Notification from closing by avoiding the Snackbar's "clickaway" event handling
          event.stopPropagation()
          const publicLink = getPublicLink(host, protocol, rulesetId)
          copyToClipboard(publicLink)
          showNotification({ message: 'Public URL copied' })
        }
      }}
      data-testid="CopyPublicUrlButton"
    />
  </>
}
