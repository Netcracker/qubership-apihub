import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, Button, Menu, MenuItem, styled } from '@mui/material'
import { type FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { OutlinedIconButton } from '@netcracker/qubership-apihub-ui-shared/components/OutlinedIconButton'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import { PUBLISH_STATUSES } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'

import { LibrarySettingsButton } from '@portal/components/LibrarySettingsButton'
import type { LibraryVersionDto, MavenLibraryDto } from '@portal/entities/libraries'
import { LibraryBreadcrumbs } from '../LibraryBreadcrumbs'
import {
  canManageLibraryVersion,
  getManageableVersionStatuses,
  NO_VERSION_PERMISSION_HINT,
} from '../libraryPermissions'
import { EditLibraryVersionDialog } from '../LibrarySettingsPage/EditLibraryVersionDialog'
import { PublishLibraryDialog } from '../PublishLibraryDialog'
import { CompareLibraryVersionsDialog } from './CompareLibraryVersionsDialog'
import { getLibraryVersionPath } from './library-version'
import { LibraryVersionSelector } from './LibraryVersionSelector'

type LibraryVersionToolbarProps = { library: MavenLibraryDto; version: LibraryVersionDto }

export const LibraryVersionToolbar: FC<LibraryVersionToolbarProps> = ({ library, version }) => {
  const [isPublishOpen, setPublishOpen] = useState(false)
  const [isEditOpen, setEditOpen] = useState(false)
  const [isCompareOpen, setCompareOpen] = useState(false)
  const [compareAnchor, setCompareAnchor] = useState<HTMLElement | null>(null)
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
            <LibraryVersionSelector version={version} />
            <VersionStatusChip
              status={version.status}
              label={PUBLISH_STATUSES.get(version.status)}
              sx={{ height: 20 }}
            />
            <ButtonWithHint
              title=""
              color="primary"
              startIcon={<AddIcon color="currentColor" />}
              aria-label="Publish library version"
              hint={canPublish ? 'Publish' : 'You do not have permission to publish library versions'}
              disabled={!canPublish}
              onClick={() => setPublishOpen(true)}
            />
          </>
        }
        action={
          <ToolbarActions>
            <CompareButton
              variant="outlined"
              startIcon={<CompareArrowsOutlinedIcon />}
              endIcon={<KeyboardArrowDownOutlinedIcon />}
              onClick={event => setCompareAnchor(event.currentTarget)}
            >
              Compare
            </CompareButton>
            <OutlinedIconButton
              aria-label="Edit library version"
              onClick={() => setEditOpen(true)}
              startIcon={<EditIcon color="currentColor" />}
              disabled={!canEdit}
              hint={canEdit ? 'Edit version' : NO_VERSION_PERMISSION_HINT}
            />
            <LibrarySettingsButton libraryId={library.libraryId} visible />
          </ToolbarActions>
        }
      />
      <Menu anchorEl={compareAnchor} open={!!compareAnchor} onClose={() => setCompareAnchor(null)}>
        <MenuItem
          onClick={() => {
            setCompareAnchor(null)
            setCompareOpen(true)
          }}
        >
          Compare versions
        </MenuItem>
        <MenuItem
          disabled={!version.previousVersion}
          onClick={() => {
            setCompareAnchor(null)
            navigate(getLibraryVersionPath(library.libraryId, version.version, 'changes'))
          }}
        >
          Compare with previous version
        </MenuItem>
      </Menu>
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
}
LibraryVersionToolbar.displayName = 'LibraryVersionToolbar'

const ToolbarActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}))
const CompareButton = styled(Button)({ width: 145 })
