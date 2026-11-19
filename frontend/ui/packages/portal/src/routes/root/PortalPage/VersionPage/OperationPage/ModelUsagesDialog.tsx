import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { ModelUsagesDetail } from '../../../../EventBusProvider'
import { SHOW_MODEL_USAGES_DIALOG } from '../../../../EventBusProvider'
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { OperationsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { TaggedOperationWithMetaList } from '@netcracker/qubership-apihub-ui-shared/components/TaggedOperationWithMetaList'

export const ModelUsagesDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_MODEL_USAGES_DIALOG}
      render={props => <ModelUsagesPopup {...props}/>}
    />
  )
})

const ModelUsagesPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [modelName, usagesPromise, prepareLinkFn] = useMemo(() => {
    const { modelName, usages, prepareLinkFn } = detail as ModelUsagesDetail
    return [modelName, usages, prepareLinkFn]
  }, [detail])

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [usages, setUsages] = useState<OperationsGroupedByTag>({})

  useEffect(() => {
    setIsLoading(true)
    usagesPromise?.then((usages) => {
      setUsages(usages)
      setIsLoading(false)
    })
  }, [usagesPromise])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: '10px', maxWidth: 'none', width: 1092, height: 730 } }}
    >
      <DialogTitle sx={{ padding: '16px' }}>
        Operations that use {modelName} model:
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, color: '#626D82' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{
        width: '100%',
        padding: '16px',
        display: 'flex',
        placeContent: 'space-between center',
      }}>
        <TaggedOperationWithMetaList
          operations={usages}
          prepareLinkFn={prepareLinkFn}
          isLoading={isLoading}
          openLinkInNewTab
        />
      </DialogContent>
    </Dialog>
  )
})
