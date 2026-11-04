import { LoadingButton } from '@mui/lab'
import { Box, Dialog, DialogContent, DialogTitle, Divider, IconButton, Skeleton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type {
  VersionNotification,
  VersionNotifications,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-notifications'
import type {
  FetchNextNotificationsPage,
} from '@netcracker/qubership-apihub-ui-shared/hooks/notifications/notificationsQuery'
import {
  useInfiniteVersionNotifications,
} from '@netcracker/qubership-apihub-ui-shared/hooks/notifications/useInfiniteVersionNotifications'
import { CloseIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloseIcon'
import { ExportIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ExportIcon'
import type { HasNextPage, IsFetchingNextPage } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import {
  SHOW_DOCUMENT_NOTIFICATIONS_DIALOG,
  type ShowDocumentNotificationsDetail,
} from '@portal/routes/EventBusProvider'
import { type FC, memo, useCallback, useMemo, useState } from 'react'

import { useDocuments } from '../../useDocuments'
import { DocumentNotificationsTable } from './DocumentNotificationsTable'
import type { DocumentSelection } from './DocumentSelector'
import { DocumentSelector, EMPTY_DOCUMENT_OPTION } from './DocumentSelector'
import { useExportDocumentNotifications } from './useExportDocumentNotifications'

export const DocumentNotificationsDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_DOCUMENT_NOTIFICATIONS_DIALOG}
      render={props => <DocumentNotificationsPopup {...props} />}
    />
  )
})

DocumentNotificationsDialog.displayName = 'DocumentNotificationsDialog'

const DIALOG_PAPER_STYLE = {
  margin: 3,
  width: 'calc(100% - 48px)',
  maxWidth: 'calc(100% - 48px)',
  height: 'calc(100% - 48px)',
  maxHeight: 'calc(100% - 48px)',
} as const

const DocumentNotificationsPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const {
    packageKey,
    versionKey,
    documentId,
    documentTitle,
  } = detail as ShowDocumentNotificationsDetail

  const onClose = useCallback(() => setOpen(false), [setOpen])

  const [picked, setPicked] = useState<DocumentSelection>()
  const selected = picked ?? documentId
  const isEmptySelected = selected === EMPTY_DOCUMENT_OPTION

  const notificationsScope = useMemo(
    () => (isEmptySelected ? { emptyDocumentId: true } : { documentId: selected }),
    [isEmptySelected, selected],
  )

  const { documents } = useDocuments({
    packageKey: packageKey,
    versionKey: versionKey,
    enabled: true,
  })

  const {
    notifications,
    isLoading,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteVersionNotifications({
    packageKey: packageKey,
    versionKey: versionKey,
    ...notificationsScope,
  })

  const [exportDocumentNotifications, isExporting] = useExportDocumentNotifications()

  const handleExport = useCallback(() => {
    exportDocumentNotifications({
      packageKey: packageKey,
      versionKey: versionKey,
      ...notificationsScope,
    })
  }, [exportDocumentNotifications, notificationsScope, packageKey, versionKey])

  return (
    <Dialog
      fullWidth
      maxWidth={false}
      open={open}
      onClose={onClose}
      PaperProps={{ sx: DIALOG_PAPER_STYLE }}
    >
      <StyledDialogTitle>
        <TitleRow>
          <Typography variant="h5" data-testid="DialogTitle">
            Document Notifications
          </Typography>
          <CloseIconButton
            data-testid="CloseButton"
            size="small"
            onClick={onClose}
          >
            <CloseIcon fontSize="small" />
          </CloseIconButton>
        </TitleRow>
        <SubtitleRow>
          <DocumentSelector
            options={documents}
            selected={selected}
            fallbackTitle={documentTitle}
            onSelect={setPicked}
          />
          <ExportButton
            data-testid="ExportButton"
            size="small"
            variant="outlined"
            loading={isExporting}
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </ExportButton>
        </SubtitleRow>
      </StyledDialogTitle>

      <Divider />

      <StyledDialogContent>
        <DocumentNotificationsContent
          notifications={notifications}
          isLoading={isLoading}
          error={error}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
        />
      </StyledDialogContent>
    </Dialog>
  )
})

DocumentNotificationsPopup.displayName = 'DocumentNotificationsPopup'

type DocumentNotificationsContentProps = {
  notifications: VersionNotifications
  isLoading: boolean
  error: Error | null
  fetchNextPage: FetchNextNotificationsPage
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

const DocumentNotificationsContent: FC<DocumentNotificationsContentProps> = memo<DocumentNotificationsContentProps>(({
  notifications,
  isLoading,
  error,
  fetchNextPage,
  isFetchingNextPage,
  hasNextPage,
}) => {
  const [selectedId, setSelectedId] = useState<string>()

  const selected: VersionNotification | undefined = notifications.find(({ id }) => id === selectedId) ??
    notifications[0]

  if (isLoading) {
    return (
      <PaddedBox data-testid="NotificationsSkeleton">
        <Skeleton variant="text" height={20} />
        <Skeleton variant="text" height={20} />
        <Skeleton variant="text" height={20} />
      </PaddedBox>
    )
  }

  if (error) {
    return (
      <Placeholder
        invisible={false}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message="Failed to load the notifications"
      />
    )
  }

  return (
    <Placeholder
      invisible={!!selected}
      area={NAVIGATION_PLACEHOLDER_AREA}
      message="No notifications found"
    >
      <SplitLayout>
        <TablePane>
          <DocumentNotificationsTable
            data={notifications}
            selectedId={selected?.id}
            onSelectNotification={setSelectedId}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
          />
        </TablePane>

        <MessagePane data-testid="NotificationMessage">
          <MessageText>{selected?.message}</MessageText>
        </MessagePane>
      </SplitLayout>
    </Placeholder>
  )
})

DocumentNotificationsContent.displayName = 'DocumentNotificationsContent'

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  padding: theme.spacing(1.5, 3),
}))

const TitleRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})

const SubtitleRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 32,
})

const CloseIconButton = styled(IconButton)({
  padding: 0,
  marginLeft: 'auto',
})

const ExportButton = styled(LoadingButton)({
  marginLeft: 'auto',
  flexShrink: 0,
})

const StyledDialogContent = styled(DialogContent)({
  padding: 0,
  overflow: 'hidden',
  width: '100%',
  flex: 1,
  minHeight: 0,
})

const SplitLayout = styled(Box)({
  display: 'flex',
  height: '100%',
})

const TablePane = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  overflow: 'auto',
  borderRight: `1px solid ${theme.palette.divider}`,
}))

const MessagePane = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  overflow: 'auto',
  padding: theme.spacing(1.5, 3),
}))

const PaddedBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 3),
}))

const MessageText = styled(Typography)({
  fontFamily: 'monospace',
  fontSize: 13,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.6,
})
