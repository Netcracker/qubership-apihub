import { Box, Button, type SelectChangeEvent } from '@mui/material'
import {
  type RulesetApiType,
  RulesetApiTypes,
} from '@netcracker/qubership-apihub-ui-portal/src/entities/api-quality/rulesets'
import { useEventBus } from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { PlusIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlusIcon'
import { type FC, memo, useCallback, useMemo, useState } from 'react'
import { useRulesets } from './api/useRulesets'
import { CreateRulesetDialog } from './components/CreateRulesetDialog'
import { RulesetApiTypeSelector } from './components/RulesetApiTypeSelector'
import { RulesetTable } from './components/RulesetTable'

export const RulesetManagementTab: FC = memo(() => {
  const [rulesets, isLoading] = useRulesets()
  const { showCreateRulesetDialog } = useEventBus()
  const [selectedApiType, setSelectedApiType] = useState<RulesetApiType>(RulesetApiTypes.OAS_3_0)

  const selectedRulesets = useMemo(() => {
    return rulesets.filter(ruleset => ruleset.apiType === selectedApiType)
  }, [rulesets, selectedApiType])

  const handleOpenCreateDialog = useCallback((): void => {
    showCreateRulesetDialog()
  }, [showCreateRulesetDialog])

  const handleChangeApiType = useCallback((event: SelectChangeEvent): void => {
    setSelectedApiType(event.target.value as RulesetApiType)
  }, [])

  return (
    <BodyCard
      header={
        <Box display="flex" gap={2} alignItems="center">
          API Quality Ruleset Management
          <RulesetApiTypeSelector apiType={selectedApiType} onChange={handleChangeApiType} />
        </Box>
      }
      action={
        <Button
          variant="contained"
          disabled={isLoading}
          startIcon={<PlusIcon />}
          onClick={handleOpenCreateDialog}
          aria-label="Add new ruleset"
          data-testid="AddRulesetButton"
        >
          Add Ruleset
        </Button>
      }
      body={
        <>
          <RulesetTable rulesets={selectedRulesets} isLoading={isLoading} />
          <CreateRulesetDialog apiType={selectedApiType} rulesets={selectedRulesets} />
        </>
      }
    />
  )
})

RulesetManagementTab.displayName = 'RulesetManagementTab'
