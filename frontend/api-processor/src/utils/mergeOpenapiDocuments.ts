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

import { apiDiff, COMPARE_MODE_DEFAULT, CompareResult, Diff } from '@netcracker/qubership-apihub-api-diff'
import { trimPath } from './path'
import { OpenAPIV3 } from 'openapi-types'
import { takeIf, takeIfDefined } from './objects'
import { isEmpty, isNotEmpty } from './arrays'
import { removeObjectDuplicates } from './builder'
import { matchPaths, resolveSpec } from '@netcracker/qubership-apihub-api-unifier'
import { ORIGINS_SYMBOL } from '../consts'
import { DIFF_RULES, DiffRule, EXTERNAL_DOCS_DIFF_RULES } from './diffRules'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export type ExportTemplate = Partial<OpenAPIV3.Document>

const DIFF_OPTIONS = {
  mode: COMPARE_MODE_DEFAULT,
  resolveRef: false,
  validate: false,
  mergeAllOf: false,
  unify: false,
  metaKey: undefined,
  originsFlag: ORIGINS_SYMBOL,
} as const

const TEMPLATE_TITLE = 'export template'

export const mergeOpenapiDocuments = (documents: OpenAPIV3.Document[], info: OpenAPIV3.Document['info'], template?: ExportTemplate): OpenAPIV3.Document => {
  if (isEmpty(documents)) {
    throw new Error('No documents provided')
  }

  const [diffs, merged] = merge(
    trimSpecs(documents, template),
    prepareTemplate(documents[0].openapi, template),
  )

  return {
    openapi: merged.openapi,
    info: info,
    servers: template?.servers || merged.servers,
    paths: merged.paths,
    components: merged.components,
    security: template?.security || merged.security,
    ...takeIfDefined({ tags: getUsedTags(documents) }),
    ...takeIfDefined({ externalDocs: template?.externalDocs || getExternalDocs(merged, diffs) }),
  }
}

function merge(specs: OpenAPIV3.Document[], template?: ExportTemplate): [Diff[], OpenAPIV3.Document] {
  const [firstSpec, ...restSpecs] = specs

  if (!template && firstSpec && !restSpecs.length) {
    return [[], firstSpec]
  }

  const { diffs: specsMergeDiffs, merged } = restSpecs.reduce((acc: CompareResult, spec) => {
    validateSpecs(acc.merged, spec)
    const { diffs, merged } = apiDiff(acc.merged, spec, DIFF_OPTIONS)
    validateResult(DIFF_RULES, diffs, (acc.merged as OpenAPIV3.Document).info.title, spec.info.title)
    return { diffs: [...acc.diffs, ...diffs], merged: merged, ownerDiffEntry: undefined }
  }, { diffs: [], merged: firstSpec, ownerDiffEntry: undefined }) as {
    diffs: Diff[]
    merged: OpenAPIV3.Document
    ownerDiffEntry: undefined
  }

  if (template) {
    validateSpecs(merged, template)
    const { diffs: mergeWithTemplateDiffs, merged: mergedWithTemplate } = apiDiff(template, merged, DIFF_OPTIONS)
    validateResult(DIFF_RULES, mergeWithTemplateDiffs, (mergedWithTemplate as OpenAPIV3.Document).info.title, TEMPLATE_TITLE)
    return [specsMergeDiffs, mergedWithTemplate as OpenAPIV3.Document]
  }

  return [specsMergeDiffs, merged]
}

function validateSpecs(spec1: unknown, spec2: unknown): void {
  const resolvedSpec1 = resolveSpec(spec1)
  const resolvedSpec2 = resolveSpec(spec2)
  if (resolvedSpec1.type !== resolvedSpec2.type) {
    throw new Error(`Specification types cannot be different. Got ${resolvedSpec1.type} and ${resolvedSpec2.type}`)
  }
  if (resolvedSpec1.version !== resolvedSpec2.version) {
    throw new Error(`The combined specification cannot be downloaded because there are source specifications with different OpenAPI versions.
      Please resolve the conflicts in source specifications, republish them and try again. You can also download reduced source specifications and merge operations manually.`)
  }
}

