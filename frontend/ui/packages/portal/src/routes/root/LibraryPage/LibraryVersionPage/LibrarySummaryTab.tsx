import { Alert, Box, Link, styled, type Theme, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { type FC, Fragment, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'
import {
  BREAKING_CHANGE_SEVERITY,
  CHANGE_SEVERITY_COLOR_MAP,
  NON_BREAKING_CHANGE_SEVERITY,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'

import type { LibraryChangeSeverity, LibraryVersionDto, MavenLibraryDto } from '@portal/entities/libraries'
import { FrontTruncatedText } from '@portal/routes/root/LibraryPage/FrontTruncatedText'
import { ContractsSummary } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/SummaryTab/ContractsSummary'
import { SummaryPanels } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/SummaryTab/SummaryPanel'
import { SummarySection } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/SummaryTab/SummarySection'
import { getLibraryVersionPath } from './library-version'
import { useLibraryComparison } from './useLibraryChanges'

type LibrarySummaryTabProps = { library: MavenLibraryDto; version: LibraryVersionDto }
type SummaryMetric = { id: string; label: string; value: ReactNode }

export const LibrarySummaryTab: FC<LibrarySummaryTabProps> = ({ library, version }) => {
  const { comparison, isLoading, error } = useLibraryComparison({
    libraryId: library.libraryId,
    version: version.version,
  })
  const count = (severity: LibraryChangeSeverity): ReactNode => (comparison
    ? Object.values(comparison.changeCounts ?? {}).reduce((total, counts) => total + (counts?.[severity] ?? 0), 0)
    : '—')
  const metrics = version.metadata?.javaApi
  const isCompact = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const validations = {
    title: 'JavaAPI Validation',
    metrics: [{
      label: 'Number of changes',
      value: error ? '—' : isLoading ? 'Loading…' : (
        <ChangeCounts component="span">
          <Tooltip title="Breaking changes">
            <ChangeCount component="span">
              <BreakingDot component="span" />
              {count('breaking')}
            </ChangeCount>
          </Tooltip>
          <Tooltip title="Non-breaking changes">
            <ChangeCount component="span">
              <NonBreakingDot component="span" />
              {count('non-breaking')}
            </ChangeCount>
          </Tooltip>
        </ChangeCounts>
      ),
    }],
  }
  const gav = `${library.coordinatesKey}:${version.version}`
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
        : '—',
    },
    { id: 'publisher', label: 'Published by', value: <UserView name={version.createdBy ?? '—'} /> },
    { id: 'date', label: 'Publication Date', value: <FormattedDate value={version.createdAt} /> },
    {
      id: 'gav',
      label: 'GAV',
      value: <FrontTruncatedText text={gav} data-testid="LibraryGavTypography" />,
    },
  ]

  return (
    <BodyCard
      header="Summary"
      overrideBodySx={{ overflowY: 'auto' }}
      body={
        <Box>
          <Labels data-testid="VersionLabels">
            {version.labels.map(label => <SummaryLabel key={label} value={label} />)}
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
          <JavaSummary data-testid="LibraryJavaSummary">
            <ContractsSummary>
              <SummarySection>
                <SummaryPanels
                  numbers={{
                    title: 'JavaAPI',
                    metrics: [
                      { label: 'Total number of classes', value: metrics?.classes ?? '—' },
                      { label: 'Total number of interfaces', value: metrics?.interfaces ?? '—' },
                      { label: 'Total number of enums', value: metrics?.enums ?? '—' },
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
        </Box>
      }
    />
  )
}
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
const JavaSummary = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down('lg')]: { '& > div': { gridTemplateColumns: 'max-content minmax(0, 1fr)' } },
}))
const ChangeCounts = styled(Box)(({ theme }) => ({ display: 'flex', gap: theme.spacing(1), alignItems: 'center' }))
const ChangeCount = styled(Box)(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }))
const BreakingDot = styled(Box)(({ theme }) => ({
  width: theme.spacing(1),
  height: theme.spacing(1),
  borderRadius: '50%',
  backgroundColor: CHANGE_SEVERITY_COLOR_MAP[BREAKING_CHANGE_SEVERITY],
}))
const NonBreakingDot = styled(BreakingDot)({ backgroundColor: CHANGE_SEVERITY_COLOR_MAP[NON_BREAKING_CHANGE_SEVERITY] })
