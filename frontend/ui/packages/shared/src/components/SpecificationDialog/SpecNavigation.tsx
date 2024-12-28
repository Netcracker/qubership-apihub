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

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CardContent,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { useMount } from 'react-use'
import { CustomChip } from '../CustomChip'
import type { OpenapiSchema, SpecItemPath, SpecItemUri } from '../../utils/specifications'
import {
  decodeKey,
  encodeKey,
  isSwagger,
  toFormattedOpenApiPathName,
  toOpenApiSchema,
} from '../../utils/specifications'
import { isNotEmpty } from '../../utils/arrays'
import type { MethodType } from '../../entities/method-types'
import { METHOD_TYPES } from '../../entities/method-types'
import type { Key } from '../../entities/keys'

export type SpecNavigationProps = {
  content?: string | null
  selectedUri?: SpecItemUri
  onSelect?: (uri: SpecItemUri) => void
}

export const SpecNavigation: FC<SpecNavigationProps> = /* @__PURE__ */ memo<SpecNavigationProps>(({
  content,
  selectedUri,
  onSelect,
}) => {
  const [schema, { paths, schemaNames, componentsSectionItems }] = useNavigationData(content)

  const [selectedElement, setSelectedElement] = useState<string | null>()
  const navigateAndSelect = useCallback((pathToNavigate: SpecItemPath, elementToSelect?: string): void => {
    onSelect?.(`${ROOT_URI_PREFIX}${pathToNavigate.map(encodeKey).join('/')}`)
    setSelectedElement(elementToSelect)
  }, [onSelect])

  useNavigateToSelectedSpecItemUri(content, selectedUri, navigateAndSelect)

  return (
    <CardContent sx={{ p: 0 }}>
      <Button
        sx={{ width: '100%', height: 28, justifyContent: 'start', pb: 1, pl: 2, color: '#000000' }}
        onClick={() => navigateAndSelect([INFO_SECTION])}
      >
        Overview
      </Button>
      {isNotEmpty(paths) && (
        <Accordion defaultExpanded={true}>
          <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon/>}>
            <Typography variant="button">Paths</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {paths.map(([path, value]) => (
              <ListItemButton
                sx={{ backgroundColor: selectedElement === path ? '#ECEDEF' : 'transparent', pl: 4, pt: 0 }}
                key={path}
                onClick={() => {
                  navigateAndSelect([PATHS_SECTION, path, value.find(({ key }) => !!key)?.method ?? ''], path)
                }}
              >
                <ListItemText primary={toFormattedOpenApiPathName(path)} primaryTypographyProps={{ sx: { mt: 0.25 } }}/>
                <Box display="flex" gap={0.5} mb={0.5} px={0}>
                  {value.filter(({ method }) => METHOD_TYPES.has(method)).map(({ method }, index) => (
                    <CustomChip
                      variant="outlined"
                      key={index}
                      value={method}
                      onClick={event => {
                        event.stopPropagation()
                        navigateAndSelect([PATHS_SECTION, path, method], path)
                      }}
                    />
                  ))}
                </Box>
              </ListItemButton>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
      {isNotEmpty(schemaNames) && (
        <Accordion defaultExpanded={true}>
          <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon/>}>
            <Typography variant="button">Models</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {schemaNames.map(name => (
              <ListItemButton
                sx={{ backgroundColor: selectedElement === name ? '#ECEDEF' : 'transparent', pl: 4, height: 24 }}
                key={name}
                onClick={() => {
                  navigateAndSelect(
                    [...((schema && isSwagger(schema)) ? [DEFINITIONS_SECTION] : [COMPONENTS_SECTION, SCHEMAS_SECTION]), name],
                    name,
                  )
                }}
              >
                <ListItemText primary={name} primaryTypographyProps={{ sx: { mt: 0.25 } }}/>
              </ListItemButton>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
      {componentsSectionItems.map(({ value, title, section }) => (
        isNotEmpty(value) && (
          <Accordion key={title}>
            <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon/>}>
              <Typography variant="button">{title}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {value.map(name => (
                <ListItemButton
                  sx={{ backgroundColor: selectedElement === name ? '#ECEDEF' : 'transparent', pl: 4, height: 24 }}
                  key={name}
                  onClick={() => {
                    navigateAndSelect([COMPONENTS_SECTION, section, name], name)
                  }}
                >
                  <ListItemText primary={name} primaryTypographyProps={{ sx: { mt: 0.25 } }}/>
                </ListItemButton>
              ))}
            </AccordionDetails>
          </Accordion>
        )
      ))}
    </CardContent>
  )
})

function useNavigationData(content?: string | null): [OpenapiSchema | null, NavigationData] {
  const schema = useMemo(() => toOpenApiSchema(content ?? ''), [content])

  return useMemo(() => ([
    schema,
    schema
      ? {
        paths: Object.entries(schema.paths ?? {}).map(([path, value]) => ([path, Object.keys(value).map((methodType) => ({
          key: `${PATHS_URI_PREFIX}${encodeKey(path)}`,
          method: methodType as MethodType,
        }))])),
        schemaNames: Object.keys(schema.components?.schemas ?? schema.definitions ?? []),
        componentsSectionItems: [
          {
            value: Object.keys(schema.components?.securitySchemes ?? []),
            title: 'Security schemas',
            section: SECURITY_SCHEMES_COMPONENTS_SECTION,
          },
          {
            value: Object.keys(schema.components?.links ?? []),
            title: 'Links',
            section: LINKS_COMPONENTS_SECTION,
          },
          {
            value: Object.keys(schema.components?.responses ?? []),
            title: 'Responses',
            section: RESPONSES_COMPONENTS_SECTION,
          },
          {
            value: Object.keys(schema.components?.parameters ?? []),
            title: 'Parameters',
            section: PARAMETERS_COMPONENTS_SECTION,
          },
          {
            value: Object.keys(schema.components?.requestBodies ?? []),
            title: 'RequestBodies',
            section: REQUEST_BODIES_COMPONENTS_SECTION,
          },
          {
            value: Object.keys(schema.components?.headers ?? []),
            title: 'Headers',
            section: HEADERS_COMPONENTS_SECTION,
          },
          {
            value: Object.keys(schema.components?.examples ?? []),
            title: 'Examples',
            section: EXAMPLE_COMPONENTS_SECTION,
          },
          {
            value: Object.keys(schema.components?.callbacks ?? []),
            title: 'Callbacks',
            section: CALLBACKS_COMPONENTS_SECTION,
          },
        ],
      }
      : {
        paths: [],
        schemaNames: [],
        componentsSectionItems: [],
      },
  ]), [schema])
}

type NavigationData = {
  paths: [string, ReadonlyArray<{ key: string; method: MethodType }>][]
  schemaNames: ReadonlyArray<Key>
  componentsSectionItems: ReadonlyArray<{
    value: ReadonlyArray<Key>
    title: string
    section: string
  }>
}

function useNavigateToSelectedSpecItemUri(
  content?: string | null,
  selectedUri?: string,
  navigateAndSelect?: (pathToNavigate: SpecItemPath, toSelect?: string) => void,
): void {
  useMount(() => {
    if (selectedUri) {
      if (selectedUri.startsWith(PATHS_URI_PREFIX)) {
        const [pathName, methodName] = selectedUri.replace(PATHS_URI_PREFIX, '').split('/')
        const path = decodeKey(pathName)
        navigateAndSelect?.([PATHS_SECTION, path, methodName], path)
      }
      if (selectedUri.match(OAS_MODEL_REGEXP)) {
        const navigationPath = selectedUri.split('/').slice(1)
        const schemaName = selectedUri.replace(OAS_MODEL_REGEXP, '').replaceAll('/', '')
        navigateAndSelect?.(navigationPath, schemaName)
      }
    }
  })
}

const OAS_MODEL_REGEXP = /((definitions|components)\/?(schemas)?)\//

const ROOT_URI_PREFIX = '/'
const PATHS_URI_PREFIX = `${ROOT_URI_PREFIX}paths/`

const INFO_SECTION = 'info'
const COMPONENTS_SECTION = 'components'
const PATHS_SECTION = 'paths'
const SCHEMAS_SECTION = 'schemas'
const SECURITY_SCHEMES_COMPONENTS_SECTION = 'securitySchemes'
const LINKS_COMPONENTS_SECTION = 'links'
const RESPONSES_COMPONENTS_SECTION = 'responses'
const PARAMETERS_COMPONENTS_SECTION = 'parameters'
const REQUEST_BODIES_COMPONENTS_SECTION = 'requestBodies'
const HEADERS_COMPONENTS_SECTION = 'headers'
const EXAMPLE_COMPONENTS_SECTION = 'examples'
const CALLBACKS_COMPONENTS_SECTION = 'callbacks'

const DEFINITIONS_SECTION = 'definitions'
