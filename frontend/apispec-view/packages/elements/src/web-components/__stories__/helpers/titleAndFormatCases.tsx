import { DiffOperationAPI } from '@stoplight/elements/containers/DiffOperationAPI'
import { getCompareResult } from '@stoplight/elements/web-components/__stories__/helpers/getMergedDocument'
import { stringifyDiffs } from '@stoplight/elements/web-components/__stories__/helpers/stringifyDiffs'
import { aggregatedDiffsMetaKey, diffsMetaKey } from 'diff-block'
import React from 'react'

/**
 * Shared fixtures/helpers for the "Title & Format Diffs" stories.
 *
 * They exercise diffs of the `title` and `format` qualifiers of a JSON schema string type,
 * rendered as `string<Title, format>`.
 *
 * - `format` is the JSON schema `format` keyword on a `string` type.
 * - `title` is SYNTHETIC: it comes from the name of the referenced component. A schema
 *   referenced via `$ref: '#/components/schemas/Order'` is rendered with title `Order`.
 *   An inline schema (no `$ref`) has no title.
 *
 * Title changes are produced by pointing before/after at differently-named components whose
 * content is otherwise equal, so that only the synthetic title differs.
 */

export type Qualifier = {
  // when set, the string type is placed in components under this name and referenced via $ref,
  // which makes it render with this (synthetic) title
  title?: string
  // JSON schema `format` keyword on the string type
  format?: string
}

// stable sibling used to make a real oneOf combiner around the string-under-test
const ONE_OF_SIBLING = { type: 'integer' }

function buildStringSchema(spec: Qualifier): { schema: any; schemas: Record<string, any> } {
  const stringType = { type: 'string', ...(spec.format ? { format: spec.format } : {}) }
  if (spec.title) {
    return {
      schema: { $ref: `#/components/schemas/${spec.title}` },
      schemas: { [spec.title]: stringType },
    }
  }
  return { schema: stringType, schemas: {} }
}

function buildOneOfSchema(spec: Qualifier): { schema: any; schemas: Record<string, any> } {
  const { schema, schemas } = buildStringSchema(spec)
  return { schema: { oneOf: [schema, ONE_OF_SIBLING] }, schemas }
}

function buildDoc(valueSchema: any, schemas: Record<string, any>): object {
  return {
    openapi: '3.0.0',
    info: { title: 'Title & Format Diffs', version: '1.0.0' },
    paths: {
      '/test': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { value: valueSchema },
                },
              },
            },
          },
          responses: { '200': { description: 'OK' } },
        },
      },
    },
    ...(Object.keys(schemas).length ? { components: { schemas } } : {}),
  }
}

export function caseDocs(
  before: Qualifier,
  after: Qualifier,
  wrapInOneOf: boolean,
): { before: object; after: object } {
  const build = wrapInOneOf ? buildOneOfSchema : buildStringSchema
  const b = build(before)
  const a = build(after)
  return { before: buildDoc(b.schema, b.schemas), after: buildDoc(a.schema, a.schemas) }
}

// --- Array / object long-title cases ------------------------------------------------------

export const COLLECTIONS_ACTIONS_TITLE = 'Collections actions'
export const AMOUNT_TITLE = 'Represents an amount of money with its currency type.'

const COLLECTIONS_ACTIONS_ITEMS = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    action: { type: 'string' },
  },
}

// array of objects, optionally carrying the long `title`
export function collectionsActionsArraySchema(withTitle: boolean): any {
  return {
    type: 'array',
    ...(withTitle ? { title: COLLECTIONS_ACTIONS_TITLE } : {}),
    items: COLLECTIONS_ACTIONS_ITEMS,
  }
}

// same array, but as one option of a oneOf combiner (alongside a stable sibling)
export function collectionsActionsOneOfSchema(withTitle: boolean): any {
  return { oneOf: [collectionsActionsArraySchema(withTitle), ONE_OF_SIBLING] }
}

// object, optionally carrying the long `title`
export function amountObjectSchema(title: string | undefined): any {
  return {
    type: 'object',
    ...(title ? { title } : {}),
    properties: {
      value: { type: 'number' },
      currency: { type: 'string' },
    },
  }
}

// Build a doc whose request-body object exposes a single named field.
export function fieldDoc(fieldName: string, schema: any): object {
  return {
    openapi: '3.0.0',
    info: { title: 'Title & Format Diffs', version: '1.0.0' },
    paths: {
      '/test': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { [fieldName]: schema },
                },
              },
            },
          },
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  }
}

