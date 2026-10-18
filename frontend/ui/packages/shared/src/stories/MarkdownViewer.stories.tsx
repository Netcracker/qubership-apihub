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

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Box, CssBaseline, ThemeProvider } from '@mui/material'
import { MarkdownViewer } from '../components/SpecificationDialog/MarkdownViewer'
import { markdownSample } from './samples/markdown-sample'
import { mermaidInvalidSample, mermaidSample } from './samples/mermaid-sample'
import { theme } from '../themes/theme'

const meta: Meta<typeof MarkdownViewer> = {
  title: 'MarkdownViewer',
  component: MarkdownViewer,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline/>
        <Box sx={{ maxWidth: 900, padding: 3 }}>
          <Story/>
        </Box>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

/** Two valid Mermaid diagrams (sequence + flowchart) embedded in a markdown document.
 *  Verifies that multiple diagrams on the same page all render as SVG. */
export const WithMermaidDiagrams: Story = {
  args: {
    value: mermaidSample,
  },
}

/** A Mermaid block with intentionally invalid syntax.
 *  The component must show the raw source text in a <pre><code> fallback
 *  without throwing or rendering a broken diagram. */
export const WithInvalidMermaid: Story = {
  name: 'With Invalid Mermaid (Fallback)',
  args: {
    value: mermaidInvalidSample,
  },
}

/** Plain markdown without any Mermaid blocks.
 *  Regression check — existing markdown rendering must be unaffected
 *  by the Mermaid code renderer override. */
export const PlainMarkdown: Story = {
  name: 'Plain Markdown (Regression)',
  args: {
    value: markdownSample,
  },
}
