/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { type FC, memo, type ReactNode } from 'react'
import { Box, styled, Typography } from '@mui/material'

import { ApiTypeSelector } from '../ApiTypeSelector'
import type { ApiType } from '../../entities/api-types'
import type { ContractType } from '../../entities/contract-types'
import type { ApiTypeProblemDetails } from '../../hooks/versions/apiTypeProblemDetails'

export type PageTitleProps = {
  title: string
  titleComponent?: ReactNode
  additionalSelectors?: ReactNode
  apiType?: ApiType | ContractType
  allowedApiTypes?: ReadonlyArray<ApiType | ContractType>
  apiTypeProblems?: Partial<Record<ApiType | ContractType, ApiTypeProblemDetails>>
  withApiSelector?: boolean
  onApiTypeChange?: (apiType: ApiType | ContractType) => void
}

// First Order Component //
export const PageTitle: FC<PageTitleProps> = memo<PageTitleProps>(({
  title,
  titleComponent,
  additionalSelectors,
  apiType,
  allowedApiTypes,
  apiTypeProblems,
  withApiSelector = false,
  onApiTypeChange,
}) => {
  return (
    <PageTitleRoot>
      <TitleContainer>
        <TitleText noWrap variant="body1">
          {title}
        </TitleText>
        {titleComponent && (
          <TitleComponentContainer>
            {titleComponent}
          </TitleComponentContainer>
        )}
      </TitleContainer>

      <SelectorsContainer>
        {withApiSelector && apiType && allowedApiTypes && (
          <ApiTypeSelector
            apiType={apiType}
            allowedApiTypes={allowedApiTypes}
            apiTypeProblems={apiTypeProblems}
            onChange={onApiTypeChange}
          />
        )}
        {additionalSelectors}
      </SelectorsContainer>
    </PageTitleRoot>
  )
})

PageTitle.displayName = 'PageTitle'

const PageTitleRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  flexGrow: 1,
  gap: theme.spacing(3),
  marginRight: theme.spacing(3),
  height: theme.spacing(4),
}))

const TitleContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  overflow: 'hidden',
}))

const TitleText = styled(Typography)({
  fontSize: 15,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  flexShrink: 0,
})

const TitleComponentContainer = styled(Box)({
  fontSize: 15,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
})

const SelectorsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexShrink: 0,
}))
