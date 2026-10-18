import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'

import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_MCP,
  type ContractType,
  isContractType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

import { DdlTablePage } from './OperationPage/DdlTablePage'
import { McpEntityPage } from './OperationPage/McpEntityPage'
import { OperationPage } from './OperationPage/OperationPage'

const CONTRACT_DETAIL_PAGES: Record<ContractType, FC> = {
  [CONTRACT_TYPE_MCP]: McpEntityPage,
  [CONTRACT_TYPE_DDL]: DdlTablePage,
}

export const ContractDetailPage: FC = memo(() => {
  const { apiType } = useParams<{ apiType: string }>()

  if (apiType && isContractType(apiType)) {
    const DetailPage = CONTRACT_DETAIL_PAGES[apiType]
    return <DetailPage />
  }

  return <OperationPage />
})

ContractDetailPage.displayName = 'ContractDetailPage'
