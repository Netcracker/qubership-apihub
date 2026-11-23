import { Alert, Box, IconButton, Link, styled, type Theme, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { type FC, Fragment, memo, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useCopyToClipboard } from 'react-use'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'
import { CopyIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CopyIcon'

import { LibraryVersionBuildStatuses } from '@portal/entities/libraries'
import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { FrontTruncatedText } from '@portal/routes/root/LibraryPage/FrontTruncatedText'
import { ContractsSummary } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/SummaryTab/ContractsSummary'
import { SummaryPanels } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/SummaryTab/SummaryPanel'
import { SummarySection } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/SummaryTab/SummarySection'
import { countJavaTypes } from './javaapi/javaApi'
import { getLibraryVersionPath, type LibraryVersionPageProps } from './libraryVersion'
import { LibraryVersionBuildError } from './LibraryVersionBuildError'
import { useLibraryChangesSummary } from './useLibraryChanges'
import { useLibraryJavaApiReport } from './useLibraryJavaApi'

type SummaryMetric = { id: string; label: string; value: ReactNode }

const LOADING_VALUE = 'Loading…'
const EMPTY_VALUE = '—'

export const LibrarySummaryTab: FC<LibraryVersionPageProps> = memo<LibraryVersionPageProps>(({ library, version }) => {
  const [, copyToClipboard] = useCopyToClipboard()
  const showSuccessNotification = useShowSuccessNotification()
  const { data: changesSummary, isLoading, error } = useLibraryChangesSummary(
    library.libraryId,
    version.version,
    undefined,
    { expectsComparison: !!version.previousVersion },
  )
  const { data: report, isLoading: isReportLoading, error: reportError } = useLibraryJavaApiReport(
    library.libraryId,
    version.version,
  )
  const metrics = report ? countJavaTypes(report.classes) : undefined
  const isCompact = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const renderChangeCounts = (): ReactNode => {
    if (error) return EMPTY_VALUE
    if (isLoading) return LOADING_VALUE
    if (!changesSummary) return EMPTY_VALUE
    return (
      <Box display="flex" alignItems="center">
        <Changes value={changesSummary} mode="compact" zeroView />
      </Box>
    )
  }
  const validations = {
    title: 'JavaAPI Validation',
    metrics: [{
      label: 'Number of changes',
      value: renderChangeCounts(),
    }],
  }
  const gav = `${library.coordinatesKey}:${version.version}`
  const handleCopyGav = (): void => {
    copyToClipboard(gav)
    showSuccessNotification({ message: 'GAV copied' })
  }
  const versionMetrics: SummaryMetric[] = [
    {
      id: 'current',
      label: 'Current version',
      value: <FrontTruncatedText text={version.version} />,
    },
    {
      id: 'previous',
      label: 'Previous version',
      value: version.previousVersion
        ? (
          <FrontTruncatedText text={version.previousVersion}>
            <Link component={NavLink} to={getLibraryVersionPath(library.libraryId, version.previousVersion)}>
              {version.previousVersion}
            </Link>
          </FrontTruncatedText>
        )
        : EMPTY_VALUE,
    },
    { id: 'publisher', label: 'Published by', value: <UserView name={version.createdBy ?? EMPTY_VALUE} /> },
    { id: 'date', label: 'Publication Date', value: <FormattedDate value={version.createdAt} /> },
    {
      id: 'gav',
      label: 'GAV',
      value: (
        <GavValue>
          <FrontTruncatedText text={gav} data-testid="LibraryGavTypography" />
          <Tooltip title="Copy GAV">
            <IconButton size="small" aria-label="Copy GAV" onClick={handleCopyGav} data-testid="CopyGavButton">
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </GavValue>
      ),
    },
  ]

  return (
    <BodyCard
      header="Summary"
      overrideBodySx={{ overflowY: 'auto' }}
      body={
        <Box>
          <Labels data-testid="VersionLabels">
            {version.labels.map(label => (
              <SummaryLabel
                key={label}
                value={label}
                label={
                  <OverflowTooltip title={label}>
                    <LabelText>{label}</LabelText>
                  </OverflowTooltip>
                }
              />
            ))}
          </Labels>
          <VersionSummary>
            <Typography variant="subtitle1">Version summary</Typography>
            <VersionMetrics component="dl" data-testid="LibraryVersionSummary">
              {versionMetrics.map(metric => (
                <Fragment key={metric.id}>
                  <Typography component="dt" variant="subtitle2" sx={{ gridArea: `${metric.id}Title` }}>
                    {metric.label}
                  </Typography>
                  <MetricValue component="dd" sx={{ gridArea: metric.id }}>{metric.value}</MetricValue>
                </Fragment>
              ))}
            </VersionMetrics>
          </VersionSummary>
          {error && <Alert severity="error">{error.message}</Alert>}
          {reportError && <Alert severity="error">{reportError.message}</Alert>}
          {version.metadata?.buildStatus === LibraryVersionBuildStatuses.ERROR
            ? <LibraryVersionBuildError version={version} />
            : (
              <JavaSummary data-testid="LibraryJavaSummary">
                <ContractsSummary>
                  <SummarySection>
                    <SummaryPanels
                      numbers={{
                        title: 'JavaAPI',
                        metrics: [
                          {
                            label: 'Total number of classes',
                            value: isReportLoading ? LOADING_VALUE : metrics?.CLASS ?? EMPTY_VALUE,
                          },
                          {
                            label: 'Total number of interfaces',
                            value: isReportLoading ? LOADING_VALUE : metrics?.INTERFACE ?? EMPTY_VALUE,
                          },
                          {
                            label: 'Total number of enums',
                            value: isReportLoading ? LOADING_VALUE : metrics?.ENUM ?? EMPTY_VALUE,
                          },
                          {
                            label: 'Total number of annotation types',
                            value: isReportLoading ? LOADING_VALUE : metrics?.ANNOTATION ?? EMPTY_VALUE,
                          },
                        ],
                      }}
                      validations={isCompact ? undefined : validations}
                    />
                  </SummarySection>
                  {isCompact && (
                    <SummarySection>
                      <SummaryPanels numbers={validations} />
                    </SummarySection>
                  )}
                </ContractsSummary>
              </JavaSummary>
            )}
        </Box>
      }
    />
  )
})
LibrarySummaryTab.displayName = 'LibrarySummaryTab'

const Labels = styled(Box)({ whiteSpace: 'break-spaces', width: 'calc(100% - 60px)' })
const SummaryLabel = styled(CustomChip)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginTop: theme.spacing(0.5),
  maxWidth: '100%',
}))
const VersionSummary = styled(Box)(({ theme }) => ({ marginTop: theme.spacing(4) }))
const VersionMetrics = styled(Box)(({ theme }) => ({
  display: 'grid',
  margin: theme.spacing(1, 0, 0),
  rowGap: theme.spacing(1),
  columnGap: theme.spacing(5),
  gridTemplateColumns: `max-content minmax(0, ${theme.spacing(25)}) max-content minmax(0, 1fr)`,
  gridTemplateAreas: `
    'currentTitle current publisherTitle publisher'
    'previousTitle previous dateTitle date'
    '. . gavTitle gav'
  `,
  alignItems: 'center',
  [theme.breakpoints.down('lg')]: {
    gridTemplateColumns: 'max-content minmax(0, 1fr)',
    gridTemplateAreas:
      '\'currentTitle current\' \'previousTitle previous\' \'publisherTitle publisher\' \'dateTitle date\' \'gavTitle gav\'',
  },
}))
const MetricValue = styled(Box)(({ theme }) => ({ ...theme.typography.body2, margin: 0, minWidth: 0 }))
const GavValue = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  '& > .MuiTypography-root': { minWidth: 0 },
  // opacity, not visibility: a hidden button could not take keyboard focus
  '& .MuiIconButton-root': { opacity: 0, flexShrink: 0 },
  '&:hover .MuiIconButton-root, &:focus-within .MuiIconButton-root': { opacity: 1 },
}))
const JavaSummary = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down('lg')]: { '& > div': { gridTemplateColumns: 'max-content minmax(0, 1fr)' } },
}))
const LabelText = styled(Box)({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
