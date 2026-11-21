import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { Typography } from '@mui/material'
import { NamespaceToolbar } from './NamespacePage/NamespaceToolbar'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import { PAGE_TITLES } from '../pageTitles'

export const WelcomePage: FC = memo(() => {
  const { agentId, namespaceKey } = useParams()
  useDocumentTitle(PAGE_TITLES.welcome({ agentId: agentId, namespaceKey: namespaceKey }))

  return (
    <PageLayout
      toolbar={
        <Toolbar
          header={<NamespaceToolbar />}
        />
      }
      body={
        <Placeholder
          invisible={false}
          area={CONTENT_PLACEHOLDER_AREA}
          message={
            <Typography width='590px' fontSize='15px'>
              Please select Cloud, Namespace and Portal Workspace to start working with Agent.
              Portal workspace determines where the baseline packages will come from, where
              snapshots and promoted versions will be published.
            </Typography>
          }
        />
      }
    />
  )
})
