import { Meta, StoryObj } from '@storybook/react/*'
import {
  amountObjectSchema,
  AMOUNT_TITLE,
  caseDocs,
  CaseId,
  CASES,
  collectionsActionsArraySchema,
  fieldDoc,
  StoryComponent,
} from '@stoplight/elements/web-components/__stories__/helpers/titleAndFormatCases'
import '../index'

const meta: Meta<{ before: object; after: object }> = {
  title: 'Title & Format Diffs/Direct',
}
export default meta

type Story = StoryObj<typeof meta>

const story = (id: CaseId): Story => ({
  render: StoryComponent,
  args: caseDocs(CASES[id].before, CASES[id].after, false),
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

// --- Arrays / objects with long titles ---

export const CollectionsActionsArray: Story = {
  render: StoryComponent,
  args: {
    before: fieldDoc('collectionsActions', collectionsActionsArraySchema(true)),
    after: fieldDoc('collectionsActions', collectionsActionsArraySchema(true)),
  },
  name: 'Array of objects with long title — collectionsActions',
}

export const CollectionsActionsArrayTitleAdded: Story = {
  render: StoryComponent,
  args: {
    before: fieldDoc('collectionsActions', collectionsActionsArraySchema(false)),
    after: fieldDoc('collectionsActions', collectionsActionsArraySchema(true)),
  },
  name: 'Array of objects — long title added (collectionsActions)',
}

export const AmountObject: Story = {
  render: StoryComponent,
  args: {
    before: fieldDoc('amount', amountObjectSchema(AMOUNT_TITLE)),
    after: fieldDoc('amount', amountObjectSchema(AMOUNT_TITLE)),
  },
  name: 'Object with long title — amount',
}

export const AmountObjectTitleAdded: Story = {
  render: StoryComponent,
  args: {
    before: fieldDoc('amount', amountObjectSchema(undefined)),
    after: fieldDoc('amount', amountObjectSchema(AMOUNT_TITLE)),
  },
  name: 'Object — long title added (amount)',
}
