import { Meta, StoryObj } from '@storybook/react/*'
import {
  caseDocs,
  CaseId,
  CASES,
  collectionsActionsOneOfSchema,
  fieldDoc,
  StoryComponent,
} from '@stoplight/elements/web-components/__stories__/helpers/titleAndFormatCases'
import '../index'

const meta: Meta<{ before: object; after: object }> = {
  title: 'Title & Format Diffs/oneOf',
}
export default meta

type Story = StoryObj<typeof meta>

const story = (id: CaseId): Story => ({
  render: StoryComponent,
  args: caseDocs(CASES[id].before, CASES[id].after, true),
  name: CASES[id].name,
})

export const BaselineTitleOnly = story('BaselineTitleOnly')
export const BaselineFormatOnly = story('BaselineFormatOnly')
export const BaselineTitleAndFormat = story('BaselineTitleAndFormat')

export const FormatAddedNoTitle = story('FormatAddedNoTitle')
export const FormatRemovedNoTitle = story('FormatRemovedNoTitle')
export const FormatReplacedNoTitle = story('FormatReplacedNoTitle')

export const FormatAddedTitleUnchanged = story('FormatAddedTitleUnchanged')
export const FormatRemovedTitleUnchanged = story('FormatRemovedTitleUnchanged')
export const FormatReplacedTitleUnchanged = story('FormatReplacedTitleUnchanged')

export const TitleAddedNoFormat = story('TitleAddedNoFormat')
export const TitleRemovedNoFormat = story('TitleRemovedNoFormat')
export const TitleReplacedNoFormat = story('TitleReplacedNoFormat')

export const TitleAddedFormatUnchanged = story('TitleAddedFormatUnchanged')
export const TitleRemovedFormatUnchanged = story('TitleRemovedFormatUnchanged')
export const TitleReplacedFormatUnchanged = story('TitleReplacedFormatUnchanged')

export const BothAdded = story('BothAdded')
export const BothRemoved = story('BothRemoved')
export const BothReplaced = story('BothReplaced')
export const TitleAddedFormatRemoved = story('TitleAddedFormatRemoved')
export const TitleRemovedFormatAdded = story('TitleRemovedFormatAdded')
export const TitleAddedFormatReplaced = story('TitleAddedFormatReplaced')
export const TitleRemovedFormatReplaced = story('TitleRemovedFormatReplaced')
export const TitleReplacedFormatAdded = story('TitleReplacedFormatAdded')
export const TitleReplacedFormatRemoved = story('TitleReplacedFormatRemoved')

// --- Array with long title as a oneOf option ---

export const CollectionsActionsArrayInOneOf: Story = {
  render: StoryComponent,
  args: {
    before: fieldDoc('collectionsActions', collectionsActionsOneOfSchema(true)),
    after: fieldDoc('collectionsActions', collectionsActionsOneOfSchema(true)),
  },
  name: 'Array of objects (oneOf option) with long title — collectionsActions',
}

export const CollectionsActionsArrayInOneOfTitleAdded: Story = {
  render: StoryComponent,
  args: {
    before: fieldDoc('collectionsActions', collectionsActionsOneOfSchema(false)),
    after: fieldDoc('collectionsActions', collectionsActionsOneOfSchema(true)),
  },
  name: 'Array of objects (oneOf option) — long title added (collectionsActions)',
}
