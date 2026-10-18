import { styled } from '@mui/material/styles'
import { type FC, memo, type ReactNode } from 'react'

import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { DownloadIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/DownloadIconMui'
import { plainChildrenText } from '../../utils/plainChildrenText'
import { CHAT_CARD_LINK_CLASS, chatCardSurface } from './chatCard'

type FileDownloadLinkProps = {
  href: string
  children?: ReactNode
}

export const FileDownloadLink: FC<FileDownloadLinkProps> = memo(({ href, children }) => {
  const url = new URL(href)
  const label = plainChildrenText(children).trim() || url.pathname.split('/').filter(Boolean).pop() || 'download'

  return (
    <FileLinkCard href={href} className={CHAT_CARD_LINK_CLASS} aria-label={`Download ${label}`}>
      <FileDownloadLabel typographyComponent="span" tooltipText={label}>
        {label}
      </FileDownloadLabel>
      <DownloadIconMui fontSize="small" color="inherit" />
    </FileLinkCard>
  )
})

FileDownloadLink.displayName = 'FileDownloadLink'

const FileDownloadLabel = styled(TextWithOverflowTooltip)({
  display: 'block',
  width: '100%',
})

FileDownloadLabel.displayName = 'FileDownloadLabel'

const FileLinkCard = styled('a')(({ theme }) => ({
  ...chatCardSurface(theme),
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  width: '100%',
  minHeight: 64,
}))
