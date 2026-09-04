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

import type { Meta, StoryFn } from '@storybook/react'
import { Box } from '@mui/material'
import { VersionStatusChip } from '../components/VersionStatusChip'
import { PersonalAccessTokenStatusChip } from '../components/PersonalAccessTokenStatusChip'
import { DdlSchemaChip } from '../components/Ddl/DdlSchemaChip'
import { HttpMethodChip } from '../components/Operations/HttpMethodChip'
import { GraphQlOperationTypeChip } from '../components/Operations/GraphQlOperationTypeChip'
import { AsyncApiActionChip } from '../components/Operations/AsyncApiActionChip'
import { DeprecatedBadge } from '../components/Operations/DeprecatedBadge'
import { VERSION_STATUSES } from '../entities/version-status'
import { METHOD_TYPES } from '../entities/method-types'
import {
  MUTATION_OPERATION_TYPE,
  QUERY_OPERATION_TYPE,
  SUBSCRIPTION_OPERATION_TYPE,
} from '../entities/graphql-operation-types'
import { RECEIVE_OPERATION_TYPE, SEND_OPERATION_TYPE } from '../entities/asyncapi-operation-types'
import {
  PERSONAL_ACCESS_TOKEN_STATUS_ACTIVE,
  PERSONAL_ACCESS_TOKEN_STATUS_EXPIRED,
} from '../types/tokens'

const meta: Meta = {
  title: 'Semantic Chips',
}

export default meta

const Row: StoryFn = () => (
  <Box display="flex" flexDirection="column" gap={2}>
    <Box display="flex" gap={1} alignItems="center">
      {VERSION_STATUSES.map(status => <VersionStatusChip key={status} status={status}/>)}
    </Box>
    <Box display="flex" gap={1} alignItems="center">
      {[...METHOD_TYPES].map(method => <HttpMethodChip key={method} method={method}/>)}
    </Box>
    <Box display="flex" gap={1} alignItems="center">
      {([QUERY_OPERATION_TYPE, MUTATION_OPERATION_TYPE, SUBSCRIPTION_OPERATION_TYPE] as const).map(type => (
        <GraphQlOperationTypeChip key={type} operationType={type}/>
      ))}
    </Box>
    <Box display="flex" gap={1} alignItems="center">
      {([SEND_OPERATION_TYPE, RECEIVE_OPERATION_TYPE] as const).map(action => (
        <AsyncApiActionChip key={action} action={action}/>
      ))}
    </Box>
    <Box display="flex" gap={1} alignItems="center">
      {([PERSONAL_ACCESS_TOKEN_STATUS_ACTIVE, PERSONAL_ACCESS_TOKEN_STATUS_EXPIRED] as const).map(status => (
        <PersonalAccessTokenStatusChip key={status} status={status} label={status}/>
      ))}
    </Box>
    <Box display="flex" gap={1} alignItems="center">
      <DeprecatedBadge/>
      <DdlSchemaChip label="public.orders"/>
    </Box>
  </Box>
)

export const AllSemanticChips = Row.bind({})
AllSemanticChips.storyName = 'All semantic chips'
