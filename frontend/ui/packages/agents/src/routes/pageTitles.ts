/*
 * Browser tab titles of the Agent: which parts each page shows and in which order.
 * Pages pass data and never build strings. The wording is in `pageTitleLabels.ts`.
 */

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  createDocumentTitleFormat,
  type DocumentTitleFormat,
  type DocumentTitleSegments,
} from '@netcracker/qubership-apihub-ui-shared/utils/document-title'

import { AGENTS_APP_NAME, NAMESPACE_TAB_TITLES, type NamespaceTitleTab, PAGE_TITLE_LABELS } from './pageTitleLabels'
import { SECURITY_REPORTS_PAGE } from './routes'

type WelcomeTitleParams = Partial<{
  agentId: Key
  /** Set when the namespace is selected and only the workspace is missing. */
  namespaceKey: Key
}>

type NamespaceTitleParams = Partial<{
  /** The namespace page tab, the first segment of the path after the namespace. */
  mode: string
  /** The tab inside the namespace page tab, the second segment; only Security Reports has them. */
  subTab: string
  namespaceKey: Key
  agentId: Key
}>

export const AGENTS_DOCUMENT_TITLE_FORMAT: DocumentTitleFormat = createDocumentTitleFormat(AGENTS_APP_NAME)

export const PAGE_TITLES = {
  welcome: ({ agentId, namespaceKey }: WelcomeTitleParams): DocumentTitleSegments => [
    namespaceKey ? PAGE_TITLE_LABELS.selectWorkspace : PAGE_TITLE_LABELS.selectNamespace,
    namespaceKey,
    agentId,
  ],
  namespace: ({ mode, subTab, namespaceKey, agentId }: NamespaceTitleParams): DocumentTitleSegments => [
    NAMESPACE_TAB_TITLES[toNamespaceTitleTab(mode, subTab)],
    namespaceKey,
    agentId,
  ],
}

function toNamespaceTitleTab(mode: string | undefined, subTab: string | undefined): NamespaceTitleTab {
  return (mode === SECURITY_REPORTS_PAGE ? subTab : mode) as NamespaceTitleTab
}
