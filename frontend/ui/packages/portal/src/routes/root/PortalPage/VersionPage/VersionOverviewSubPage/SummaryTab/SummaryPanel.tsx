import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { type FC, Fragment, memo, type ReactNode } from 'react'

/**
 * Children of {@link ContractsSummary} grid. Column layout:
 * numbers label (1) | numbers value (2) | gap (3) | validations label (4) | validations value (5)
 *
 * Each grid row pairs one numbers metric with one validations metric at the same index.
 */

import { SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED, type SummaryMetricLabelVariant } from './entities'

export type SummaryMetric =
  & Readonly<{
    label: ReactNode
    value?: ReactNode
    visible?: boolean
    labelVariant?: SummaryMetricLabelVariant
  }>
  & TestableProps

type SummaryPanelConfig = Readonly<{
  title?: string
  metrics?: ReadonlyArray<SummaryMetric>
}>

type SummaryPanelsProps = Readonly<{
  numbers: SummaryPanelConfig
  validations?: SummaryPanelConfig
}>

export const SummaryPanels: FC<SummaryPanelsProps> = memo(({ numbers, validations }) => (
  <SummaryPanelContents>
    {numbers.title && <NumbersPanelTitle variant="subtitle1">{numbers.title}</NumbersPanelTitle>}
    {validations?.title && <ValidationsPanelTitle variant="subtitle1">{validations.title}</ValidationsPanelTitle>}
    {renderPanelRows(numbers.metrics, validations?.metrics)}
  </SummaryPanelContents>
))

SummaryPanels.displayName = 'SummaryPanels'

const NumbersMetricRow: FC<{ metric: SummaryMetric }> = memo(({ metric }) => {
  const testIds = getSummaryMetricTestIds(metric)

  return (
    <>
      <NumbersMetricLabel variant="subtitle2" data-testid={testIds.label}>
        {metric.label}
      </NumbersMetricLabel>
      <NumbersMetricValue variant="body2" data-testid={testIds.value}>
        {metric.value}
      </NumbersMetricValue>
    </>
  )
})

NumbersMetricRow.displayName = 'NumbersMetricRow'

const ValidationsMetricRow: FC<{ metric: SummaryMetric }> = memo(({ metric }) => {
  const isEmphasized = metric.labelVariant === SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED
  const testIds = getSummaryMetricTestIds(metric)
  const Label = isEmphasized ? ValidationsEmphasizedMetricLabel : ValidationsMetricLabel

  return (
    <>
      <Label variant={isEmphasized ? 'body2' : 'subtitle2'} data-testid={testIds.label}>
        {metric.label}
      </Label>
      <ValidationsMetricValue variant="body2" data-testid={testIds.value}>
        {metric.value}
      </ValidationsMetricValue>
    </>
  )
})

ValidationsMetricRow.displayName = 'ValidationsMetricRow'

const SummaryPanelContents = styled(Box)({
  display: 'contents',
})

const NumbersPanelTitle = styled(Typography)({
  gridColumn: 1,
})

const ValidationsPanelTitle = styled(Typography)({
  gridColumn: 4,
})

const NumbersMetricLabel = styled(Typography)({
  gridColumn: 1,
})

const NumbersMetricValue = styled(Typography)({
  gridColumn: 2,
})

const ValidationsMetricLabel = styled(Typography)({
  gridColumn: 4,
})

const ValidationsEmphasizedMetricLabel = styled(Typography)({
  gridColumn: 4,
  fontWeight: 500,
})

const ValidationsMetricValue = styled(Typography)({
  gridColumn: 5,
})

type SummaryMetricTestIds = Readonly<{
  label?: string
  value?: string
}>

function renderPanelRows(
  numbersMetrics: ReadonlyArray<SummaryMetric> | undefined,
  validationsMetrics: ReadonlyArray<SummaryMetric> | undefined,
): ReactNode {
  const numbersRows = filterVisibleMetrics(numbersMetrics)
  const validationsRows = filterVisibleMetrics(validationsMetrics)
  const rowCount = Math.max(numbersRows.length, validationsRows.length)

  return Array.from({ length: rowCount }, (_, index) => (
    <Fragment key={index}>
      {numbersRows[index] && <NumbersMetricRow metric={numbersRows[index]} />}
      {validationsRows[index] && <ValidationsMetricRow metric={validationsRows[index]} />}
    </Fragment>
  ))
}

function filterVisibleMetrics(metrics: ReadonlyArray<SummaryMetric> | undefined): ReadonlyArray<SummaryMetric> {
  return metrics?.filter(metric => metric.visible !== false) ?? []
}

function getSummaryMetricTestIds(metric: SummaryMetric): SummaryMetricTestIds {
  const dataTestId = metric['data-testid']
  if (dataTestId === undefined) {
    return {}
  }

  const isEmphasized = metric.labelVariant === SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED
  const isLabelTestId = metric.value === undefined || isEmphasized

  return isLabelTestId ? { label: dataTestId } : { value: dataTestId }
}
