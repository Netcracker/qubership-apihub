import { type FC, memo } from 'react'

import { styled } from '@mui/material/styles'

import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'

type DeleteChatConfirmationProps = {
  open: boolean
  loading: boolean
  chatTitle?: string
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteChatConfirmation: FC<DeleteChatConfirmationProps> = memo(({
  open,
  loading,
  chatTitle,
  onConfirm,
  onCancel,
}) => {
  const title = chatTitle?.trim() || 'this chat'

  return (
    <ConfirmationDialog
      open={open}
      title="Delete the chat?"
      message={
        <>
          Chat <MessageTitleEmphasis>{title}</MessageTitleEmphasis> will be permanently deleted.
        </>
      }
      loading={loading}
      confirmButtonName="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
})

const MessageTitleEmphasis = styled('span')(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  fontWeight: 500,
}))

DeleteChatConfirmation.displayName = 'DeleteChatConfirmation'