function extractDeclarationPaths(diff: Diff): JsonPath[] {
  const {
    afterDeclarationPaths = [],
    beforeDeclarationPaths = [],
  } = { ...diff }

  return [...afterDeclarationPaths, ...beforeDeclarationPaths]
}

function compliesWithRules(rules: DiffRule[], diff: Diff): boolean {
  return rules.some(allowedDiff => {
    const matchResult = matchPaths(extractDeclarationPaths(diff), allowedDiff.pathTemplate)
    return matchResult?.path && allowedDiff.allowedActions.includes(diff.action)
  },
  )
}

const validateResult = (rules: DiffRule[], diffs: Diff[], title1: string, title2: string): void => {
  const [firstProhibitedDiff] = diffs.filter(diff => !compliesWithRules(rules, diff))
  const [firstPathFromProhibitedDiff] = extractDeclarationPaths(firstProhibitedDiff)

  if (firstProhibitedDiff && isEmpty(firstPathFromProhibitedDiff)) {
    throw new Error(`Unable to merge specifications ${title1}, ${title2}. You can download reduced source specifications and merge operations manually.`)
  }

  if (firstProhibitedDiff) {
    throw new Error(`Unable to merge ${trimPath(firstPathFromProhibitedDiff).join('.')}. These specifications have different content for it: ${title1}, ${title2}.
      Please resolve the conflicts in source specification, republish them and try again. You can also download reduced source specifications and merge operations manually.`,
    )
  }
}

export function getUsedTags(specs: OpenAPIV3.Document[]): OpenAPIV3.TagObject[] | undefined {
  const tagsWithUsages = specs
    .map(({ tags, paths }) => {
      const specTags: string[] = []
      for (const path in paths) {
        for (const operation in paths[path]) {
          const tags = paths[path]?.[operation as OpenAPIV3.HttpMethods]?.tags
          if (tags) {
            specTags.push(...tags)
          }
        }
      }
      return tags?.filter(({ name }) => specTags.includes(name))
    })
    .filter((tags): tags is OpenAPIV3.TagObject[] => tags !== undefined)
    .flat()

  return isNotEmpty(tagsWithUsages)
    ? removeObjectDuplicates(tagsWithUsages, 'name')
    : undefined
}

function getExternalDocs(merged: OpenAPIV3.Document, diffs: Diff[]): OpenAPIV3.ExternalDocumentationObject | undefined {
  const hasDifferentExternalDocs = diffs.some(diff => compliesWithRules(EXTERNAL_DOCS_DIFF_RULES, diff))
  if (hasDifferentExternalDocs) {
    return
  }
  return merged.externalDocs
}

function trimSpecs(specs: OpenAPIV3.Document[], template?: ExportTemplate): OpenAPIV3.Document[] {
  return specs.map(({
    tags,
    externalDocs,
    servers,
    security,
    ...rest
  }) => {
    return {
      ...rest,
      ...takeIf({ externalDocs }, !template?.externalDocs && !!externalDocs),
      ...takeIf({ servers }, !template?.servers && !!servers),
      ...takeIf({ security }, !template?.security && !!security),
    }
  })
}

function prepareTemplate(openapi: string, template?: ExportTemplate): ExportTemplate | undefined {
  if (!template) {
    return
  }

  const {
    info,
    servers,
    security,
    components: { securitySchemes } = {},
    externalDocs,
  } = template

  return {
    openapi,
    info,
    ...takeIfDefined({ servers }),
    ...takeIf({
      components: {
        securitySchemes,
      },
    }, !!securitySchemes,
    ),
    ...takeIfDefined({ security }),
    ...takeIfDefined({ externalDocs }),
  }
}
