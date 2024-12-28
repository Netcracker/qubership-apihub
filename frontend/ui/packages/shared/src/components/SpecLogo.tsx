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

import type { SpecType } from '../utils/specs'
import {
  isGraphQlSpecType,
  isOpenApiSpecType,
  JSON_SCHEMA_SPEC_TYPE,
  MARKDOWN_SPEC_TYPE,
  OPENAPI_2_0_SPEC_TYPE,
  PROTOBUF_3_SPEC_TYPE,
} from '../utils/specs'
import { FileIcon } from '../icons/FileIcon'
import { MarkdownIcon } from '../icons/MarkdownIcon'
import { SwaggerIcon } from '../icons/SwaggerIcon'
import { OpenapiIcon } from '../icons/OpenapiIcon'
import { JsonSchemaIcon } from '../icons/JsonSchemaIcon'
import { RestApiIcon } from '../icons/RestApiIcon'
import { GraphqlIcon } from '../icons/GraphqlIcon'
import type { ApiType } from '../entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '../entities/api-types'
import { ProtobufIcon } from '../icons/ProtobufIcon'

export type SpecLogoProps = {
  value?: SpecType | ApiType | string
}

// todo fix usages value type to SpecType and change here
export const SpecLogo: FC<SpecLogoProps> = memo<SpecLogoProps>(({ value }) => {
  if (!value) {
    return (
      <FileIcon/>
    )
  }

  if (value === MARKDOWN_SPEC_TYPE) {
    return (
      <MarkdownIcon/>
    )
  }

  if (value === PROTOBUF_3_SPEC_TYPE) {
    return (
      <ProtobufIcon/>
    )
  }

  if (value === JSON_SCHEMA_SPEC_TYPE) {
    return (
      <JsonSchemaIcon/>
    )
  }

  if (value === OPENAPI_2_0_SPEC_TYPE) {
    return (
      <SwaggerIcon/>
    )
  }

  if (isOpenApiSpecType(value as SpecType)) {
    return (
      <OpenapiIcon/>
    )
  }

  if (isGraphQlSpecType(value as SpecType)) {
    return (
      <GraphqlIcon/>
    )
  }

  return API_TYPE_ICON_MAP[value as ApiType] ?? <FileIcon/>
})

const API_TYPE_ICON_MAP: Record<ApiType, ReactElement | null> = {
  [API_TYPE_REST]: <RestApiIcon/>,
  [API_TYPE_GRAPHQL]: null,
}
