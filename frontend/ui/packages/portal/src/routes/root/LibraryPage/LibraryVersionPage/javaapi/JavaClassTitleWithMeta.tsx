import { Box, Link, styled, Typography } from '@mui/material'
import type { Path } from '@remix-run/router'
import { type FC, memo } from 'react'
import { NavLink } from 'react-router-dom'

import { type JavaApiClassListItem, JavaElementIcon } from '@netcracker/qubership-apihub-api-doc-viewer'
import { DdlSchemaChip } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlSchemaChip'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'

type JavaClassTitleWithMetaProps = Readonly<{
  javaClass: JavaApiClassListItem
  link?: Partial<Path>
  onLinkClick?: () => void
  onlyTitle?: boolean
}>

export const JavaClassTitleWithMeta: FC<JavaClassTitleWithMetaProps> = memo<JavaClassTitleWithMetaProps>((
  { javaClass, link, onLinkClick, onlyTitle = false },
) => {
  const { className, displayName, packageName, typeKind } = javaClass

  return (
    <TitleColumn>
      <TitleRow>
        <JavaElementIcon kind={typeKind} />
        <OverflowTooltip title={className.replaceAll('$', '.')}>
          {link
            ? (
              <Typography noWrap variant="subtitle1">
                <Link
                  component={NavLink}
                  to={link}
                  onClick={(event) => {
                    event.stopPropagation()
                    onLinkClick?.()
                  }}
                >
                  {displayName}
                </Link>
              </Typography>
            )
            : onlyTitle
            ? <PreviewTitle noWrap variant="h1">{displayName}</PreviewTitle>
            : <Typography noWrap variant="subtitle1">{displayName}</Typography>}
        </OverflowTooltip>
      </TitleRow>
      {!onlyTitle && (
        <SubtitleRow data-testid="JavaClassSubtitle">
          {packageName && <DdlSchemaChip label={packageName} data-testid="JavaClassPackageChip" />}
        </SubtitleRow>
      )}
    </TitleColumn>
  )
})

JavaClassTitleWithMeta.displayName = 'JavaClassTitleWithMeta'

const TitleColumn = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minWidth: 0,
})

const TitleRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
})

// The preview header of the detailed view: the theme's 24px h1 in semi-bold, as the design asks (24px/600/32px)
const PreviewTitle = styled(Typography)({
  fontWeight: 600,
  lineHeight: '32px',
})

const SubtitleRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  minHeight: theme.spacing(2.5),
  minWidth: 0,
}))
