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

import type { FC, PropsWithChildren, ReactNode, SyntheticEvent } from 'react'
import React, { memo, useMemo } from 'react'
import TreeItem from '@mui/lab/TreeItem'
import type { SectionKey } from './OperationModelList'
import { joinedJsonPath } from '@netcracker/qubership-apihub-ui-shared/utils/operations'
import type { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import type { OpenApiCustomSchemaObject } from '@apihub/entities/operation-structure'
import type { HashWithTitle } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'

type ItemProps = PropsWithChildren & {
  label: ReactNode
  scopeDeclarationPath: JsonPath
  declarationPath: JsonPath
  onClick?: (event: SyntheticEvent, nodeId: string, scopeDeclarationPath: JsonPath, declarationPath: JsonPath, schemaTolerantHashWithTitle?: HashWithTitle, schemaObject?: OpenApiCustomSchemaObject) => void
}

type SectionItemProps = PropsWithChildren & ItemProps & {
  sectionKey: SectionKey
  disabled: boolean
}

type ModelItemProps = ItemProps & {
  schemaTolerantHashWithTitle?: HashWithTitle
  schemaObject?: OpenApiCustomSchemaObject
}

export const SectionItem: FC<SectionItemProps> = memo<SectionItemProps>(({
  sectionKey,
  scopeDeclarationPath,
  declarationPath,
  disabled,
  label,
  onClick,
  children,
}) => {
  return (
    <TreeItem
      key={`${sectionKey}-${disabled ? 'disabled' : 'enabled'}`}
      nodeId={sectionKey}
      disabled={disabled}
      label={label}
      onClick={(event) => onClick?.(event, sectionKey, scopeDeclarationPath, declarationPath)}
      sx={TREE_ITEM_ROOT_LABEL_STYLES}
    >
      {children}
    </TreeItem>
  )
})

export const ModelItem: FC<ModelItemProps> = memo<ModelItemProps>(({
  scopeDeclarationPath,
  declarationPath,
  schemaTolerantHashWithTitle,
  schemaObject,
  label,
  onClick,
}) => {
  const nodeId = useMemo(() => joinedJsonPath(declarationPath), [declarationPath])

  return (
    <TreeItem
      key={nodeId}
      nodeId={nodeId}
      label={label}
      onClick={(event) => onClick?.(event, nodeId, scopeDeclarationPath, declarationPath, schemaTolerantHashWithTitle, schemaObject)}
      sx={TREE_ITEM_CHILD_LABEL_STYLES}
    />
  )
})

const SELECTED_COLOR = '#F2F3F5'
const HOVER_COLOR = '#0000000A'

const TREE_ITEM_ROOT_LABEL_STYLES = {
  '.MuiTreeItem-content': {
    '&.Mui-selected': {
      backgroundColor: SELECTED_COLOR,
      '& .hoverable': {
        visibility: 'visible',
      },
      '&.Mui-focused': {
        backgroundColor: SELECTED_COLOR,
      },
    },

    '&.Mui-focused': {
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: HOVER_COLOR,
      },
    },

    '.MuiTreeItem-label': {
      fontSize: 13,
      fontWeight: 500,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'noWrap',
      height: '28px',
      paddingTop: '2px',
    },
  },
}

const TREE_ITEM_CHILD_LABEL_STYLES = Object.assign({}, TREE_ITEM_ROOT_LABEL_STYLES, {
  '.MuiTreeItem-content': {
    '.MuiTreeItem-label': {
      fontWeight: 400,
    },
  },
})
