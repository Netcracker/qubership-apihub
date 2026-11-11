import { Box, Link, styled, Typography } from '@mui/material'
import { type FC, memo } from 'react'

import {
  JAVA_API_TYPE_KIND_TITLES,
  type JavaApiClassListItem,
  JavaElementIcon,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import { DdlSchemaChip } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlSchemaChip'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'

type JavaClassTitleWithMetaProps = {
  javaClass: JavaApiClassListItem
  onTitleClick?: () => void
  onlyTitle?: boolean
}

export const JavaClassTitleWithMeta: FC<JavaClassTitleWithMetaProps> = memo<JavaClassTitleWithMetaProps>((
  { javaClass, onTitleClick, onlyTitle = false },
) => {
  const { className, displayName, packageName, typeKind, memberCount } = javaClass
  const subtitle = `${JAVA_API_TYPE_KIND_TITLES[typeKind]} · ${memberCount} ${memberCount === 1 ? 'member' : 'members'}`

  return (
    <TitleColumn>
      <TitleRow>
        <JavaElementIcon kind={typeKind} />
        <OverflowTooltip title={className.replaceAll('$', '.')}>
          {onTitleClick
            ? (
              <Typography noWrap variant="subtitle1">
                <Link
                  component="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onTitleClick()
                  }}
                  sx={{ font: 'inherit', verticalAlign: 'baseline' }}
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
          <TextWithOverflowTooltip tooltipText={subtitle} variant="subtitle2">
            {subtitle}
          </TextWithOverflowTooltip>
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