export function StoryComponent({ before, after }: { before: object; after: object }) {
  const { diffs, merged } = getCompareResult(before, after)
  console.log(stringifyDiffs(diffs))
  return (
    <DiffOperationAPI
      mergedDocument={merged}
      filters={[]}
      diffsMetaKey={diffsMetaKey}
      aggregatedDiffsMetaKey={aggregatedDiffsMetaKey}
    />
  )
}

export type CaseDef = { name: string; before: Qualifier; after: Qualifier }

// Identity helper that validates each entry against `CaseDef` while preserving the literal
// keys (so `CaseId` stays a union of the actual case names). Avoids the `satisfies` operator,
// which the Storybook Babel pipeline does not parse.
function defineCases<T extends Record<string, CaseDef>>(cases: T): T {
  return cases
}

// Every case as a before -> after pair of qualifiers.
// Keys are meaningful identifiers used as the story export names; `name` is the display label.
export const CASES = defineCases({
  // Baselines (no diff), to show the combined rendering
  BaselineTitleOnly: { name: 'Baseline — title only (unchanged)', before: { title: 'Order' }, after: { title: 'Order' } },
  BaselineFormatOnly: { name: 'Baseline — format only (unchanged)', before: { format: 'date-time' }, after: { format: 'date-time' } },
  BaselineTitleAndFormat: { name: 'Baseline — title + format (unchanged)', before: { title: 'Order', format: 'date-time' }, after: { title: 'Order', format: 'date-time' } },

  // Format changes, no title
  FormatAddedNoTitle: { name: 'Format added (no title)', before: {}, after: { format: 'date-time' } },
  FormatRemovedNoTitle: { name: 'Format removed (no title)', before: { format: 'date-time' }, after: {} },
  FormatReplacedNoTitle: { name: 'Format replaced (no title)', before: { format: 'date-time' }, after: { format: 'date' } },

  // Format changes, title present & unchanged (previously broken)
  FormatAddedTitleUnchanged: { name: 'Format added (title unchanged)', before: { title: 'Order' }, after: { title: 'Order', format: 'date-time' } },
  FormatRemovedTitleUnchanged: { name: 'Format removed (title unchanged)', before: { title: 'Order', format: 'date-time' }, after: { title: 'Order' } },
  FormatReplacedTitleUnchanged: { name: 'Format replaced (title unchanged)', before: { title: 'Order', format: 'date-time' }, after: { title: 'Order', format: 'date' } },

  // Title changes, no format
  TitleAddedNoFormat: { name: 'Title added (no format)', before: {}, after: { title: 'Order' } },
  TitleRemovedNoFormat: { name: 'Title removed (no format)', before: { title: 'Order' }, after: {} },
  TitleReplacedNoFormat: { name: 'Title replaced (no format)', before: { title: 'Order' }, after: { title: 'Invoice' } },

  // Title changes, format present & unchanged
  TitleAddedFormatUnchanged: { name: 'Title added (format unchanged)', before: { format: 'date-time' }, after: { title: 'Order', format: 'date-time' } },
  TitleRemovedFormatUnchanged: { name: 'Title removed (format unchanged)', before: { title: 'Order', format: 'date-time' }, after: { format: 'date-time' } },
  TitleReplacedFormatUnchanged: { name: 'Title replaced (format unchanged)', before: { title: 'Order', format: 'date-time' }, after: { title: 'Invoice', format: 'date-time' } },

  // Both change at once
  BothAdded: { name: 'Both added', before: {}, after: { title: 'Order', format: 'date-time' } },
  BothRemoved: { name: 'Both removed', before: { title: 'Order', format: 'date-time' }, after: {} },
  BothReplaced: { name: 'Both replaced', before: { title: 'Order', format: 'date-time' }, after: { title: 'Invoice', format: 'date' } },
  TitleAddedFormatRemoved: { name: 'Title added + format removed', before: { format: 'date-time' }, after: { title: 'Order' } },
  TitleRemovedFormatAdded: { name: 'Title removed + format added', before: { title: 'Order' }, after: { format: 'date-time' } },
  TitleAddedFormatReplaced: { name: 'Title added + format replaced', before: { format: 'date-time' }, after: { title: 'Order', format: 'date' } },
  TitleRemovedFormatReplaced: { name: 'Title removed + format replaced', before: { title: 'Order', format: 'date-time' }, after: { format: 'date' } },
  TitleReplacedFormatAdded: { name: 'Title replaced + format added', before: { title: 'Order' }, after: { title: 'Invoice', format: 'date-time' } },
  TitleReplacedFormatRemoved: { name: 'Title replaced + format removed', before: { title: 'Order', format: 'date-time' }, after: { title: 'Invoice' } },
})

export type CaseId = keyof typeof CASES
