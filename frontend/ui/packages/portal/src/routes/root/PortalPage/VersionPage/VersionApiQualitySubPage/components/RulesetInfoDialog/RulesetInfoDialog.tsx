import { RULESET_API_TYPE_TITLE_MAP, RulesetStatuses, type Ruleset } from '@apihub/entities/api-quality/rulesets'
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Skeleton } from '@mui/material'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { useCallback, type FC } from 'react'

import { useRulesetActivationHistory } from '@apihub/api-hooks/ApiQuality/useRulesetActivationHistory'
import { useRulesetMetadata } from '@apihub/api-hooks/ApiQuality/useRulesetMetadata'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import capitalize from 'lodash-es/capitalize'
import { RulesetFilePanel } from '../../RulesetFilePanel'
import { RulesetActivationHistoryTable } from './RulesetActivationHistoryTable'

export const SHOW_RULESET_INFO_DIALOG = 'show-ruleset-info-dialog'

const RulesetInfoPopup: FC<PopupProps> = (props) => {
  const { open, setOpen } = props
  const detail = props.detail as Ruleset

  const [ruleset, loadingRuleset] = useRulesetMetadata(detail.id)
  const [{ activationHistory }, loadingActivationHistory] = useRulesetActivationHistory(detail.id)

  const onClose = useCallback(() => { setOpen(false) }, [setOpen])

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          {detail.name}
          <IconButton
            sx={{ color: '#353C4E', p: 0 }}
            onClick={onClose}
            data-testid="CloseRulesetInfoDialogButton"
          >
            <CloseOutlinedIcon />
          </IconButton>
        </Box>
        {ruleset && (
          <Box display='flex' gap={1} mt={1} fontWeight={500}>
            <CustomChip
              value='rulesetSpecType'
              label={RULESET_API_TYPE_TITLE_MAP[ruleset.apiType]}
              data-testid="ValidationRulesetApiTypeChip"
            />
            <CustomChip
              value={ruleset.status === RulesetStatuses.ACTIVE ? 'rulesetActive' : 'rulesetInactive'}
              label={capitalize(ruleset.status)}
              data-testid="ValidationRulesetStatusChip"
            />
          </Box>
        )}
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        {(loadingRuleset || loadingActivationHistory) && (
          <Skeleton variant='text' height={20} />
        )}
        {!loadingRuleset && !loadingActivationHistory && (
          <Placeholder
            invisible={!!ruleset}
            area={NAVIGATION_PLACEHOLDER_AREA}
            message='No ruleset found'
          >
            <Box display='flex' flexDirection='column' gap={1}>
              <RulesetFilePanel ruleset={detail} />
              <RulesetActivationHistoryTable data={activationHistory} />
            </Box>
          </Placeholder>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const RulesetInfoDialog: FC = () => {
  return (
    <PopupDelegate
      type={SHOW_RULESET_INFO_DIALOG}
      render={props => <RulesetInfoPopup {...props} />}
    />
  )
}
