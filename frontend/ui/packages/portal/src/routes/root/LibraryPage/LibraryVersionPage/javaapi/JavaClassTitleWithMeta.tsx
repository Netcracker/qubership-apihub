import { Box, Link, styled, Typography } from '@mui/material'
import type { Path } from '@remix-run/router'
import { type FC, memo } from 'react'
import { NavLink } from 'react-router-dom'

import {
  JAVA_API_TYPE_KIND_TITLES,
  type JavaApiClassListItem,
  JavaElementIcon,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import { DdlSchemaChip } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlSchemaChip'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'

type JavaClassTitleWithMetaProps = Readonly<{
  javaClass: JavaApiClassListItem
  link?: Partial<Path>
  onLinkClick?: () => void
  onlyTitle?: boolean
  // false where a separate column already shows the members, e.g. the API Changes table
  showSummary?: boolean
  // TODO(libraries-backend): The class list has no member counts; show them once it does.
  showMemberCount?: boolean
}>

export const JavaClassTitleWithMeta: FC<JavaClassTitleWithMetaProps> = memo<JavaClassTitleWithMetaProps>((
  { javaClass, link, onLinkClick, onlyTitle = false, showSummary = true, showMemberCount = true },
) => {
  const { className, displayName, packageName, typeKind, memberCount } = javaClass
  const subtitle = showMemberCount
    ? `${JAVA_API_TYPE_KIND_TITLES[typeKind]} · ${memberCount} ${memberCount === 1 ? 'member' : 'members'}`
    : JAVA_API_TYPE_KIND_TITLES[typeKind]

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
            : <Typography noWrap variant={onlyTitle ? 'inherit' : 'subtitle1'}>{displayName}</Typography>}
        </OverflowTooltip>
      </TitleRow>
      {!onlyTitle && (
        <SubtitleRow data-testid="JavaClassSubtitle">
          {packageName && <DdlSchemaChip label={packageName} data-testid="JavaClassPackageChip" />}
          {showSummary && (
            <TextWithOverflowTooltip tooltipText={subtitle} variant="subtitle2">
              {subtitle}
            </TextWithOverflowTooltip>
          )}
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

const SubtitleRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  minHeight: theme.spacing(2.5),
  minWidth: 0,
}))
