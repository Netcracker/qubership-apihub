// Cases of QA-DIFFS-HIDING, QA-ARROWS, and QA-DIFFS-ARROWS. The stories build these documents in code, not from
// YAML files, so the cases come from the same builders: packages/samples/src/openapi-diffs-hiding-unchanged-nodes.ts
// and openapi-arrow-buttons.ts.
// Case IDs keep the number of the story case: "hid-22" is story case 22-anonymous-added-cards-unchanged.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { SAMPLES_ROOT } from '../lib.mjs'
import { registerTypeScriptHooks } from '../typescript-loader.mjs'

registerTypeScriptHooks()
const samplesModule = name => import(pathToFileURL(path.join(SAMPLES_ROOT, 'src', name)).href)
const hiding = await samplesModule('openapi-diffs-hiding-unchanged-nodes.ts')
const arrows = await samplesModule('openapi-arrow-buttons.ts')

const SOURCE_DIR = 'src'
const number = caseId => caseId.match(/^(\d+)-/)[1]
// JSON round trip: the builders may share objects between cases; each case gets its own copy.
const copy = value => JSON.parse(JSON.stringify(value))

export function hidingDiffsCases() {
  return hiding.openApiHidingUnchangedCases.map(testCase => {
    const { before, after } = hiding.buildOpenApiHidingUnchangedDocuments(testCase)
    return {
      id: `hid-${number(testCase.caseId)}`,
      fixture: `${SOURCE_DIR}/openapi-diffs-hiding-unchanged-nodes.ts, case ${testCase.caseId}`,
      title: testCase.title,
      sides: [copy(before), copy(after)],
    }
  })
}

const TOOLBAR_CODES = { 'security-toolbar': 'arsec', 'response-codes': 'arrsp' }

export function arrowsPlainCases() {
  return arrows.openApiArrowButtonsCases.map(testCase => ({
    id: `${TOOLBAR_CODES[testCase.toolbar]}-${number(testCase.caseId)}`,
    fixture: `${SOURCE_DIR}/openapi-arrow-buttons.ts, ${testCase.toolbar} case ${testCase.caseId}`,
    title: testCase.title,
    sides: [copy(arrows.buildOpenApiArrowButtonsDocument(testCase.toolbar, testCase.lineup))],
  }))
}

export function arrowsDiffsCases() {
  return arrows.openApiDiffsArrowButtonsCases.map(testCase => {
    const { before, after } = arrows.buildOpenApiArrowButtonsDocuments(testCase)
    return {
      id: `d${TOOLBAR_CODES[testCase.toolbar]}-${number(testCase.caseId)}`,
      fixture: `${SOURCE_DIR}/openapi-arrow-buttons.ts, ${testCase.toolbar} case ${testCase.caseId}`,
      title: testCase.title,
      sides: [copy(before), copy(after)],
    }
  })
}
