import { buildGqlChangelogPackage, expectChangeCounts } from './helpers'
import { BREAKING_CHANGE_TYPE, GRAPHQL_API_TYPE, NON_BREAKING_CHANGE_TYPE, RISKY_CHANGE_TYPE, UNCLASSIFIED_CHANGE_TYPE } from '../src'

describe('Number of declarative changes in graphql operation test', () => {
  test('Multiple uses of the same type in a query response', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case1')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test('Multiple use of one type in another type, which is used in the query response', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case2')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test('Multiple Uses of One Type in Both Mutation Arguments and Response Fields', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case3')
    expectChangeCounts(result, {
      changes: { [RISKY_CHANGE_TYPE]: 1, [NON_BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [RISKY_CHANGE_TYPE]: 1, [NON_BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test('Multiple uses of one type in both input (mutation argument) and output (mutation response) with the same severity of change', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case4')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 2 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test('Circular reference in response schema with a type change in the referenced field', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case5')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test('Circular reference in both mutation input and response', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case6')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 2 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test('Remove fields that reference from the response', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case7')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 3 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test('Add a shared type for multiple existing fields in the response', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case8')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 2, [UNCLASSIFIED_CHANGE_TYPE]: 1/*this is wroing. Need add case to suite*/ },
      impacted: { [BREAKING_CHANGE_TYPE]: 1, [UNCLASSIFIED_CHANGE_TYPE]: 1/*this is wroing. Need add case to suite*/ },
    }, GRAPHQL_API_TYPE)
  })

  test('Remove a shared type for multiple existing fields and change these fields to a new type', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-operation/case9')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 2, [UNCLASSIFIED_CHANGE_TYPE]: 1/*this is wroing. Need add case to suite*/ },
      impacted: { [BREAKING_CHANGE_TYPE]: 1, [UNCLASSIFIED_CHANGE_TYPE]: 1/*this is wroing. Need add case to suite*/ },
    }, GRAPHQL_API_TYPE)
  })
})
