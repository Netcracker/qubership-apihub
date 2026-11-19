import { type FC, memo, type ReactNode } from 'react'

import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'

import { ACTIVITY_HISTORY_PAGE, SUMMARY_PAGE } from '../../../../../routes'
import type { LibraryVersionPageProps } from '../library-version'
import { LibraryActivityTab } from '../LibraryActivityTab'
import { LibrarySummaryTab } from '../LibrarySummaryTab'
import { LibraryOverviewSidebar } from './LibraryOverviewSidebar'

export const LibraryVersionOverviewSubPage: FC<LibraryVersionPageProps> = memo<LibraryVersionPageProps>(
  ({ library, version }) => {
    const [, sidebarItem] = useActiveTabs()
    const overviewSubPageMap: Record<string, ReactNode> = {
      [SUMMARY_PAGE]: <LibrarySummaryTab library={library} version={version} />,
      [ACTIVITY_HISTORY_PAGE]: <LibraryActivityTab version={version} />,
    }

    return (
      <PageLayout
        nestedPage
        navigation={<LibraryOverviewSidebar />}
        body={overviewSubPageMap[sidebarItem]}
        data-testid="OverviewTab"
      />
    )
  },
)
LibraryVersionOverviewSubPage.displayName = 'LibraryVersionOverviewSubPage'
