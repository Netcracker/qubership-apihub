import { type FC, memo } from 'react'

import type { DocumentTitleSegments } from '@netcracker/qubership-apihub-ui-shared/utils/document-title'

import { usePageTitle } from '@portal/routes/usePageTitle'

type PageTitleProps = {
  segments: DocumentTitleSegments
}

/**
 * Sets the tab title for a route whose page cannot call `usePageTitle` itself,
 * for example pages from the shared package. Renders nothing.
 */
export const PageTitle: FC<PageTitleProps> = memo<PageTitleProps>(({ segments }) => {
  usePageTitle(segments)
  return null
})

PageTitle.displayName = 'PageTitle'
