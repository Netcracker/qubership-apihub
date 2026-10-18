import Typography from '@mui/material/Typography'
import { type FC, type HTMLAttributes, memo } from 'react'

import { type PackageVersion, REVISION_DELIMITER } from '../entities/versions'
import { NON_LATEST_REVISION_TEXT_COLOR } from '../themes/colors'
import { getSplittedVersionKey } from '../utils/versions'
import { VersionErrorIndicator } from './ErrorIndicators/VersionErrorIndicator'
import { OptionItem } from './OptionItem'
import { VersionStatusChip } from './VersionStatusChip'

type VersionOptionItemProps = {
  props: HTMLAttributes<HTMLLIElement>
  version: PackageVersion
}

export const VersionOptionItem: FC<VersionOptionItemProps> = memo<VersionOptionItemProps>(({
  props,
  version,
}) => {
  const { key, status, latestRevision, hasErrors, changelogHasErrors, apiProcessorVersion } = version
  const { versionKey, revisionKey } = getSplittedVersionKey(key)
  const showOldRevision = !latestRevision && revisionKey !== ''
  const optionTitle = showOldRevision
    ? `${versionKey}${REVISION_DELIMITER}${revisionKey}`
    : versionKey

  return (
    <OptionItem
      props={props}
      title={
        <>
          {versionKey}
          {showOldRevision && (
            <Typography component="span" variant="inherit" color={NON_LATEST_REVISION_TEXT_COLOR}>
              {`${REVISION_DELIMITER}${revisionKey}`}
            </Typography>
          )}
        </>
      }
      overflowTooltipText={optionTitle}
      overflowTooltipPlacement="left"
      indicator={
        <VersionErrorIndicator
          versionKey={versionKey}
          hasErrors={hasErrors}
          changelogHasErrors={changelogHasErrors}
          apiProcessorVersion={apiProcessorVersion}
          fontSize="extra-small"
          showTooltip={false}
        />
      }
      chip={<VersionStatusChip status={status} />}
    />
  )
})

VersionOptionItem.displayName = 'VersionOptionItem'
