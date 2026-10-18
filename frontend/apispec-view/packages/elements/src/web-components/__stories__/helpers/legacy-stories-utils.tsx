import { DiffOperationAPI } from '../../../containers/DiffOperationAPI'
import { OperationAPIImpl } from '../../../containers/OperationAPI'
import { getMergedDocument } from './getMergedDocument'
import { switchToChangedSections } from './switch-to-changed-sections'
import { safeStringify } from '@stoplight/yaml'
import type { ArgTypes, StoryObj } from '@storybook/react'
import { aggregatedDiffsMetaKey, diffsMetaKey } from '@netcracker/qubership-apihub-apispec-view-diff-block'
import FontFaceObserver from 'fontfaceobserver'
import React, { useEffect, useMemo, useState } from 'react'

const FONT_FAMILIES: string[] = ['Inter']
const FONT_LOAD_TIMEOUT = 10_000
// Root of the rendered operation view, the same element screenshot tests capture
const OPERATION_VIEW_SELECTOR = '[id^="mosaic-provider-react-aria"]'

/** Arbitrary extra props forwarded to the rendered component, hidden from the Controls panel. */
type ComponentProps = Record<string, unknown>

export type LegacyDiffStoryArgs = {
  beforeYaml: string
  afterYaml: string
}

export type LegacyStoryArgs = {
  sampleYaml: string
}

/**
 * Human-readable YAML of a sample document for read-only display in Controls.
 * `noRefs` prints objects shared between samples in place instead of as YAML anchors/aliases.
 */
export const toSampleYaml = (document: object): string =>
  safeStringify(document, { noRefs: true, skipInvalid: true, lineWidth: -1 })

export const legacyDiffStoryArgTypes: Partial<ArgTypes<LegacyDiffStoryArgs>> = {
  beforeYaml: {
    control: { type: 'text' },
    table: { category: 'Sample' },
    description: 'Before sample YAML for reference. The viewer always uses the bundled fixture of the story.',
  },
  afterYaml: {
    control: { type: 'text' },
    table: { category: 'Sample' },
    description: 'After sample YAML for reference. The viewer always uses the bundled fixture of the story.',
  },
}

export const legacyStoryArgTypes: Partial<ArgTypes<LegacyStoryArgs>> = {
  sampleYaml: {
    control: { type: 'text' },
    table: { category: 'Sample' },
    description: 'Sample YAML for reference. The viewer always uses the bundled fixture of the story.',
  },
}

/** Only sample references are shown in Controls; component props are fixed per story. */
export const legacyDiffStoryParameters = {
  controls: { include: Object.keys(legacyDiffStoryArgTypes) },
}

export const legacyStoryParameters = {
  controls: { include: Object.keys(legacyStoryArgTypes) },
}

/** Delays rendering until fonts are loaded, so screenshots don't capture a fallback font. */
function useFontsLoaded(): boolean {
  const [fontsLoaded, setFontsLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    const loaders = FONT_FAMILIES.map(fontFamily => new FontFaceObserver(fontFamily).load(null, FONT_LOAD_TIMEOUT))
    Promise.allSettled(loaders).then(() => !cancelled && setFontsLoaded(true))
    return () => {
      cancelled = true
    }
  }, [])
  return fontsLoaded
}

function LegacyDiffOperationStory(
  { before, after, componentProps }: { before: object; after: object; componentProps: ComponentProps },
) {
  const mergedDocument = useMemo(() => getMergedDocument(before, after), [before, after])
  const fontsLoaded = useFontsLoaded()
  if (!fontsLoaded) {
    return <></>
  }
  return (
    // @ts-expect-error `filters` is optional for legacy stories, same as the former `Template`
    <DiffOperationAPI
      mergedDocument={mergedDocument}
      diffsMetaKey={diffsMetaKey}
      aggregatedDiffsMetaKey={aggregatedDiffsMetaKey}
      {...componentProps}
    />
  )
}

function LegacyOperationStory({ sample, componentProps }: { sample: object; componentProps: ComponentProps }) {
  const mergedDocument = useMemo(() => getMergedDocument(sample, undefined), [sample])
  const fontsLoaded = useFontsLoaded()
  if (!fontsLoaded) {
    return <></>
  }
  return <OperationAPIImpl mergedDocument={mergedDocument} {...componentProps} />
}

/** Waits until the operation view is rendered (stories render nothing until fonts are loaded). */
function waitForOperationView(canvasElement: HTMLElement): Promise<void> {
  return new Promise(resolve => {
    const startedAt = Date.now()
    const check = () => {
      if (canvasElement.querySelector(OPERATION_VIEW_SELECTOR) || Date.now() - startedAt > FONT_LOAD_TIMEOUT) {
        resolve()
      } else {
        setTimeout(check, 50)
      }
    }
    check()
  })
}

/**
 * Story comparing `before` and `after` documents with `DiffOperationAPI`. The documents are shown
 * as read-only YAML in Controls; `componentProps` are passed to the component and not shown.
 * On mount, the story switches to the response code / media type with the major change (see
 * `switchToChangedSections`). Screenshot tests call `switchToChangedSections` on their own.
 * Set the story `name` next to the spread result: Storybook reads it statically from the story object.
 */
export const createLegacyDiffOperationStory = (
  before: object,
  after: object,
  options: { componentProps?: ComponentProps } = {},
): StoryObj<LegacyDiffStoryArgs> => ({
  args: { beforeYaml: toSampleYaml(before), afterYaml: toSampleYaml(after) },
  render: () => <LegacyDiffOperationStory before={before} after={after} componentProps={options.componentProps ?? {}} />,
  play: async ({ canvasElement }) => {
    await waitForOperationView(canvasElement)
    await switchToChangedSections(canvasElement)
  },
})

/**
 * Story rendering a single `sample` document with `OperationAPIImpl`. The document is shown as
 * read-only YAML in Controls; `componentProps` are passed to the component and not shown.
 * Set the story `name` next to the spread result: Storybook reads it statically from the story object.
 */
export const createLegacyOperationStory = (
  sample: object,
  options: { componentProps?: ComponentProps } = {},
): StoryObj<LegacyStoryArgs> => ({
  args: { sampleYaml: toSampleYaml(sample) },
  render: () => <LegacyOperationStory sample={sample} componentProps={options.componentProps ?? {}} />,
})
