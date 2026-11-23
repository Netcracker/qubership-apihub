import { type FC, memo, useMemo } from 'react'

import {
  CONTENT_PLACEHOLDER_AREA,
  NO_PERMISSION,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  USER_ACCESS_MANAGEMENT_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'

import { ACCESS_TOKENS_PAGE, GENERAL_PAGE, USER_ACCESS_CONTROLS_PAGE, VERSIONS_PAGE } from '../../../../routes'
import { AccessTokensLibrarySettingsTab } from './AccessTokensLibrarySettingsTab'
import { GeneralLibrarySettingsTab } from './GeneralLibrarySettingsTab/GeneralLibrarySettingsTab'
import type { LibrarySettingsTabProps } from './librarySettings'
import { useActiveTabContentContext } from './LibrarySettingsPage'
import { UserLibraryAccessControlSettingsTab } from './UserLibraryAccessControlSettingsTab/UserLibraryAccessControlSettingsTab'
import { VersionsLibrarySettingsTab } from './VersionsLibrarySettingsTab/VersionsLibrarySettingsTab'

export const LibrarySettingsBody: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(
  ({ library }) => {
    const activeTab = useActiveTabContentContext()
    const hasTokenManagementPermission = useMemo(
      () => !!library.permissions?.includes(ACCESS_TOKEN_MANAGEMENT_PERMISSION),
      [library],
    )
    const hasUserAccessManagementPermission = useMemo(
      () => !!library.permissions?.includes(USER_ACCESS_MANAGEMENT_PERMISSION),
      [library],
    )

    return (
      <>
        {{
          [GENERAL_PAGE]: <GeneralLibrarySettingsTab key={library.libraryId} library={library} />,
          [VERSIONS_PAGE]: <VersionsLibrarySettingsTab key={library.libraryId} library={library} />,
          [ACCESS_TOKENS_PAGE]: (
            <Placeholder
              invisible={hasTokenManagementPermission}
              area={CONTENT_PLACEHOLDER_AREA}
              message={NO_PERMISSION}
              data-testid="NoPermissionPlaceholder"
            >
              <AccessTokensLibrarySettingsTab key={library.libraryId} library={library} />
            </Placeholder>
          ),
          [USER_ACCESS_CONTROLS_PAGE]: (
            <Placeholder
              invisible={hasUserAccessManagementPermission}
              area={CONTENT_PLACEHOLDER_AREA}
              message={NO_PERMISSION}
              data-testid="NoPermissionPlaceholder"
            >
              <UserLibraryAccessControlSettingsTab key={library.libraryId} library={library} />
            </Placeholder>
          ),
        }[activeTab]}
      </>
    )
  },
)
LibrarySettingsBody.displayName = 'LibrarySettingsBody'
