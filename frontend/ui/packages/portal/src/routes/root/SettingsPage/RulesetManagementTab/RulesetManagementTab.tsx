import { useLinters } from '@apihub/api-hooks/ApiQuality/useLinters'
import { type LinterApiType, LinterApiTypes } from '@apihub/entities/api-quality/linter-api-types'
import type { Linter } from '@apihub/entities/api-quality/linters'
import { getLinterById } from '@apihub/utils/api-quality/linters'
import { Box, Button, type SelectChangeEvent } from '@mui/material'
import { useEventBus } from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { PlusIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlusIcon'
import { type FC, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useRulesets } from './api/useRulesets'
import { CreateRulesetDialog } from './components/CreateRulesetDialog'
import { RulesetApiTypeSelector } from './components/RulesetApiTypeSelector'
import { RulesetLinterSelector } from './components/RulesetLinterSelector'
import { RulesetTable } from './components/RulesetTable'

export const RulesetManagementTab: FC = memo(() => {
  const [rulesets, loadingRulesets] = useRulesets()
  const { showCreateRulesetDialog } = useEventBus()
  const [selectedApiType, setSelectedApiType] = useState<LinterApiType>(LinterApiTypes.OAS_3_0)
  const [selectedLinter, setSelectedLinter] = useState<Linter>()

  const { data: lintersList = [], isLoading: loadingLinters } = useLinters(selectedApiType)

  const selectedRulesets = useMemo(() => {
    if (!selectedLinter) {
      return []
    }
    return rulesets
      .filter(ruleset => ruleset.apiType === selectedApiType)
      .filter(ruleset => ruleset.linter === selectedLinter.linter)
  }, [rulesets, selectedApiType, selectedLinter])

  useEffect(() => {
    if (!selectedLinter && lintersList.length > 0) {
      setSelectedLinter(lintersList[0])
    }
  }, [lintersList, selectedLinter])

  const handleChangeApiType = useCallback((event: SelectChangeEvent): void => {
    setSelectedApiType(event.target.value as LinterApiType)
    setSelectedLinter(undefined)
  }, [])

  const handleChangeLinter = useCallback((event: SelectChangeEvent): void => {
    const linterId = event.target.value as Linter['linter']
    const linter = getLinterById(linterId, lintersList)
    linter && setSelectedLinter(linter)
  }, [lintersList])

  return (
    <BodyCard
      header={
        <Box display="flex" gap={2} alignItems="center" height='54px'>
          API Quality Ruleset Management
          <RulesetApiTypeSelector apiType={selectedApiType} onChange={handleChangeApiType} />
          {selectedLinter && (
            <RulesetLinterSelector
              loading={loadingLinters}
              linterList={lintersList}
              selectedLinter={selectedLinter}
              onChange={handleChangeLinter}
            />
          )}
        </Box>
      }
      action={
        selectedLinter && (
          <Button
            variant="contained"
            disabled={loadingRulesets}
            startIcon={<PlusIcon />}
            onClick={showCreateRulesetDialog}
            aria-label="Add new ruleset"
            data-testid="AddRulesetButton"
          >
            Add Ruleset
          </Button>
        )
      }
      body={
        <>
          <RulesetTable
            rulesets={selectedRulesets}
            isLoading={loadingRulesets}
          />
          {selectedLinter && (
            <CreateRulesetDialog
              apiType={selectedApiType}
              linter={selectedLinter}
              rulesets={selectedRulesets}
            />
          )}
        </>
      }
    />
  )
})

RulesetManagementTab.displayName = 'RulesetManagementTab'
