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

import type { Meta, StoryObj } from '@storybook/react'
import { Box, CssBaseline, ThemeProvider } from '@mui/material'
import type { FC } from 'react'
import React from 'react'
import { markdownSample } from './samples/markdown-sample'
import { MarkdownViewer } from '../components/SpecificationDialog/MarkdownViewer'
import { useSpecViewer } from '../components/SpecificationDialog/useSpecViewer'
import type { SpecificationDialogDetail } from '../components/SpecificationDialog/SpecificationDialog'
import { SpecificationPopup } from '../components/SpecificationDialog/SpecificationDialog'
import type { FileExtension } from '../utils/files'
import { GRAPHQL_FILE_EXTENSION, JSON_FILE_EXTENSION } from '../utils/files'
import type { SpecType } from '../utils/specs'
import { GRAPHQL_SCHEMA_SPEC_TYPE, OPENAPI_3_0_SPEC_TYPE } from '../utils/specs'
import type { PopupProps } from '../components/PopupDelegate'
import { theme } from '../themes/theme'
import { openapiSample } from './samples/openapi-samples'
import { graphqlSample } from './samples/graphql-samples'

const GRAPHQL_SPEC = {
  key: 'CPM.graphql',
  name: 'CPM.graphql',
  extension: GRAPHQL_FILE_EXTENSION as FileExtension,
  type: GRAPHQL_SCHEMA_SPEC_TYPE as SpecType,
}

const OPENAPI_SPEC = {
  key: 'data.json',
  serviceKey: 'data-aggregator',
  name: 'data',
  extension: JSON_FILE_EXTENSION as FileExtension,
  type: OPENAPI_3_0_SPEC_TYPE as SpecType,
}

const SpecificationPopupWrapper: FC<PopupProps & { value: string }> = ({ open, setOpen, detail, value }) => {
  const { spec } = detail as SpecificationDialogDetail
  const {
    viewer,
    viewModes,
    viewMode,
    setViewMode,
  } = useSpecViewer({ spec: spec, value: value })

  return <SpecificationPopup
    open={open}
    setOpen={setOpen}
    detail={{
      spec: spec,
      viewer: viewer,
      viewModes: viewModes,
      viewMode: viewMode,
      setViewMode: setViewMode,
    }}
  />
}

const meta: Meta<typeof SpecificationPopup> = {
  title: 'Specification Dialog',
  component: SpecificationPopup,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline/>
        <Box sx={{ width: '800px' }}>
          <Story/>
        </Box>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const OpenApiStory: Story = {
  name: 'OpenApi',
  args: {
    open: true,
    setOpen: () => null,
    detail: {
      spec: OPENAPI_SPEC,
    },
  },
  render: (args) => <SpecificationPopupWrapper {...args} value={JSON.stringify(openapiSample, null, 2)}/>,
}

export const MarkdownStory: Story = {
  name: 'Markdown',
  args: {
    open: true,
    detail: {
      spec: {
        'name': 'Markdown file',
      },
      viewer: <MarkdownViewer
        value={markdownSample}
      />,
      viewModes: [],
      setViewMode: () => null,
    },
  },
}

export const GraphqlStory: Story = {
  name: 'Graphql',
  args: {
    open: true,
    setOpen: () => null,
    detail: {
      spec: GRAPHQL_SPEC,
    },
  },
  render: (args) => <SpecificationPopupWrapper {...args} value={graphqlSample}/>,
}
