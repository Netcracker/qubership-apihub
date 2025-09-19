import { Box } from '@mui/material'
import {
  ValidationRulesetFileControls,
} from '@netcracker/qubership-apihub-ui-portal/src/components/ApiQuality/ValidationRulesetFileControls'
import {
  type RulesetDto,
  RulesetStatuses,
} from '@netcracker/qubership-apihub-ui-portal/src/entities/api-quality/rulesets'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import {
  ConfirmationDialog,
} from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { DeleteIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIconMui'
import { PlayIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlayIcon'
import { type FC, memo, useCallback, useState } from 'react'
import { useActivateRuleset } from '../api/useActivateRuleset'
import { useDeleteRuleset } from '../api/useDeleteRuleset'

type RulesetActionsProps = {
  ruleset: RulesetDto
}

export const RulesetActions: FC<RulesetActionsProps> = memo(({ ruleset }) => {
  const [deleteRuleset, isDeleting] = useDeleteRuleset()
  const [activateRuleset, isActivating] = useActivateRuleset()

  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleActivate = useCallback((): void => {
    activateRuleset(ruleset)
  }, [activateRuleset, ruleset])

  const handleDelete = useCallback((): void => {
    deleteRuleset(ruleset)
  }, [deleteRuleset, ruleset])

  const handleOpenActivateDialog = useCallback((): void => {
    setIsActivateDialogOpen(true)
  }, [])

  const handleCloseActivateDialog = useCallback((): void => {
    setIsActivateDialogOpen(false)
  }, [])

  const handleOpenDeleteDialog = useCallback((): void => {
    setIsDeleteDialogOpen(true)
  }, [])

  const handleCloseDeleteDialog = useCallback((): void => {
    setIsDeleteDialogOpen(false)
  }, [])

  return (
    <>
      <Box display="flex" gap={2} visibility="hidden" className="hoverable" alignItems="center">
        <ButtonWithHint
          size="small"
          aria-label="Activate Ruleset"
          hint={ruleset.status === RulesetStatuses.ACTIVE ? 'The ruleset is already active' : 'Activate'}
          disabled={ruleset.status === RulesetStatuses.ACTIVE}
          startIcon={<PlayIcon fontSize="small" />}
          onClick={handleOpenActivateDialog}
          data-testid="ActivateButton"
        />

        <ValidationRulesetFileControls rulesetId={ruleset.id} />

        <ButtonWithHint
          size="small"
          aria-label="Delete Ruleset"
          hint={ruleset.status === RulesetStatuses.ACTIVE
            ? 'Cannot delete active ruleset'
            : ruleset.canBeDeleted
            ? 'Delete'
            : 'The ruleset cannot be deleted due to existing versions that have been validated against this ruleset'}
          disabled={ruleset.status === RulesetStatuses.ACTIVE || !ruleset.canBeDeleted}
          startIcon={<DeleteIconMui fontSize="small" />}
          onClick={handleOpenDeleteDialog}
          data-testid="DeleteButton"
        />
      </Box>

      <ConfirmationDialog
        open={isActivateDialogOpen}
        title="Changing the Active Ruleset"
        message="Activating this ruleset will automatically deactivate the currently active one. Do you want to proceed?"
        loading={isActivating}
        onConfirm={handleActivate}
        onCancel={handleCloseActivateDialog}
        confirmButtonName="Proceed"
        confirmButtonColor="primary"
      />

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        title={`Delete "${ruleset.name}" ruleset?`}
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
      />
    </>
  )
})

RulesetActions.displayName = 'RulesetActions'
