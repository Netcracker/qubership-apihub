import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, Divider, MenuItem, styled, Typography } from '@mui/material'
import { type FC, memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { OutlinedIconButton } from '@netcracker/qubership-apihub-ui-shared/components/OutlinedIconButton'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import { PUBLISH_STATUSES } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'

import { LibrarySettingsButton } from '@portal/components/LibrarySettingsButton'
import { API_CHANGES_PAGE } from '../../../../routes'
import { LibraryBreadcrumbs } from '../LibraryBreadcrumbs'
import {
  canManageLibraryVersion,
  getManageableVersionStatuses,
  NO_VERSION_PERMISSION_HINT,
} from '../libraryPermissions'
import { EditLibraryVersionDialog } from '../LibrarySettingsPage/VersionsLibrarySettingsTab/EditLibraryVersionDialog'
import { PublishLibraryDialog } from '../PublishLibraryDialog'
import { CompareLibraryVersionsDialog } from './CompareLibraryVersionsDialog'
import { getLibraryVersionPath, type LibraryVersionPageProps } from './library-version'
import { LibraryVersionSelector } from './LibraryVersionSelector'

export const LibraryVersionToolbar: FC<LibraryVersionPageProps> = memo<LibraryVersionPageProps>(
  ({ library, version }) => {
    const [isPublishOpen, setPublishOpen] = useState(false)
    const [isEditOpen, setEditOpen] = useState(false)
    const [isCompareOpen, setCompareOpen] = useState(false)
    const navigate = useNavigate()
    const canPublish = getManageableVersionStatuses(library).length > 0
    const canEdit = canManageLibraryVersion(library, version.status)
    return (
      <>
        <Toolbar
          breadcrumbs={<LibraryBreadcrumbs library={library} />}
          data-testid="LibraryVersionToolbar"
          header={
            <>
              <ToolbarTitle value={library.name} />
              <Typography sx={{ ml: 2 }} variant="subtitle3">Version</Typography>
              <LibraryVersionSelector version={version} />
              <VersionStatusChip
                status={version.status}
                label={PUBLISH_STATUSES.get(version.status)}
                sx={{ height: 20 }}
                data-testid="VersionStatusChip"
              />
              <Divider orientation="vertical" sx={{ height: '20px', mt: '6px' }} />
              <ButtonWithHint
                title=""
                color="primary"
                startIcon={<AddIcon color="currentColor" />}
                aria-label="Publish library version"
                hint="You do not have permission to publish library versions"
                disableHint={canPublish}
                tooltipMaxWidth="unset"
                disabled={!canPublish}
                onClick={() => setPublishOpen(true)}
                data-testid="AddNewVersionButton"
              />
            </>
          }
          action={
            <ToolbarActions>
              <CompareButton
                title="Compare"
                variant="outlined"
                startIcon={<CompareArrowsOutlinedIcon />}
                endIcon={<KeyboardArrowDownOutlinedIcon />}
                data-testid="CompareMenuButton"
              >
                <MenuItem onClick={() => setCompareOpen(true)} data-testid="VersionsMenuItem">
                  Versions
                </MenuItem>
                <MenuItem
                  disabled={!version.previousVersion}
                  onClick={() => navigate(getLibraryVersionPath(library.libraryId, version.version, API_CHANGES_PAGE))}
                  data-testid="PreviousVersionMenuItem"
                >
                  Compare with previous version
                </MenuItem>
              </CompareButton>
              <OutlinedIconButton
                aria-label="Edit library version"
                onClick={() => setEditOpen(true)}
                startIcon={<EditIcon color="currentColor" />}
                disabled={!canEdit}
                hint={canEdit ? 'Edit version' : NO_VERSION_PERMISSION_HINT}
                data-testid="EditButton"
              />
              <LibrarySettingsButton libraryId={library.libraryId} visible />
            </ToolbarActions>
          }
        />
        {isPublishOpen && (
          <PublishLibraryDialog
            library={library}
            onClose={() => setPublishOpen(false)}
            onPublished={published => navigate(getLibraryVersionPath(library.libraryId, published.version))}
          />
        )}
        {isEditOpen && (
          <EditLibraryVersionDialog
            version={version}
            library={library}
            onClose={() => setEditOpen(false)}
          />
        )}
        {isCompareOpen && <CompareLibraryVersionsDialog version={version} onClose={() => setCompareOpen(false)} />}
      </>
    )
  },
)
LibraryVersionToolbar.displayName = 'LibraryVersionToolbar'

const ToolbarActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}))
const CompareButton = styled(MenuButton)({
  width: 145,
  '& .MuiButton-startIcon': { marginRight: '7px' },
  '& .MuiButton-endIcon': { marginLeft: '7px' },
})
