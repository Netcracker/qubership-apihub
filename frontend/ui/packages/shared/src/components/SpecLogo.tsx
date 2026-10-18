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

import type { FC, ReactElement } from 'react'
import { memo } from 'react'

import type { ApiType } from '../entities/api-types'
import { API_TYPE_ASYNCAPI, API_TYPE_GRAPHQL, API_TYPE_REST } from '../entities/api-types'
import { AsyncApiIcon } from '../icons/AsyncApiIcon'
import { DdlIcon } from '../icons/DdlIcon'
import { FileIcon } from '../icons/FileIcon'
import { GraphqlIcon } from '../icons/GraphqlIcon'
import { JsonSchemaIcon } from '../icons/JsonSchemaIcon'
import { MarkdownIcon } from '../icons/MarkdownIcon'
import { McpInitIcon } from '../icons/McpInitIcon'
import { McpPromptIcon } from '../icons/McpPromptIcon'
import { McpResourceIcon } from '../icons/McpResourceIcon'
import { McpToolIcon } from '../icons/McpToolIcon'
import { OpenapiIcon } from '../icons/OpenapiIcon'
import { ProtobufIcon } from '../icons/ProtobufIcon'
import { RestApiIcon } from '../icons/RestApiIcon'
import { SwaggerIcon } from '../icons/SwaggerIcon'
import type { SpecType } from '../utils/specs'
import { isAsyncApiSpecType } from '../utils/specs'
import {
  DDL_DOCUMENT_TYPE,
  isGraphQlSpecType,
  isOpenApiSpecType,
  JSON_SCHEMA_SPEC_TYPE,
  MARKDOWN_SPEC_TYPE,
  MCP_DOCUMENT_TYPE,
  OPENAPI_2_0_SPEC_TYPE,
  PROTOBUF_3_SPEC_TYPE,
} from '../utils/specs'

export type SpecLogoProps = {
  // TODO 23.06.25 // Fix this type, because it has no sense
  value?: SpecType | ApiType | string
}

// todo fix usages value type to SpecType and change here
export const SpecLogo: FC<SpecLogoProps> = memo<SpecLogoProps>(({ value }) => {
  if (!value) {
    return (<FileIcon/>)
  }

  if (value === MARKDOWN_SPEC_TYPE) {
    return (<MarkdownIcon/>)
  }

  if (value === PROTOBUF_3_SPEC_TYPE) {
    return (<ProtobufIcon/>)
  }

  if (value === JSON_SCHEMA_SPEC_TYPE) {
    return (<JsonSchemaIcon/>)
  }

  if (value === OPENAPI_2_0_SPEC_TYPE) {
    return (<SwaggerIcon/>)
  }

  if (isOpenApiSpecType(value as SpecType)) {
    return (<OpenapiIcon/>)
  }

  if (isGraphQlSpecType(value as SpecType)) {
    return (<GraphqlIcon/>)
  }

  if (isAsyncApiSpecType(value as SpecType)) {
    return (<AsyncApiIcon/>)
  }

  if (value === MCP_DOCUMENT_TYPE.MCP_INIT) {
    return (<McpInitIcon fontSize="small"/>)
  }

  if (value === MCP_DOCUMENT_TYPE.MCP_TOOLS) {
    return (<McpToolIcon fontSize="small"/>)
  }

  if (value === MCP_DOCUMENT_TYPE.MCP_PROMPTS) {
    return (<McpPromptIcon fontSize="small"/>)
  }

  if (value === MCP_DOCUMENT_TYPE.MCP_RESOURCES) {
    return (<McpResourceIcon fontSize="small"/>)
  }

  if (value === DDL_DOCUMENT_TYPE.DDL) {
    return (<DdlIcon fontSize="small"/>)
  }

  return API_TYPE_ICON_MAP[value as ApiType] ?? <FileIcon/>
})

SpecLogo.displayName = 'SpecLogo'

const API_TYPE_ICON_MAP: Record<ApiType, ReactElement | null> = {
  [API_TYPE_REST]: <RestApiIcon/>,
  [API_TYPE_GRAPHQL]: <GraphqlIcon/>,
  [API_TYPE_ASYNCAPI]: <AsyncApiIcon/>,
}
