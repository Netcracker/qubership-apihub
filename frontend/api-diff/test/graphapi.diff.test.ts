import { apiDiff, breaking, deprecated, DiffAction, unclassified } from "../src"
import { TEST_DEFAULTS_FLAG, TEST_DIFF_FLAG } from "./helper"
import { graphapi } from "./helper/utils"
import { diffsMatcher } from './helper/matchers'
import { GRAPH_API_NODE_KIND_STRING } from "@netcracker/qubership-apihub-graphapi"
import { COMPARE_SCOPE_OUTPUT } from "../src/graphapi"

describe('e2e tests for GraphAPI', () => {
  it.skip('bug with not denormalized before value', () => {
    const diff = apiDiff(
      graphapi`
        type Query {
            data: String
        }
      `,
      graphapi`
        type Query {
            data: Int
        }     
      `,
      { unify: true, defaultsFlag: TEST_DEFAULTS_FLAG, metaKey: TEST_DIFF_FLAG }
    )
    expect(diff.merged).toHaveProperty(['queries', 'data', 'output', 'typeDef', TEST_DIFF_FLAG, 'type', 'beforeValue', 'kind'], GRAPH_API_NODE_KIND_STRING)
    expect(diff.merged).not.toHaveProperty(['queries', 'data', 'output', 'typeDef', TEST_DIFF_FLAG, 'type', 'beforeValue', 'directives'])
    expect(diff.merged).not.toHaveProperty(['queries', 'data', 'output', 'typeDef', TEST_DIFF_FLAG, 'type', 'beforeValue', TEST_DEFAULTS_FLAG])
  })

  it('compare union with ', () => {
    const result = apiDiff(
      graphapi`
        type Query {
          data: Data
        }

        type Data {
          id: ID!
        }

        type AlternativeData {
          newId: ID!
        }

        union Un = Data | AlternativeData
      `,
      graphapi`
        type Query {
          data: Un
        }

        type Data {
          id: ID!
        }

        type AlternativeData {
          newId: ID!
        }

        union Un = Data | AlternativeData     
      `,
      { unify: true, metaKey: TEST_DIFF_FLAG }
    )
    expect(result.diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'objects', 'Data', 'title']],
        afterDeclarationPaths: [['components', 'unions', 'Un', 'title']],
        type: unclassified,//should be breaking
        scope: COMPARE_SCOPE_OUTPUT
      }),
      //maybe this diff should not exists. But we can't draw without it
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'unions', 'Un', 'type', 'oneOf', 1]],
        type: breaking,
        scope: COMPARE_SCOPE_OUTPUT
      }),
    ]))
  })
  //todo case promitive vs union with primitive
})
// import { buildFromSchema, GraphApiObject, GraphApiScalar, GraphApiSchema, GraphApiUnion } from '@netcracker/qubership-apihub-graphapi'
// import { buildSchema } from 'graphql'
// import { annotation, apiDiff, breaking, CompareOptions, deprecated, Diff, DIFF_META_KEY, DiffAction, nonBreaking, unclassified } from '../src'
// import { isObject } from '../src/utils'
// import { diffsMatcher } from './helper/matchers'

// export const graphapi = (strings: TemplateStringsArray): GraphApiSchema => {
//   return buildGraphApi(strings[0])
// }

// function buildGraphApi(graphql: string): GraphApiSchema {
//   return buildFromSchema(buildSchema(graphql, { noLocation: true }))
// }

// function isGraphApiSchema(value: unknown): value is GraphApiSchema {
//   return !!value && isObject(value) && 'graphapi' in value
// }

// const DEFAULTS_FLAG = Symbol('$defaults')

// const COMPARE_OPTIONS: CompareOptions = {
//   unify: true,
//   defaultsFlag: DEFAULTS_FLAG
// }

// // Just helper
// function expectDiffs(actual: Diff[], expected: unknown[]) {
//   expect(actual).toEqual(diffsMatcher(expected.map(diff => expect.objectContaining(diff))))
// }

// class Expectations {
//   public static readonly ENUM_SIMPLE_VALUES_FRUIT_KIND = {
//     title: 'FruitKind',
//     type: {
//       kind: 'enum',
//       values: { Orange: {}, Banana: {}, Apple: {} }
//     }
//   }

//   public static scalar(name: string): GraphApiScalar {
//     return {
//       title: name,
//       type: { kind: 'scalar' }
//     }
//   }

//   public static union(name: string, items: GraphApiAny[]): GraphApiUnion {
//     return {
//       title: name,
//       oneOf: items
//     }
//   }
// }

// describe('e2e tests for new GraphAPI standard', () => {
//   describe('changed nullable of output', () => {
//     it('true -> false, scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: Int
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Int!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)
//       const diffForNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'nullable']
//         ]
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForNullable)
//       ]))
//       expect(merged).toMatchObject({
//         graphapi: '1.0.0',
//         queries: {
//           test: {
//             output: {
//               type: { kind: 'integer' },
//               nullable: false,
//               [DIFF_META_KEY]: {
//                 nullable: diffForNullable
//               }
//             }
//           }
//         }
//       })
//     })

//     it('false -> true, scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: Int!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Int
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)
//       const diffForNullable = {
//         type: breaking,
//         action: DiffAction.remove,
//         beforeValue: false,
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'nullable']
//         ]
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForNullable)
//       ]))
//       expect(merged).toMatchObject({
//         graphapi: '1.0.0',
//         queries: {
//           test: {
//             output: {
//               type: { kind: 'integer' },
//               [DIFF_META_KEY]: {
//                 nullable: diffForNullable
//               }
//             }
//           }
//         }
//       })
//     })

//     it('true -> false, enum', () => {
//       const before = graphapi`
//         type Query {
//           fruit: Fruit
//         }

//         enum Fruit {
//           Orange
//           Apple
//           Banana
//         }
//       `
//       const after = graphapi`
//         type Query {
//           fruit: Fruit!
//         }

//         enum Fruit {
//           Orange
//           Apple
//           Banana
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)
//       const diffForNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'fruit', 'output', 'nullable']
//         ]
//       }
//       expect(diffs.length).toBe(1)
//       expect(diffs[0]).toMatchObject(diffForNullable)
//       expect(merged).toMatchObject({
//         graphapi: '1.0.0',
//         queries: {
//           fruit: {
//             output: {
//               title: 'Fruit',
//               type: {
//                 kind: 'enum',
//                 values: {
//                   Orange: {},
//                   Apple: {},
//                   Banana: {},
//                 }
//               },
//               nullable: false,
//               [DIFF_META_KEY]: {
//                 nullable: diffForNullable
//               }
//             }
//           }
//         }
//       })
//     })

//     it('false -> true, enum', () => {
//       const before = graphapi`
//         type Query {
//           fruit: Fruit!
//         }

//         enum Fruit {
//           Orange
//           Apple
//           Banana
//         }
//       `
//       const after = graphapi`
//         type Query {
//           fruit: Fruit
//         }

//         enum Fruit {
//           Orange
//           Apple
//           Banana
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)
//       const diffForNullable = {
//         type: breaking,
//         action: DiffAction.remove,
//         beforeValue: false,
//         beforeDeclarationPaths: [
//           ['queries', 'fruit', 'output', 'nullable']
//         ]
//       }
//       expect(diffs.length).toBe(1)
//       expect(diffs[0]).toMatchObject(diffForNullable)
//       expect(merged).toMatchObject({
//         graphapi: '1.0.0',
//         queries: {
//           fruit: {
//             output: {
//               title: 'Fruit',
//               type: {
//                 kind: 'enum',
//                 values: {
//                   Orange: {},
//                   Apple: {},
//                   Banana: {},
//                 }
//               },
//               nullable: false,
//               [DIFF_META_KEY]: {
//                 nullable: diffForNullable
//               }
//             }
//           }
//         }
//       })
//     })

//     it('true -> false, union', () => {
//       const before = graphapi`
//         type Query {
//           diff: Diff
//         }

//         union Diff = DiffAdd | DiffRemove | DiffReplace

//         type DiffAdd {
//           afterValue: String!
//         }

//         type DiffRemove {
//           beforeValue: String!
//         }

//         type DiffReplace {
//           beforeValue: String!
//           afterValue: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           diff: Diff!
//         }

//         union Diff = DiffAdd | DiffRemove | DiffReplace

//         type DiffAdd {
//           afterValue: String!
//         }

//         type DiffRemove {
//           beforeValue: String!
//         }

//         type DiffReplace {
//           beforeValue: String!
//           afterValue: String!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)
//       const diffForNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'diff', 'output', 'nullable']
//         ]
//       }
//       expect(diffs.length).toBe(1)
//       expect(diffs[0]).toMatchObject(diffForNullable)
//     })

//     it('false -> true, union', () => {
//       const before = graphapi`
//         type Query {
//           diff: Diff!
//         }

//         union Diff = DiffAdd | DiffRemove | DiffReplace

//         type DiffAdd {
//           afterValue: String!
//         }

//         type DiffRemove {
//           beforeValue: String!
//         }

//         type DiffReplace {
//           beforeValue: String!
//           afterValue: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           diff: Diff
//         }

//         union Diff = DiffAdd | DiffRemove | DiffReplace

//         type DiffAdd {
//           afterValue: String!
//         }

//         type DiffRemove {
//           beforeValue: String!
//         }

//         type DiffReplace {
//           beforeValue: String!
//           afterValue: String!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)
//       const diffForNullable = {
//         type: breaking,
//         action: DiffAction.remove,
//         beforeValue: false,
//         beforeDeclarationPaths: [
//           ['queries', 'diff', 'output', 'nullable']
//         ]
//       }
//       expect(diffs.length).toBe(1)
//       expect(diffs[0]).toMatchObject(diffForNullable)
//     })
//   })

//   describe('new types in arguments', () => {
//     it('built-in scalar -> built-in scalar, both nullable', () => {
//       const before = graphapi`
//         type Query {
//           exist(id: ID): Boolean!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           exist(id: String): Boolean!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'ID' },
//         beforeDeclarationPaths: [
//           ['queries', 'exist', 'args', 'type', 'properties', 'id', 'output', 'type']
//         ],
//         afterValue: { kind: 'string' },
//         afterDeclarationPaths: [
//           ['queries', 'exist', 'args', 'type', 'properties', 'id', 'output', 'type']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldType)
//       ]))

//       if (!isObject(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         exist: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 id: {
//                   output: {
//                     type: { kind: 'string' },
//                     [DIFF_META_KEY]: {
//                       type: expect.objectContaining(diffForFieldType)
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: {
//             type: { kind: 'boolean' },
//             nullable: false,
//           }
//         }
//       })
//     })

//     it('built-in scalar -> custom scalar, both nullable', () => {
//       const before = graphapi`
//         type Query {
//           exist(id: ID): Boolean!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           exist(id: Key): Boolean!
//         }

//         scalar Key
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarKey = {
//         title: 'Key',
//         type: { kind: 'scalar' }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: expectedScalarKey.title,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Key', 'title']
//         ],
//       }
//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'ID' },
//         beforeDeclarationPaths: [
//           ['queries', 'exist', 'args', 'type', 'properties', 'id', 'output', 'type']
//         ],
//         afterValue: { kind: 'scalar' },
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Key', 'type']
//         ],
//       }
//       const diffForScalarKey = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedScalarKey,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Key']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining(diffForScalarKey),
//       ]))

//       if (!isObject(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         exist: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 id: {
//                   output: {
//                     title: 'Key',
//                     type: { kind: 'scalar' },
//                     [DIFF_META_KEY]: {
//                       title: expect.objectContaining(diffForFieldTitle),
//                       type: expect.objectContaining(diffForFieldType),
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: {
//             type: { kind: 'boolean' },
//             nullable: false,
//           }
//         }
//       })
//     })

//     it('built-in scalar -> built-in scalar', () => {
//       const before = graphapi`
//         type Query {
//           exist(id: ID!): Boolean!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           exist(id: String!): Boolean!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'ID' },
//         beforeDeclarationPaths: [
//           ['queries', 'exist', 'args', 'type', 'properties', 'id', 'output', 'type']
//         ],
//         afterValue: { kind: 'string' },
//         afterDeclarationPaths: [
//           ['queries', 'exist', 'args', 'type', 'properties', 'id', 'output', 'type']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldType)
//       ]))

//       if (!isObject(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         exist: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 id: {
//                   output: {
//                     type: { kind: 'string' },
//                     nullable: false,
//                     [DIFF_META_KEY]: {
//                       type: expect.objectContaining(diffForFieldType)
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: {
//             type: { kind: 'boolean' },
//             nullable: false,
//           }
//         }
//       })
//     })

//     it('built-in scalar -> custom scalar', () => {
//       const before = graphapi`
//         type Query {
//           exist(id: ID!): Boolean!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           exist(id: Key!): Boolean!
//         }

//         scalar Key
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarKey = {
//         title: 'Key',
//         type: { kind: 'scalar' }
//       }

//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'ID' },
//         beforeDeclarationPaths: [
//           ['queries', 'exist', 'args', 'type', 'properties', 'id', 'output', 'type']
//         ],
//         afterValue: expectedScalarKey.type,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Key', 'type']
//         ],
//       }
//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: expectedScalarKey.title,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Key', 'title']
//         ],
//       }
//       const diffForScalarKey = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedScalarKey,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Key']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForScalarKey),
//       ]))
//     })

//     it('built-in scalar -> object', () => {
//       const before = graphapi`
//         type Query {
//           fruit(search: String!): Fruit
//         }

//         enum Fruit {
//           Orange
//           Banana
//           Pineapple
//         }
//       `
//       const after = graphapi`
//         type Query {
//           fruit(search: FruitSearch!): Fruit
//         }

//         input FruitSearch {
//           flavour: String
//           shape: String
//           rigidity: Float
//           color: String
//         }

//         enum Fruit {
//           Orange
//           Banana
//           Pineapple
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedInputObjectFruitSearch = {
//         title: 'FruitSearch',
//         type: {
//           kind: 'object',
//           properties: {
//             flavour: { output: { type: { kind: 'string' } } },
//             shape: { output: { type: { kind: 'string' } } },
//             rigidity: { output: { type: { kind: 'float' } } },
//             color: { output: { type: { kind: 'string' } } },
//           }
//         }
//       }
//       const expectedEnumFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'enum',
//           values: {
//             Orange: {},
//             Banana: {},
//             Pineapple: {},
//           }
//         }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: expectedInputObjectFruitSearch.title,
//         afterDeclarationPaths: [
//           ['components', 'inputObjects', 'FruitSearch', 'title']
//         ],
//       }
//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'string' },
//         beforeDeclarationPaths: [
//           ['queries', 'fruit', 'args', 'type', 'properties', 'search', 'output', 'type']
//         ],
//         afterValue: expectedInputObjectFruitSearch.type,
//         afterDeclarationPaths: [
//           ['components', 'inputObjects', 'FruitSearch', 'type']
//         ],
//       }
//       const diffForInputObjectFruitSearch = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedInputObjectFruitSearch,
//         afterDeclarationPaths: [
//           ['components', 'inputObjects', 'FruitSearch']
//         ],
//       }

//       expect(diffs.length).toBe(3)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining(diffForInputObjectFruitSearch),
//       ]))

//       if (!isObject(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         fruit: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 search: {
//                   output: {
//                     ...expectedInputObjectFruitSearch,
//                     nullable: false,
//                     [DIFF_META_KEY]: {
//                       title: expect.objectContaining(diffForFieldTitle),
//                       type: expect.objectContaining(diffForFieldType),
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: expectedEnumFruit
//         }
//       })
//     })

//     it('built-in scalar -> enum', () => {
//       const declarations = `
//         type Fruit {
//           flavour: String
//           shape: String
//           rigidity: Float
//           color: String
//         }

//         enum FruitKind {
//           Orange
//           Banana
//           Pineapple
//         }
//       `
//       const before = buildGraphApi(`
//         type Query {
//           fruit(search: String!): Fruit
//         }

//         ${declarations}
//       `)
//       const after = buildGraphApi(`
//         type Query {
//           fruit(search: FruitKind!): Fruit
//         }

//         ${declarations}
//       `)
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedObjectFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'object',
//           properties: {
//             flavour: { output: { type: { kind: 'string' } } },
//             shape: { output: { type: { kind: 'string' } } },
//             rigidity: { output: { type: { kind: 'float' } } },
//             color: { output: { type: { kind: 'string' } } },
//           }
//         }
//       }
//       const expectedEnumFruitKind = {
//         title: 'FruitKind',
//         type: {
//           kind: 'enum',
//           values: {
//             Orange: {},
//             Banana: {},
//             Pineapple: {},
//           }
//         }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: expectedEnumFruitKind.title,
//         afterDeclarationPaths: [
//           ['components', 'enums', 'FruitKind', 'title']
//         ],
//       }
//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'string' },
//         beforeDeclarationPaths: [
//           ['queries', 'fruit', 'args', 'type', 'properties', 'search', 'output', 'type']
//         ],
//         afterValue: expectedEnumFruitKind.type,
//         afterDeclarationPaths: [
//           ['components', 'enums', 'FruitKind', 'type']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldType),
//       ]))

//       if (!isObject(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         fruit: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 search: {
//                   output: {
//                     ...expectedEnumFruitKind,
//                     nullable: false,
//                     [DIFF_META_KEY]: {
//                       title: expect.objectContaining(diffForFieldTitle),
//                       type: expect.objectContaining(diffForFieldType),
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: expectedObjectFruit
//         }
//       })
//     })

//     it('built-in scalar -> array of built-in scalar', () => { })

//     it('built-in scalar -> array of custom scalar', () => { })

//     it('built-in scalar -> array of object', () => { })

//     it('built-in scalar -> array of enum', () => { })

//     it('built-in scalar -> array of primitive union', () => { })

//     it('built-in scalar -> array of objective union', () => { })

//     it('built-in scalar -> array of enum union', () => { })

//     it('custom scalar -> built-in scalar', () => {
//       const declarations = `
//         scalar Key
//       `
//       const before = buildGraphApi(`
//         type Query {
//           exist(id: Key!): Boolean!
//         }
//         ${declarations}
//       `)
//       const after = buildGraphApi(`
//         type Query {
//           exist(id: ID!): Boolean!
//         }
//         ${declarations}
//       `)

//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarKey = {
//         title: 'Key',
//         type: { kind: 'scalar' }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.remove,
//         beforeValue: expectedScalarKey.title,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'Key', 'title']
//         ],
//       }
//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'scalar' },
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'Key', 'type']
//         ],
//         afterValue: { kind: 'ID' },
//         afterDeclarationPaths: [
//           ['queries', 'exist', 'args', 'type', 'properties', 'id', 'output', 'type']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldType),
//       ]))

//       if (!isGraphApiSchema(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         exist: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 id: {
//                   output: {
//                     title: 'Key',
//                     type: { kind: 'ID' },
//                     nullable: false,
//                     [DIFF_META_KEY]: {
//                       title: expect.objectContaining(diffForFieldTitle),
//                       type: expect.objectContaining(diffForFieldType),
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: {
//             type: { kind: 'boolean' },
//             nullable: false,
//           }
//         }
//       })
//     })

//     it('custom scalar -> another custom scalar', () => {
//       const declarations = `
//         scalar Key
//         scalar EntityId
//       `
//       const before = buildGraphApi(`
//         type Query {
//           exist(id: Key!): Boolean!
//         }
//         ${declarations}
//       `)
//       const after = buildGraphApi(`
//         type Query {
//           exist(id: EntityId!): Boolean!
//         }
//         ${declarations}
//       `)

//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarKey = {
//         title: 'Key',
//         type: { kind: 'scalar' }
//       }
//       const expectedScalarEntityId = {
//         title: 'EntityId',
//         type: { kind: 'scalar' }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: expectedScalarKey.title,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'Key', 'title']
//         ],
//         afterValue: expectedScalarEntityId.title,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'EntityId', 'title']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//       ]))

//       if (!isGraphApiSchema(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         exist: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 id: {
//                   output: {
//                     ...expectedScalarEntityId,
//                     nullable: false,
//                     [DIFF_META_KEY]: {
//                       title: expect.objectContaining(diffForFieldTitle),
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: {
//             type: { kind: 'boolean' },
//             nullable: false,
//           }
//         }
//       })
//     })

//     it('custom scalar -> object', () => {
//       const declarations = `
//         scalar FruitName
//         input FruitSearch {
//           flavour: String
//           shape: String
//           rigidity: Float
//           color: String
//         }
//       `
//       const before = buildGraphApi(`
//         type Query {
//           fruitDescription(search: FruitName!): String!
//         }
//         ${declarations}
//       `)
//       const after = buildGraphApi(`
//         type Query {
//           fruitDescription(search: FruitSearch!): String!
//         }
//         ${declarations}
//       `)

//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarFruitName = {
//         title: 'FruitName',
//         type: { kind: 'scalar' }
//       }
//       const expectedInputObjectFruitSearch = {
//         title: 'FruitSearch',
//         type: {
//           kind: 'object',
//           properties: {
//             flavour: { output: { type: { kind: 'string' } } },
//             shape: { output: { type: { kind: 'string' } } },
//             rigidity: { output: { type: { kind: 'float' } } },
//             color: { output: { type: { kind: 'string' } } },
//           }
//         }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: expectedScalarFruitName.title,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'FruitName', 'title']
//         ],
//         afterValue: expectedInputObjectFruitSearch.title,
//         afterDeclarationPaths: [
//           ['components', 'inputObjects', 'FruitSearch', 'title']
//         ],
//       }
//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: expectedScalarFruitName.type,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'FruitName', 'type']
//         ],
//         afterValue: expectedInputObjectFruitSearch.type,
//         afterDeclarationPaths: [
//           ['components', 'inputObjects', 'FruitSearch', 'type']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldType),
//       ]))

//       if (!isGraphApiSchema(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         fruitDescription: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 search: {
//                   output: {
//                     ...expectedInputObjectFruitSearch,
//                     nullable: false,
//                     [DIFF_META_KEY]: {
//                       title: expect.objectContaining(diffForFieldTitle),
//                       type: expect.objectContaining(diffForFieldType),
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: {
//             type: { kind: 'string' },
//             nullable: false,
//           }
//         }
//       })
//     })

//     it('custom scalar -> enum', () => {
//       const declarations = `
//         scalar FruitName
//         enum FruitKind {
//           Orange
//           Apple
//           Banana
//         }
//       `
//       const before = buildGraphApi(`
//         type Query {
//           fruit(kind: FruitName!): String!
//         }
//         ${declarations}
//       `)
//       const after = buildGraphApi(`
//         type Query {
//           fruit(kind: FruitKind!): String!
//         }
//         ${declarations}
//       `)

//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarFruitName = {
//         title: 'FruitName',
//         type: { kind: 'scalar' }
//       }
//       const expectedEnumFruitKind = {
//         title: 'FruitKind',
//         type: {
//           kind: 'enum',
//           values: {
//             Orange: {},
//             Apple: {},
//             Banana: {},
//           }
//         }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: expectedScalarFruitName.title,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'FruitName', 'title']
//         ],
//         afterValue: expectedEnumFruitKind.title,
//         afterDeclarationPaths: [
//           ['components', 'enums', 'FruitKind', 'title']
//         ],
//       }
//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: expectedScalarFruitName.type,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'FruitName', 'type']
//         ],
//         afterValue: expectedEnumFruitKind.type,
//         afterDeclarationPaths: [
//           ['components', 'enums', 'FruitKind', 'type']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldType),
//       ]))

//       if (!isGraphApiSchema(merged)) { fail() }

//       expect(merged.queries).toEqual({
//         fruit: {
//           args: {
//             type: {
//               kind: 'object',
//               properties: {
//                 kind: {
//                   output: {
//                     ...expectedEnumFruitKind,
//                     nullable: false,
//                     [DIFF_META_KEY]: {
//                       title: expect.objectContaining(diffForFieldTitle),
//                       type: expect.objectContaining(diffForFieldType),
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           output: {
//             type: { kind: 'string' },
//             nullable: false,
//           }
//         }
//       })
//     })

//     it('custom scalar -> array of built-in scalar', () => { })

//     it('custom scalar -> array of custom scalar', () => { })

//     it('custom scalar -> array of object', () => { })

//     it('custom scalar -> array of enum', () => { })

//     it('custom scalar -> array of primitive union', () => { })

//     it('custom scalar -> array of objective union', () => { })

//     it('custom scalar -> array of enum union', () => { })
//   })

//   describe('new types in output', () => {
//     it('built-in scalar -> built-in scalar, both nullable', () => {
//       const before = graphapi`
//         type Query {
//           test: Int
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Boolean
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedTypediff = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'integer' },
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ],
//         afterValue: { kind: 'boolean' },
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ]
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(expectedTypediff),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               type: { kind: 'boolean' },
//               [DIFF_META_KEY]: { type: expectedTypediff }
//             }
//           }
//         }
//       })
//     })

//     it('built-in scalar -> custom scalar, both nullable', () => {
//       const before = graphapi`
//         type Query {
//           test: Int
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: MyScalar
//         }

//         scalar MyScalar
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarMyScalar = {
//         title: 'MyScalar',
//         type: { kind: 'scalar' },
//       }

//       const expectedMyScalarDiff = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedScalarMyScalar,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar']
//         ]
//       }
//       const expectedTitleDiff = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: expectedScalarMyScalar.title,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar', 'title']
//         ]
//       }
//       const expectedTypeDiff = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'integer' },
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ],
//         afterValue: expectedScalarMyScalar.type,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar', 'type']
//         ]
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(expectedMyScalarDiff),
//         expect.objectContaining(expectedTitleDiff),
//         expect.objectContaining(expectedTypeDiff),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               title: 'MyScalar',
//               type: { kind: 'scalar' },
//               [DIFF_META_KEY]: {
//                 title: expectedTitleDiff,
//                 type: expectedTypeDiff,
//               }
//             }
//           }
//         },
//         components: {
//           scalars: {
//             MyScalar: {
//               title: 'MyScalar',
//               type: { kind: 'scalar' },
//             },
//             [DIFF_META_KEY]: {
//               MyScalar: expectedMyScalarDiff
//             }
//           },
//         }
//       })
//     })

//     it('built-in scalar -> built-in scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: Int!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Boolean!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedTypediff = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'integer' },
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ],
//         afterValue: { kind: 'boolean' },
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ]
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(expectedTypediff),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               type: { kind: 'boolean' },
//               [DIFF_META_KEY]: { type: expectedTypediff }
//             }
//           }
//         }
//       })
//     })

//     it('built-in scalar -> custom scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: Int!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: MyScalar!
//         }

//         scalar MyScalar
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarMyScalar = {
//         title: 'MyScalar',
//         type: { kind: 'scalar' },
//       }

//       const expectedMyScalarDiff = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedScalarMyScalar,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar']
//         ]
//       }
//       const expectedTitleDiff = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: expectedScalarMyScalar.title,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar', 'title']
//         ]
//       }
//       const expectedTypeDiff = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'integer' },
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ],
//         afterValue: expectedScalarMyScalar.type,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar', 'type']
//         ]
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(expectedMyScalarDiff),
//         expect.objectContaining(expectedTitleDiff),
//         expect.objectContaining(expectedTypeDiff),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               title: 'MyScalar',
//               type: { kind: 'scalar' },
//               [DIFF_META_KEY]: {
//                 title: expectedTitleDiff,
//                 type: expectedTypeDiff,
//               }
//             }
//           }
//         },
//         components: {
//           scalars: {
//             MyScalar: {
//               title: 'MyScalar',
//               type: { kind: 'scalar' },
//             },
//             [DIFF_META_KEY]: {
//               MyScalar: expectedMyScalarDiff
//             }
//           },
//         }
//       })
//     })

//     it('built-in scalar -> object', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: MyType!
//         }

//         type MyType {
//           id: ID!
//           name: String!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedObjectMyType = {
//         title: 'MyType',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             name: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.add,
//           afterValue: expectedObjectMyType.title,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType', 'title']
//           ]
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: { kind: 'string' },
//           beforeDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//           afterValue: expectedObjectMyType.type,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType', 'type']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedObjectMyType,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType']
//           ]
//         }),
//       ]))
//     })

//     it('built-in scalar -> enum', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Fruit!
//         }

//         enum Fruit {
//           Apple
//           Orange
//           Banana
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEnumFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'enum',
//           values: {
//             Apple: {},
//             Orange: {},
//             Banana: {},
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: { kind: 'string' },
//           beforeDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//           afterValue: expectedEnumFruit.type,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'type']
//           ],
//         }),
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.add,
//           afterValue: expectedEnumFruit.title,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'title']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEnumFruit,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit']
//           ],
//         })
//       ]))
//     })

//     it('built-in scalar -> array of built-in scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [String!]!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: { kind: 'string' },
//           beforeDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               type: { kind: 'string' },
//               nullable: false
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         }),
//       ]))
//     })

//     it('built-in scalar -> array of custom scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [JSON!]!
//         }

//         scalar JSON
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarJSON = {
//         title: 'JSON',
//         type: { kind: 'scalar' }
//       }

//       expect(diffs.length).toBe(2)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: { kind: 'string' },
//           beforeDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               ...expectedScalarJSON,
//               nullable: false,
//             },
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedScalarJSON,
//           afterDeclarationPaths: [
//             ['components', 'scalars', 'JSON']
//           ]
//         }),
//       ]))
//     })

//     it('built-in scalar -> array of object', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [MyType!]!
//         }

//         type MyType {
//           id: ID!
//           name: String!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedObjectMyType = {
//         title: 'MyType',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             name: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         },
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: { kind: 'string' },
//           beforeDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               ...expectedObjectMyType,
//               nullable: false,
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedObjectMyType,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType']
//           ]
//         })
//       ]))
//     })

//     it('built-in scalar -> array of enum', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [Fruit!]!
//         }

//         enum Fruit {
//           Apple
//           Banana
//           Orange
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityEnumFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'enum',
//           values: {
//             Apple: {},
//             Banana: {},
//             Orange: {},
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: { kind: 'string' },
//           beforeDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               ...expectedEntityEnumFruit,
//               nullable: false,
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityEnumFruit,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit']
//           ]
//         })
//       ]))
//     })

//     it('built-in scalar -> array of primitive union', () => { })

//     it('built-in scalar -> array of objective union', () => { })

//     it('built-in scalar -> array of enum union', () => { })

//     it('custom scalar -> built-in scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: MyScalar!
//         }

//         scalar MyScalar
//       `
//       const after = graphapi`
//         type Query {
//           test: Int!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarMyScalar = {
//         title: 'MyScalar',
//         type: { kind: 'scalar' },
//       }

//       const expectedMyScalarDiff = {
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: expectedScalarMyScalar,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar']
//         ]
//       }
//       const expectedTitleDiff = {
//         type: annotation,
//         action: DiffAction.remove,
//         beforeValue: expectedScalarMyScalar.title,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar', 'title']
//         ]
//       }
//       const expectedTypeDiff = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: expectedScalarMyScalar.type,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar', 'type']
//         ],
//         afterValue: { kind: 'integer' },
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(expectedMyScalarDiff),
//         expect.objectContaining(expectedTitleDiff),
//         expect.objectContaining(expectedTypeDiff),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               type: { kind: 'integer' },
//               [DIFF_META_KEY]: {
//                 title: expectedTitleDiff,
//                 type: expectedTypeDiff,
//               }
//             }
//           }
//         },
//         components: {
//           scalars: {
//             MyScalar: expectedScalarMyScalar,
//             [DIFF_META_KEY]: {
//               MyScalar: expectedMyScalarDiff
//             }
//           },
//         }
//       })
//     })

//     it('custom scalar -> another custom scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: MyScalar!
//         }

//         scalar MyScalar
//       `
//       const after = graphapi`
//         type Query {
//           test: MyAnotherScalar!
//         }

//         scalar MyAnotherScalar
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarMyScalar = {
//         title: 'MyScalar',
//         type: { kind: 'scalar' },
//       }
//       const expectedScalarMyAnotherScalar = {
//         title: 'MyAnotherScalar',
//         type: { kind: 'scalar' },
//       }

//       const expectedAddScalarDiff = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedScalarMyAnotherScalar,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyAnotherScalar']
//         ],
//       }
//       const expectedRemoveScalarDiff = {
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: expectedScalarMyScalar,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar']
//         ],
//       }
//       const expectedTitleDiff = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: expectedScalarMyScalar.title,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'MyScalar', 'title']
//         ],
//         afterValue: expectedScalarMyAnotherScalar.title,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'MyAnotherScalar', 'title']
//         ],
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(expectedAddScalarDiff),
//         expect.objectContaining(expectedRemoveScalarDiff),
//         expect.objectContaining(expectedTitleDiff),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               ...expectedScalarMyAnotherScalar,
//               [DIFF_META_KEY]: {
//                 title: expectedTitleDiff,
//               }
//             }
//           }
//         },
//         components: {
//           scalars: {
//             MyScalar: expectedScalarMyScalar,
//             MyAnotherScalar: expectedScalarMyAnotherScalar,
//             [DIFF_META_KEY]: {
//               MyScalar: expectedRemoveScalarDiff,
//               MyAnotherScalar: expectedAddScalarDiff,
//             }
//           },
//         }
//       })
//     })

//     it('custom scalar -> object', () => {
//       const before = graphapi`
//         type Query {
//           test: MyScalar!
//         }

//         scalar MyScalar
//       `
//       const after = graphapi`
//         type Query {
//           test: MyType!
//         }

//         type MyType {
//           id: ID!
//           name: String!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedObjectMyType = {
//         title: 'MyType',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             name: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }
//       const expectedScalarMyScalar = {
//         title: 'MyScalar',
//         type: { kind: 'scalar' }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedObjectMyType,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarMyScalar,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar']
//           ]
//         }),
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.replace,
//           beforeValue: expectedScalarMyScalar.title,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar', 'title']
//           ],
//           afterValue: expectedObjectMyType.title,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType', 'title'],
//           ],
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedScalarMyScalar.type,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar', 'type']
//           ],
//           afterValue: expectedObjectMyType.type,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType', 'type'],
//           ]
//         })
//       ]))
//     })

//     it('custom scalar -> enum', () => {
//       const before = graphapi`
//         type Query {
//           test: MyScalar!
//         }

//         scalar MyScalar
//       `
//       const after = graphapi`
//         type Query {
//           test: Fruit!
//         }

//         enum Fruit {
//           Apple
//           Orange
//           Banana
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarMyScalar = {
//         title: 'MyScalar',
//         type: { kind: 'scalar' }
//       }
//       const expectedEnumFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'enum',
//           values: {
//             Apple: {},
//             Orange: {},
//             Banana: {},
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedScalarMyScalar.type,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar', 'type']
//           ],
//           afterValue: expectedEnumFruit.type,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'type']
//           ],
//         }),
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.replace,
//           beforeValue: expectedScalarMyScalar.title,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar', 'title']
//           ],
//           afterValue: expectedEnumFruit.title,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'title']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarMyScalar,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEnumFruit,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit']
//           ],
//         })
//       ]))
//     })

//     it('custom scalar -> array of built-in scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: JSON!
//         }

//         scalar JSON
//       `
//       const after = graphapi`
//         type Query {
//           test: [String!]!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarJSON = {
//         title: 'JSON',
//         type: { kind: 'scalar' }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarJSON,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON']
//           ]
//         }),
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarJSON.title,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON', 'title']
//           ]
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedScalarJSON.type,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               type: { kind: 'string' },
//               nullable: false
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         })
//       ]))
//     })

//     it('custom scalar -> array of another custom scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: JSON!
//         }

//         scalar JSON
//       `
//       const after = graphapi`
//         type Query {
//           test: [XML!]!
//         }

//         scalar XML
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarJSON = {
//         title: 'JSON',
//         type: { kind: 'scalar' }
//       }
//       const expectedScalarXML = {
//         title: 'XML',
//         type: { kind: 'scalar' }
//       }

//       expect(diffs.length).toBe(4)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarJSON,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedScalarXML,
//           afterDeclarationPaths: [
//             ['components', 'scalars', 'XML']
//           ]
//         }),
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarJSON.title,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON', 'title']
//           ],
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedScalarJSON.type,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               ...expectedScalarXML,
//               nullable: false,
//             },
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         })
//       ]))
//     })

//     it('custom scalar -> array of objects', () => {
//       const before = graphapi`
//         type Query {
//             test: MyScalar!
//         }

//         scalar MyScalar
//       `
//       const after = graphapi`
//         type Query {
//             test: [MyType!]!
//         }

//         type MyType {
//             id: ID!
//             name: String
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedScalarMyScalar = {
//         title: 'MyScalar',
//         type: { kind: 'scalar' },
//       }
//       const expectedObjectMyType = {
//         title: 'MyType',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             name: { output: { type: { kind: 'string' } } },
//           }
//         },
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarMyScalar,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedObjectMyType,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'MyType']
//           ]
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedScalarMyScalar.type,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               ...expectedObjectMyType,
//               nullable: false,
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         }),
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.remove,
//           beforeValue: expectedScalarMyScalar.title,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'MyScalar', 'title']
//           ],
//         })
//       ]))
//     })

//     it('custom scalar -> array of enum', () => {
//       const before = graphapi`
//         type Query {
//           test: JSON!
//         }

//         scalar JSON
//       `
//       const after = graphapi`
//         type Query {
//           test: [MediaType!]!
//         }

//         enum MediaType {
//           JSON
//           XML
//           YAML
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityJson = {
//         title: 'JSON',
//         type: { kind: 'scalar' },
//       }
//       const expectedEntityMediaType = {
//         title: 'MediaType',
//         type: {
//           kind: 'enum',
//           values: {
//             JSON: {},
//             XML: {},
//             YAML: {},
//           }
//         }
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedEntityJson.type,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               ...expectedEntityMediaType,
//               nullable: false,
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityJson,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityMediaType,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'MediaType']
//           ]
//         }),
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityJson.title,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'JSON', 'title']
//           ],
//         })
//       ]))
//     })

//     it('custom scalar -> array of primitive union', () => { })

//     it('custom scalar -> array of objective union', () => { })

//     it('custom scalar -> array of enum union', () => { })

//     it('enum -> another enum', () => {
//       const before = graphapi`
//         type Query {
//           test: Animal!
//         }

//         enum Animal {
//           Cat
//           Dog
//           Parrow
//           Common
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Fruit!
//         }

//         enum Fruit {
//           Apple
//           Orange
//           Banana
//           Common
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEnumAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'enum',
//           values: {
//             Cat: {},
//             Dog: {},
//             Parrow: {},
//             Common: {},
//           }
//         }
//       }
//       const expectedEnumFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'enum',
//           values: {
//             Apple: {},
//             Orange: {},
//             Banana: {},
//             Common: {},
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.replace,
//           beforeValue: expectedEnumAnimal.title,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'title']
//           ],
//           afterValue: expectedEnumFruit.title,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'title']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEnumAnimal.type.values.Cat,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'type', 'values', 'Cat']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEnumAnimal.type.values.Dog,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'type', 'values', 'Dog']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEnumAnimal.type.values.Parrow,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'type', 'values', 'Parrow']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEnumFruit.type.values.Apple,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'type', 'values', 'Apple']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEnumFruit.type.values.Orange,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'type', 'values', 'Orange']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEnumFruit.type.values.Banana,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'type', 'values', 'Banana']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEnumAnimal,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEnumFruit,
//           afterDeclarationPaths: [
//             ['components', 'enums', 'Fruit']
//           ],
//         })
//       ]))
//     })

//     it('enum -> object (same name)', () => {
//       const before = graphapi`
//         type Query {
//           test: Fruit!
//         }

//         enum Fruit {
//           Apple
//           Orange
//           Banana
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Fruit!
//         }

//         type Fruit {
//           id: ID!
//           name: String!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityEnumFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'enum',
//           values: {
//             Apple: {},
//             Orange: {},
//             Banana: {},
//           }
//         }
//       }
//       const expectedEntityObjectFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             name: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityObjectFruit,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Fruit']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityEnumFruit,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Fruit']
//           ]
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedEntityEnumFruit.type,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Fruit', 'type']
//           ],
//           afterValue: expectedEntityObjectFruit.type,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Fruit', 'type'],
//           ]
//         })
//       ]))
//     })

//     it('enum -> array of built-in scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: Animal!
//         }

//         enum Animal {
//           Cat
//           Dog
//           Parrow
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [String!]!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'enum',
//           values: {
//             Cat: {},
//             Dog: {},
//             Parrow: {},
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityAnimal.title,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'title']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityAnimal,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal']
//           ]
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedEntityAnimal.type,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               type: { kind: 'string' },
//               nullable: false
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//         })
//       ]))
//     })

//     it('enum -> array of custom scalar', () => {
//       const before = graphapi`
//         type Query {
//           test: Animal!
//         }

//         enum Animal {
//           Cat
//           Dog
//           Parrow
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [AnimalKind!]!
//         }

//         scalar AnimalKind
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'enum',
//           values: {
//             Cat: {},
//             Dog: {},
//             Parrow: {},
//           }
//         }
//       }
//       const expectedEntityAnimalKind = {
//         title: 'AnimalKind',
//         type: { kind: 'scalar' }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityAnimal.title,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'title']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityAnimal,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityAnimalKind,
//           afterDeclarationPaths: [
//             ['components', 'scalars', 'AnimalKind']
//           ]
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedEntityAnimal.type,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: {
//               ...expectedEntityAnimalKind,
//               nullable: false
//             }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//         })
//       ]))
//     })

//     it('enum -> array of object', () => {
//       const before = graphapi`
//         type Query {
//           test: Animal!
//         }

//         enum Animal {
//           Cat
//           Dog
//           Parrow
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [AnimalKind!]!
//         }

//         type AnimalKind {
//           name: String!
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'enum',
//           values: {
//             Cat: {},
//             Dog: {},
//             Parrow: {},
//           }
//         }
//       }
//       const expectedEntityAnimalKind = {
//         title: 'AnimalKind',
//         type: {
//           kind: 'object',
//           properties: {
//             name: { output: { type: { kind: 'string' }, nullable: false } }
//           }
//         }
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityAnimal.title,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'title']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityAnimal,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityAnimalKind,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'AnimalKind']
//           ]
//         }),
//         expect.objectContaining({
//           type: breaking,
//           action: DiffAction.replace,
//           beforeValue: expectedEntityAnimal.type,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Animal', 'type']
//           ],
//           afterValue: {
//             kind: 'array',
//             items: { ...expectedEntityAnimalKind, nullable: false }
//           },
//           afterDeclarationPaths: [
//             ['queries', 'test', 'output', 'type']
//           ],
//         })
//       ]))
//     })

//     it('enum -> array of primitive union', () => { })

//     it('enum -> array of objective union', () => { })

//     it('enum -> array of enum union', () => { })

//     it('object -> another object', () => {
//       const before = graphapi`
//         type Query {
//           test: User!
//         }

//         type User {
//           id: ID!
//           login: String!
//           email: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Person!
//         }

//         type Person {
//           id: ID!
//           firstName: String!
//           middleName: String
//           lastName: String!
//           birthDate: [Int!]
//         }
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityUser = {
//         title: 'User',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             login: { output: { type: { kind: 'string' }, nullable: false } },
//             email: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }
//       const expectedEntityPerson = {
//         title: 'Person',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             firstName: { output: { type: { kind: 'string' }, nullable: false } },
//             middleName: { output: { type: { kind: 'string' } } },
//             lastName: { output: { type: { kind: 'string' }, nullable: false } },
//             birthDate: {
//               output: {
//                 type: {
//                   kind: 'array',
//                   items: {
//                     type: { kind: 'integer' },
//                     nullable: false
//                   }
//                 },
//               }
//             },
//           }
//         }
//       }

//       expect(diffs.length).toBe(9)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.replace,
//           beforeValue: expectedEntityUser.title,
//           beforeDeclarationPaths: [
//             ['components', 'objects', 'User', 'title']
//           ],
//           afterValue: expectedEntityPerson.title,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Person', 'title']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityUser.type.properties.login,
//           beforeDeclarationPaths: [
//             ['components', 'objects', 'User', 'type', 'properties', 'login']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityUser.type.properties.email,
//           beforeDeclarationPaths: [
//             ['components', 'objects', 'User', 'type', 'properties', 'email']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityPerson.type.properties.firstName,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Person', 'type', 'properties', 'firstName']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityPerson.type.properties.middleName,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Person', 'type', 'properties', 'middleName']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityPerson.type.properties.lastName,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Person', 'type', 'properties', 'lastName']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityPerson.type.properties.birthDate,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Person', 'type', 'properties', 'birthDate']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityUser,
//           beforeDeclarationPaths: [
//             ['components', 'objects', 'User']
//           ],
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityPerson,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Person']
//           ],
//         }),
//       ]))
//     })

//     it('object -> array of built-in scalar', () => { })

//     it('object -> array of custom scalar', () => { })

//     it('object -> array of the same object', () => { })

//     it('object -> array of another object', () => { })

//     it('object -> array of enum', () => { })

//     it('object -> array of primitive union', () => { })

//     it('object -> array of objective union', () => { })

//     it('object -> array of enum union', () => { })

//     it('array of built-in scalar -> array of object', () => {
//       const before = graphapi`
//         type Query {
//           test: [ID!]!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [User!]!
//         }

//         type User {
//           id: ID!
//           login: String!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityUser = {
//         title: 'User',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             login: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }

//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'ID' },
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'type', 'items', 'type']
//         ],
//         afterValue: expectedEntityUser.type,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'User', 'type']
//         ]
//       }

//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.add,
//           afterValue: expectedEntityUser.title,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'User', 'title']
//           ]
//         }),
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityUser,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'User']
//           ]
//         }),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               type: {
//                 kind: 'array',
//                 items: {
//                   ...expectedEntityUser,
//                   [DIFF_META_KEY]: {
//                     type: diffForFieldType
//                   }
//                 }
//               }
//             }
//           }
//         }
//       })
//     })

//     it('array of custom scalar -> array of object', () => {
//       const before = graphapi`
//         type Query {
//           test: [UserID!]!
//         }

//         scalar UserID
//       `
//       const after = graphapi`
//         type Query {
//           test: [User!]!
//         }

//         type User {
//           id: ID!
//           login: String!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityUserId = {
//         title: 'UserID',
//         type: { kind: 'scalar' }
//       }
//       const expectedEntityUser = {
//         title: 'User',
//         type: {
//           kind: 'object',
//           properties: {
//             id: { output: { type: { kind: 'ID' }, nullable: false } },
//             login: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }

//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: expectedEntityUserId.type,
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'UserID', 'type']
//         ],
//         afterValue: expectedEntityUser.type,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'User', 'type']
//         ]
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining({
//           type: annotation,
//           action: DiffAction.replace,
//           beforeValue: expectedEntityUserId.title,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'UserID', 'title']
//           ],
//           afterValue: expectedEntityUser.title,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'User', 'title']
//           ]
//         }),
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityUserId,
//           beforeDeclarationPaths: [
//             ['components', 'scalars', 'UserID']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityUser,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'User']
//           ]
//         }),
//       ]))
//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               type: {
//                 kind: 'array',
//                 items: {
//                   ...expectedEntityUser,
//                   nullable: false,
//                   [DIFF_META_KEY]: {
//                     type: diffForFieldType
//                   }
//                 }
//               }
//             }
//           }
//         }
//       })
//     })

//     it('array of enum -> array of object', () => {
//       const before = graphapi`
//         type Query {
//           test: [Fruit!]!
//         }

//         enum Fruit {
//           Apple
//           Orange
//           Banana
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [Fruit!]!
//         }

//         type Fruit {
//           title: String!
//           shape: String!
//           flavour: String!
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityEnumFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'enum',
//           values: {
//             Apple: {},
//             Orange: {},
//             Banana: {},
//           }
//         }
//       }
//       const expectedEntityObjectFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             shape: { output: { type: { kind: 'string' }, nullable: false } },
//             flavour: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }

//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: expectedEntityEnumFruit.type,
//         beforeDeclarationPaths: [
//           ['components', 'enums', 'Fruit', 'type']
//         ],
//         afterValue: expectedEntityObjectFruit.type,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'type']
//         ]
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityEnumFruit,
//           beforeDeclarationPaths: [
//             ['components', 'enums', 'Fruit']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityObjectFruit,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Fruit']
//           ]
//         }),
//       ]))

//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               type: {
//                 kind: 'array',
//                 items: {
//                   ...expectedEntityObjectFruit,
//                   nullable: false,
//                   [DIFF_META_KEY]: {
//                     type: diffForFieldType
//                   }
//                 }
//               }
//             }
//           }
//         }
//       })
//     })

//     it('array of object -> array of another object', () => {
//       const before = graphapi`
//         type Query {
//           test: [Fruit!]!
//         }

//         type Fruit {
//           title: String!
//           shape: String!
//           flavour: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: [Animal!]!
//         }

//         type Animal {
//           title: String!
//           voice: String!
//           claws: Boolean
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityObjectFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             shape: { output: { type: { kind: 'string' }, nullable: false } },
//             flavour: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }
//       const expectedEntityObjectAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             voice: { output: { type: { kind: 'string' }, nullable: false } },
//             claws: { output: { type: { kind: 'boolean' } } },
//           }
//         }
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: expectedEntityObjectFruit.title,
//         beforeDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'title']
//         ],
//         afterValue: expectedEntityObjectAnimal.title,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Animal', 'title']
//         ],
//       }
//       const diffForPropertyShape = {
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: expectedEntityObjectFruit.type.properties.shape,
//         beforeDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'type', 'properties', 'shape']
//         ]
//       }
//       const diffForPropertyFlavour = {
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: expectedEntityObjectFruit.type.properties.flavour,
//         beforeDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'type', 'properties', 'flavour']
//         ]
//       }
//       const diffForPropertyVoice = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal.type.properties.voice,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Animal', 'type', 'properties', 'voice']
//         ]
//       }
//       const diffForPropertyClaws = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal.type.properties.claws,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Animal', 'type', 'properties', 'claws']
//         ]
//       }

//       expect(diffs.length).toBe(7)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForPropertyShape),
//         expect.objectContaining(diffForPropertyFlavour),
//         expect.objectContaining(diffForPropertyVoice),
//         expect.objectContaining(diffForPropertyClaws),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.remove,
//           beforeValue: expectedEntityObjectFruit,
//           beforeDeclarationPaths: [
//             ['components', 'objects', 'Fruit']
//           ]
//         }),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityObjectAnimal,
//           afterDeclarationPaths: [
//             ['components', 'objects', 'Animal']
//           ]
//         }),
//       ]))

//       expect(merged).toMatchObject({
//         queries: {
//           test: {
//             output: {
//               type: {
//                 kind: 'array',
//                 items: {
//                   title: expectedEntityObjectAnimal.title,
//                   type: {
//                     kind: 'object',
//                     properties: {
//                       ...expectedEntityObjectFruit.type.properties,
//                       ...expectedEntityObjectAnimal.type.properties,
//                       [DIFF_META_KEY]: {
//                         shape: diffForPropertyShape,
//                         flavour: diffForPropertyFlavour,
//                         voice: diffForPropertyVoice,
//                         claws: diffForPropertyClaws,
//                       }
//                     },
//                   },
//                   nullable: false,
//                   [DIFF_META_KEY]: {
//                     title: diffForFieldTitle
//                   }
//                 }
//               }
//             }
//           }
//         }
//       })
//     })

//     it('scalar -> union of scalars (has the same scalar)', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Primitive!
//         }

//         union Primitive = ID | String | Int | Float | Boolean
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityPrimitive = {
//         title: 'Primitive',
//         oneOf: [
//           { type: { kind: 'ID' } },
//           { type: { kind: 'string' } },
//           { type: { kind: 'integer' } },
//           { type: { kind: 'float' } },
//           { type: { kind: 'boolean' } },
//         ]
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: expectedEntityPrimitive.title,
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Primitive', 'title']
//         ]
//       }
//       const diffForFieldNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'nullable'],
//         ],
//       }
//       const diffForOneOfItem = (index: number) => ({
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: expectedEntityPrimitive.oneOf[index],
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Primitive', 'oneOf', index]
//         ]
//       })

//       expect(diffs.length).toBe(6)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldNullable),
//         expect.objectContaining(diffForOneOfItem(0)),
//         expect.objectContaining(diffForOneOfItem(2)),
//         expect.objectContaining(diffForOneOfItem(3)),
//         expect.objectContaining(diffForOneOfItem(4)),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityPrimitive,
//           afterDeclarationPaths: [
//             ['components', 'unions', 'Primitive']
//           ]
//         }),
//       ]))

//       const expectedMerged = {
//         queries: {
//           test: {
//             output: {
//               ...expectedEntityPrimitive,
//               nullable: false,
//               [DIFF_META_KEY]: {
//                 title: diffForFieldTitle
//               }
//             }
//           }
//         }
//       }
//       Object.defineProperty(
//         expectedMerged.queries.test.output.oneOf,
//         DIFF_META_KEY,
//         {
//           value: {
//             0: diffForOneOfItem(0),
//             2: diffForOneOfItem(2),
//             3: diffForOneOfItem(3),
//             4: diffForOneOfItem(4),
//           }
//         }
//       )

//       if (!isGraphApiSchema(merged)) {
//         fail('Merged doc after comparing 2 GraphAPI must be a GraphAPI.')
//       }

//       const actualOutput = merged.queries!.test.output as GraphApiUnion

//       expect(actualOutput.title).toBe(expectedEntityPrimitive.title)
//       expect(actualOutput.oneOf.length).toBe(5)
//       if (!isObject(actualOutput)) { fail() }
//       expect(actualOutput[DIFF_META_KEY]).toMatchObject({ title: diffForFieldTitle })
//       expect((actualOutput.oneOf[0] as GraphApiScalar).type.kind).toBe('ID')
//       expect((actualOutput.oneOf[1] as GraphApiScalar).type.kind).toBe('string')
//       expect((actualOutput.oneOf[2] as GraphApiScalar).type.kind).toBe('integer')
//       expect((actualOutput.oneOf[3] as GraphApiScalar).type.kind).toBe('float')
//       expect((actualOutput.oneOf[4] as GraphApiScalar).type.kind).toBe('boolean')
//       if (!isObject(actualOutput.oneOf)) { fail() }
//       expect(actualOutput.oneOf[DIFF_META_KEY]).toMatchObject({
//         0: diffForOneOfItem(0),
//         2: diffForOneOfItem(2),
//         3: diffForOneOfItem(3),
//         4: diffForOneOfItem(4),
//       })
//     })

//     it('scalar -> union of scalars (DOES NOT have the same scalar)', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Primitive!
//         }

//         union Primitive = ID | Int | Float | Boolean
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: 'Primitive',
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Primitive', 'title']
//         ]
//       }
//       const diffForFieldNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'nullable']
//         ]
//       }
//       const diffForOneOfItem0 = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: { kind: 'string' },
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ],
//         afterValue: { kind: 'ID' },
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Primitive', 'oneOf', 0, 'type']
//         ],
//       }
//       const diffAddForOneOfItem = (index: number) => ({
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: expectedEntityPrimitive.oneOf[index],
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Primitive', 'oneOf', index]
//         ]
//       })

//       const expectedEntityPrimitive = {
//         title: 'Primitive',
//         oneOf: [
//           { type: { kind: 'ID' } },
//           { type: { kind: 'integer' } },
//           { type: { kind: 'float' } },
//           { type: { kind: 'boolean' } },
//         ]
//       }

//       expect(diffs.length).toBe(7)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldNullable),
//         expect.objectContaining(diffForOneOfItem0),
//         expect.objectContaining(diffAddForOneOfItem(1)),
//         expect.objectContaining(diffAddForOneOfItem(2)),
//         expect.objectContaining(diffAddForOneOfItem(3)),
//         expect.objectContaining({
//           type: unclassified,
//           action: DiffAction.add,
//           afterValue: expectedEntityPrimitive,
//           afterDeclarationPaths: [
//             ['components', 'unions', 'Primitive']
//           ]
//         })
//       ]))

//       const expectedMerged = {
//         queries: {
//           test: {
//             output: {
//               ...expectedEntityPrimitive,
//               [DIFF_META_KEY]: {
//                 title: diffForFieldTitle
//               }
//             }
//           }
//         }
//       }
//       const expectedDiffsForOneOf = {
//         1: diffAddForOneOfItem(1),
//         2: diffAddForOneOfItem(2),
//         3: diffAddForOneOfItem(3),
//       }
//       Object.defineProperty(
//         expectedMerged.queries.test.output.oneOf,
//         DIFF_META_KEY,
//         { value: expectedDiffsForOneOf }
//       )

//       if (!isGraphApiSchema(merged)) {
//         fail('Merged doc after comparing 2 GraphAPI must be a GraphAPI.')
//       }

//       const actualOutput = merged.queries!.test.output as GraphApiUnion

//       expect(actualOutput.title).toBe(expectedEntityPrimitive.title)
//       expect(actualOutput.oneOf.length).toBe(4)
//       if (!isObject(actualOutput)) { fail() }
//       expect(actualOutput[DIFF_META_KEY]).toMatchObject({ title: diffForFieldTitle })
//       expect((actualOutput.oneOf[0] as GraphApiScalar).type.kind).toBe('ID')
//       expect((actualOutput.oneOf[1] as GraphApiScalar).type.kind).toBe('integer')
//       expect((actualOutput.oneOf[2] as GraphApiScalar).type.kind).toBe('float')
//       expect((actualOutput.oneOf[3] as GraphApiScalar).type.kind).toBe('boolean')
//       if (!isObject(actualOutput.oneOf)) { fail() }
//       expect(actualOutput.oneOf[DIFF_META_KEY]).toMatchObject(expectedDiffsForOneOf)
//     })

//     it('scalar -> union of objects', () => {
//       const before = graphapi`
//         type Query {
//           test: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Objective!
//         }

//         union Objective = Fruit | Animal

//         type Fruit {
//           title: String!
//           shape: String!
//           flavour: String!
//         }

//         type Animal {
//           title: String!
//           voice: String!
//           claws: Boolean
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityScalarString = {
//         type: { kind: 'string' }
//       }
//       const expectedEntityObjectFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             shape: { output: { type: { kind: 'string' }, nullable: false } },
//             flavour: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }
//       const expectedEntityObjectAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             voice: { output: { type: { kind: 'string' }, nullable: false } },
//             claws: { output: { type: { kind: 'boolean' } } },
//           }
//         }
//       }
//       const expectedEntityUnionObjective = {
//         title: 'Objective',
//         oneOf: [
//           expectedEntityObjectFruit,
//           expectedEntityObjectAnimal
//         ],
//       }

//       const diffForFieldTitleObjective = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: 'Objective',
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective', 'title']
//         ]
//       }
//       const diffForFieldTitleFruit = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: 'Fruit',
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'title']
//         ]
//       }
//       const diffForFieldNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'nullable']
//         ]
//       }
//       const diffForFieldType = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: expectedEntityScalarString.type,
//         beforeDeclarationPaths: [
//           ['queries', 'test', 'output', 'type']
//         ],
//         afterValue: expectedEntityObjectFruit.type,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'type']
//         ]
//       }
//       const diffForOneOfItem1 = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal,
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective', 'oneOf', 1]
//         ]
//       }
//       const diffForObjectFruit = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectFruit,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Fruit']
//         ]
//       }
//       const diffForObjectAnimal = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Animal']
//         ]
//       }
//       const diffForUnionObjective = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityUnionObjective,
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective']
//         ]
//       }

//       expect(diffs.length).toBe(8)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitleObjective),
//         expect.objectContaining(diffForFieldTitleFruit),
//         expect.objectContaining(diffForFieldNullable),
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining(diffForOneOfItem1),
//         expect.objectContaining(diffForObjectFruit),
//         expect.objectContaining(diffForObjectAnimal),
//         expect.objectContaining(diffForUnionObjective),
//       ]))

//       const expectedMerged = {
//         queries: {
//           test: {
//             output: {
//               title: 'Objective',
//               oneOf: [
//                 {
//                   ...expectedEntityObjectFruit,
//                   [DIFF_META_KEY]: {
//                     title: diffForFieldTitleFruit,
//                     type: diffForFieldType
//                   }
//                 },
//                 { ...expectedEntityObjectAnimal }
//               ],
//               [DIFF_META_KEY]: {
//                 title: diffForFieldTitleObjective
//               }
//             }
//           }
//         }
//       }
//       Object.defineProperty(
//         expectedMerged.queries.test.output.oneOf,
//         DIFF_META_KEY,
//         {
//           value: {
//             1: diffForOneOfItem1,
//           }
//         }
//       )

//       if (!isGraphApiSchema(merged)) {
//         fail('Merged doc after comparing 2 GraphAPI must be a GraphAPI.')
//       }

//       const actualOutput = merged.queries!.test.output as GraphApiUnion
//       expect(actualOutput.title).toBe(expectedEntityUnionObjective.title)
//       expect(actualOutput.oneOf.length).toBe(2)
//       if (!isObject(actualOutput)) { fail() }
//       expect(actualOutput[DIFF_META_KEY]).toMatchObject({ title: diffForFieldTitleObjective })
//       expect((actualOutput.oneOf[0] as GraphApiObject).title).toBe(expectedEntityObjectFruit.title)
//       expect((actualOutput.oneOf[0] as GraphApiObject).type.properties).toMatchObject(expectedEntityObjectFruit.type.properties)
//       expect((actualOutput.oneOf[1] as GraphApiObject).title).toBe(expectedEntityObjectAnimal.title)
//       expect((actualOutput.oneOf[1] as GraphApiObject).type.properties).toMatchObject(expectedEntityObjectAnimal.type.properties)
//       if (!isObject(actualOutput.oneOf)) { fail() }
//       expect(actualOutput.oneOf[DIFF_META_KEY]).toMatchObject({ 1: diffForOneOfItem1 })
//     })

//     it('object -> union of objects (has the same object)', () => {
//       const before = graphapi`
//         type Query {
//           test: Fruit!
//         }

//         type Fruit {
//           title: String!
//           shape: String!
//           flavour: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Objective!
//         }

//         union Objective = Fruit | Animal

//         type Fruit {
//           title: String!
//           shape: String!
//           flavour: String!
//         }

//         type Animal {
//           title: String!
//           voice: String!
//           claws: Boolean
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityObjectFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             shape: { output: { type: { kind: 'string' }, nullable: false } },
//             flavour: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }
//       const expectedEntityObjectAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             voice: { output: { type: { kind: 'string' }, nullable: false } },
//             claws: { output: { type: { kind: 'boolean' } } },
//           }
//         }
//       }
//       const expectedEntityUnionObjective = {
//         title: 'Objective',
//         oneOf: [
//           expectedEntityObjectFruit,
//           expectedEntityObjectAnimal
//         ],
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: 'Objective',
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective', 'title']
//         ]
//       }
//       const diffForFieldNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'nullable']
//         ]
//       }
//       const diffForOneOfItem1 = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal,
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective', 'oneOf', 1]
//         ]
//       }
//       const diffForObjectAnimal = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Animal']
//         ]
//       }
//       const diffForUnionObjective = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityUnionObjective,
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective']
//         ]
//       }

//       expect(diffs.length).toBe(5)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldNullable),
//         expect.objectContaining(diffForOneOfItem1),
//         expect.objectContaining(diffForObjectAnimal),
//         expect.objectContaining(diffForUnionObjective),
//       ]))

//       const expectedMerged = {
//         queries: {
//           test: {
//             output: {
//               ...diffForUnionObjective.afterValue,
//               nullable: false,
//               [DIFF_META_KEY]: {
//                 title: diffForFieldTitle,
//                 nullable: diffForFieldNullable,
//               }
//             }
//           }
//         }
//       }
//       Object.defineProperty(
//         expectedMerged.queries.test.output.oneOf,
//         DIFF_META_KEY,
//         {
//           value: {
//             1: diffForOneOfItem1,
//           }
//         }
//       )

//       if (!isGraphApiSchema(merged)) {
//         fail('Merged doc after comparing 2 GraphAPI must be a GraphAPI.')
//       }

//       const actualOutput = merged.queries!.test.output as GraphApiUnion
//       expect(actualOutput.title).toBe(expectedEntityUnionObjective.title)
//       expect(actualOutput.nullable).toBe(false)
//       expect(actualOutput.oneOf.length).toBe(2)
//       if (!isObject(actualOutput)) { fail() }
//       expect(actualOutput[DIFF_META_KEY])
//         .toMatchObject({
//           title: diffForFieldTitle,
//           nullable: diffForFieldNullable
//         })
//       expect((actualOutput.oneOf[0] as GraphApiObject).title).toBe(expectedEntityObjectFruit.title)
//       expect((actualOutput.oneOf[0] as GraphApiObject).type.properties).toMatchObject(expectedEntityObjectFruit.type.properties)
//       expect((actualOutput.oneOf[1] as GraphApiObject).title).toBe(expectedEntityObjectAnimal.title)
//       expect((actualOutput.oneOf[1] as GraphApiObject).type.properties).toMatchObject(expectedEntityObjectAnimal.type.properties)
//       if (!isObject(actualOutput.oneOf)) { fail() }
//       expect(actualOutput.oneOf[DIFF_META_KEY]).toMatchObject({ 1: diffForOneOfItem1 })
//     })

//     it('object -> union of objects (DOES NOT have the same object)', () => {
//       const before = graphapi`
//         type Query {
//           test: Fruit!
//         }

//         type Fruit {
//           title: String!
//           shape: String!
//           flavour: String!
//         }
//       `
//       const after = graphapi`
//         type Query {
//           test: Objective!
//         }

//         union Objective = Car | Animal

//         type Car {
//           title: String!
//           velocity: Float!
//         }

//         type Animal {
//           title: String!
//           voice: String!
//           claws: Boolean
//         }
//       `
//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEntityObjectFruit = {
//         title: 'Fruit',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             shape: { output: { type: { kind: 'string' }, nullable: false } },
//             flavour: { output: { type: { kind: 'string' }, nullable: false } },
//           }
//         }
//       }
//       const expectedEntityObjectCar = {
//         title: 'Car',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             velocity: { output: { type: { kind: 'float' }, nullable: false } },
//           }
//         }
//       }
//       const expectedEntityObjectAnimal = {
//         title: 'Animal',
//         type: {
//           kind: 'object',
//           properties: {
//             title: { output: { type: { kind: 'string' }, nullable: false } },
//             voice: { output: { type: { kind: 'string' }, nullable: false } },
//             claws: { output: { type: { kind: 'boolean' } } },
//           }
//         }
//       }
//       const expectedEntityUnionObjective = {
//         title: 'Objective',
//         oneOf: [
//           expectedEntityObjectCar,
//           expectedEntityObjectAnimal
//         ],
//       }

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: 'Objective',
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective', 'title']
//         ]
//       }
//       const diffForFieldNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ['queries', 'test', 'output', 'nullable']
//         ]
//       }
//       const diffForOneOfItem0FieldTitle = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: 'Fruit',
//         beforeDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'title']
//         ],
//         afterValue: 'Car',
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Car', 'title']
//         ]
//       }
//       const diffForOneOfItem0PropertyShape = {
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: expectedEntityObjectFruit.type.properties.shape,
//         beforeDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'type', 'properties', 'shape']
//         ]
//       }
//       const diffForOneOfItem0PropertyFlavour = {
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: expectedEntityObjectFruit.type.properties.flavour,
//         beforeDeclarationPaths: [
//           ['components', 'objects', 'Fruit', 'type', 'properties', 'flavour']
//         ]
//       }
//       const diffForOneOfItem0PropertyVelocity = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectCar.type.properties.velocity,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Car', 'type', 'properties', 'velocity']
//         ]
//       }
//       const diffForOneOfItem1 = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal,
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective', 'oneOf', 1]
//         ]
//       }
//       const diffForObjectFruit = {
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: expectedEntityObjectFruit,
//         beforeDeclarationPaths: [
//           ['components', 'objects', 'Fruit']
//         ]
//       }
//       const diffForObjectCar = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectCar,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Car']
//         ]
//       }
//       const diffForObjectAnimal = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityObjectAnimal,
//         afterDeclarationPaths: [
//           ['components', 'objects', 'Animal']
//         ]
//       }
//       const diffForUnionObjective = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedEntityUnionObjective,
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Objective']
//         ]
//       }

//       expect(diffs.length).toBe(11)
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldTitle),
//         expect.objectContaining(diffForFieldNullable),
//         expect.objectContaining(diffForOneOfItem0FieldTitle),
//         expect.objectContaining(diffForOneOfItem0PropertyShape),
//         expect.objectContaining(diffForOneOfItem0PropertyFlavour),
//         expect.objectContaining(diffForOneOfItem0PropertyVelocity),
//         expect.objectContaining(diffForOneOfItem1),
//         expect.objectContaining(diffForObjectFruit),
//         expect.objectContaining(diffForObjectCar),
//         expect.objectContaining(diffForObjectAnimal),
//         expect.objectContaining(diffForUnionObjective),
//       ]))

//       const expectedMerged = {
//         queries: {
//           test: {
//             output: {
//               ...expectedEntityUnionObjective,
//               nullable: false,
//               [DIFF_META_KEY]: {
//                 title: diffForFieldTitle,
//                 nullable: diffForFieldNullable,
//               }
//             }
//           }
//         }
//       }
//       Object.defineProperty(
//         expectedMerged.queries.test.output.oneOf,
//         DIFF_META_KEY,
//         {
//           value: {
//             1: diffForOneOfItem1,
//           }
//         }
//       )

//       if (!isGraphApiSchema(merged)) {
//         fail('Merged doc after comparing 2 GraphAPI must be a GraphAPI.')
//       }

//       const actualOutput = merged.queries!.test.output as GraphApiUnion
//       expect(actualOutput.title).toBe(expectedEntityUnionObjective.title)
//       expect(actualOutput.oneOf.length).toBe(2)
//       if (!isObject(actualOutput)) { fail() }
//       expect(actualOutput[DIFF_META_KEY])
//         .toMatchObject({
//           title: diffForFieldTitle,
//           nullable: diffForFieldNullable
//         })
//       expect((actualOutput.oneOf[0] as GraphApiObject).title).toBe(expectedEntityObjectCar.title)
//       expect((actualOutput.oneOf[0] as GraphApiObject).type.properties).toMatchObject({
//         ...expectedEntityObjectFruit.type.properties,
//         ...expectedEntityObjectCar.type.properties,
//       })
//       const oneOfItem1Props = (actualOutput.oneOf[0] as GraphApiObject).type.properties
//       if (!isObject(oneOfItem1Props)) { fail() }
//       expect((oneOfItem1Props as Record<PropertyKey, unknown>)[DIFF_META_KEY]).toMatchObject({
//         shape: diffForOneOfItem0PropertyShape,
//         flavour: diffForOneOfItem0PropertyFlavour,
//         velocity: diffForOneOfItem0PropertyVelocity,
//       })
//       expect((actualOutput.oneOf[1] as GraphApiObject).title).toBe(expectedEntityObjectAnimal.title)
//       expect((actualOutput.oneOf[1] as GraphApiObject).type.properties).toMatchObject(expectedEntityObjectAnimal.type.properties)
//       if (!isObject(actualOutput.oneOf)) { fail() }
//       expect(actualOutput.oneOf[DIFF_META_KEY]).toMatchObject({ 1: diffForOneOfItem1 })
//     })

//     // TODO 12.11.24 // Look at this test to reduce copy-paste everywhere!
//     // TODO 12.11.24 // Complete the test
//     it.skip('enum -> primitive union', () => {
//       const declarations = `
//         enum FruitKind {
//           Orange
//           Apple
//           Banana
//         }
//         scalar Orange
//         scalar Apple
//         scalar Banana
//         union Fruit = Orange | Apple | Banana
//       `
//       const before = buildGraphApi(`
//         type Query {
//           fruit: FruitKind!
//         }
//         ${declarations}
//       `)
//       const after = buildGraphApi(`
//         type Query {
//           fruit: Fruit!
//         }
//         ${declarations}
//       `)

//       const { diffs, merged } = apiDiff(before, after, COMPARE_OPTIONS)

//       const expectedEnumFruitKind = Expectations.ENUM_SIMPLE_VALUES_FRUIT_KIND
//       const expectedScalarOrange = { ...Expectations.scalar('Orange') , nullable: false }
//       const expectedScalarApple = { ...Expectations.scalar('Apple'), nullable: false }
//       const expectedScalarBanana = { ...Expectations.scalar('Banana'), nullable: false }
//       const expectedUnionFruit = Expectations.union('Fruit', [expectedScalarOrange, expectedScalarApple, expectedScalarBanana])

//       const diffForFieldTitle = {
//         type: annotation,
//         action: DiffAction.add,
//         afterValue: "Fruit",
//         afterDeclarationPaths: [
//           ["components", "unions", "Fruit", "title"],
//         ],
//       }
//       const diffForFieldNullable = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: false,
//         afterDeclarationPaths: [
//           ["queries", "fruit", "output", "nullable"],
//         ],
//       }
//       const diffForFieldTitleInOneOfItem0 = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: "FruitKind",
//         beforeDeclarationPaths: [
//           ["components", "enums", "FruitKind", "title"],
//         ],
//         afterValue: "Orange",
//         afterDeclarationPaths: [
//           ["components", "scalars", "Orange", "title"],
//         ],
//       }
//       const diffForFieldTypeInOneOfItem0 = {
//         type: breaking,
//         action: DiffAction.replace,
//         beforeValue: expectedEnumFruitKind.type,
//         beforeDeclarationPaths: [
//           ["components", "enums", "FruitKind", "type"],
//         ],
//         afterValue: { kind: "scalar" },
//         afterDeclarationPaths: [
//           ["components", "scalars", "Orange", "type"],
//         ],
//       }
//       const diffAddOneOfItem1 = (index: number, value: unknown) => ({
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: value,
//         afterDeclarationPaths: [
//           ["components", "unions", "Fruit", "oneOf", index],
//         ],
//       })

//       expectDiffs(diffs, [
//         diffForFieldTitle,
//         diffForFieldNullable,
//         diffForFieldTitleInOneOfItem0,
//         diffForFieldTypeInOneOfItem0,
//         diffAddOneOfItem1(1, expectedScalarApple),
//         diffAddOneOfItem1(2, expectedScalarBanana),
//       ])

//       if (!isGraphApiSchema(merged)) { fail() }

//       const expectedMerged = {
//         fruit: {
//           output: {
//             title: 'Fruit',
//             nullable: false,
//             oneOf: [
//               {
//                 title: expectedScalarOrange.title,
//                 type: {
//                   ...expectedEnumFruitKind.type,
//                   ...expectedScalarOrange.type,
//                 },
//                 nullable: expectedScalarOrange.nullable,
//                 [DIFF_META_KEY]: {
//                   title: expect.objectContaining(diffForFieldTitleInOneOfItem0),
//                   type: expect.objectContaining(diffForFieldTypeInOneOfItem0),
//                 }
//               },
//               expectedUnionFruit.oneOf[1],
//               expectedUnionFruit.oneOf[2],
//             ],
//             [DIFF_META_KEY]: {
//               title: expect.objectContaining(diffForFieldTitle),
//               nullable: expect.objectContaining(diffForFieldNullable),
//             }
//           }
//         }
//       }

//       Object.defineProperty(expectedMerged.fruit.output.oneOf, DIFF_META_KEY, {
//         value: {
//           1: expect.objectContaining(
//             diffAddOneOfItem1(1, expectedScalarApple)
//           ),
//           2: expect.objectContaining(
//             diffAddOneOfItem1(2, expectedScalarBanana)
//           ),
//         }
//       })

//       expect(merged.queries).toEqual(expectedMerged)
//     })

//     it('enum -> objective union', () => { })

//     it('enum -> enum union', () => { })

//     it('union -> extended union', () => {
//       const before = graphapi`
//         type Query {
//           "Get shape"
//           shape: Shape
//         }
//         "One of 3 kinds of shape"
//         union Shape = Circle | Triangle | Rectangle
//         "Shape without any sides"
//         scalar Circle
//         "Shape with 3 sides"
//         scalar Triangle
//         "Shape with 4 sides and angles = 90 deg"
//         scalar Rectangle
//       `
//       const after = graphapi`
//         type Query {
//           "Get shape"
//           shape: Shape
//         }
//         "One of 3 kinds of shape"
//         union Shape = Circle | Triangle | Parallelogram | Rectangle
//         "Shape without any sides"
//         scalar Circle
//         "Shape with 3 sides"
//         scalar Triangle
//         "Shape with 4 sides"
//         scalar Parallelogram
//         "Parallelogram with angles = 90 deg"
//         scalar Rectangle
//       `
//       const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)
//       const expectedScalarParallelogram = {
//         title: 'Parallelogram',
//         type: { kind: 'scalar' },
//         description: 'Shape with 4 sides'
//       }
//       const diffForFieldType = {
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: 'Shape with 4 sides and angles = 90 deg',
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'Rectangle', 'description'],
//         ],
//         afterValue: 'Parallelogram with angles = 90 deg',
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Rectangle', 'description'],
//         ],
//       }
//       const diffForScalarParallelogram = {
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: expectedScalarParallelogram,
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'Parallelogram']
//         ]
//       }
//       const diffForOneOfItem2 = {
//         type: nonBreaking,
//         action: DiffAction.add,
//         afterValue: {
//           ...expectedScalarParallelogram,
//           nullable: false,
//         },
//         afterDeclarationPaths: [
//           ['components', 'unions', 'Shape', 'oneOf', 2]
//         ]
//       }
//       expect(diffs).toEqual(diffsMatcher([
//         expect.objectContaining(diffForFieldType),
//         expect.objectContaining(diffForScalarParallelogram),
//         expect.objectContaining(diffForOneOfItem2)
//       ]))
//     })
//   })
// })

// describe('Directives test', () => {
//   it('deprecated directive test', () => {
//     const before = graphapi`
//       enum ColorEnum {
//         BLUE
//         "Red color"
//         RED @deprecated
//         "Green color"
//         GREEN @deprecated(reason: "not used")
//       }
//     `
//     const after = graphapi`
//       enum ColorEnum {
//         BLUE @deprecated
//         "Red color"
//         RED
//         "Green color"
//         GREEN @deprecated(reason: "not used anymore")
//       }
//     `
//     const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//     const expectedDirectiveDefinitionDeprecated = {
//       title: 'deprecated',
//       description: 'Marks an element of a GraphQL schema as no longer supported.',
//       locations: ['FIELD_DEFINITION', 'ARGUMENT_DEFINITION', 'INPUT_FIELD_DEFINITION', 'ENUM_VALUE'],
//       repeatable: false,
//       args: {
//         type: {
//           kind: 'object',
//           properties: {
//             reason: {
//               description: 'Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted using the Markdown syntax, as specified by [CommonMark](https://commonmark.org/).',
//               output: {
//                 type: { kind: 'string' },
//                 nullable: false,
//                 default: 'No longer supported',
//               }
//             }
//           }
//         }
//       },
//     }

//     expect(diffs).toEqual(diffsMatcher([
//       expect.objectContaining({
//         type: deprecated,
//         action: DiffAction.add,
//         afterValue: {
//           definition: expectedDirectiveDefinitionDeprecated,
//           meta: { reason: 'No longer supported' },
//         },
//         afterDeclarationPaths: [
//           ['components', 'enums', 'ColorEnum', 'type', 'values', 'BLUE', 'directives', 'deprecated']
//         ],
//       }),
//       expect.objectContaining({
//         type: deprecated,
//         action: DiffAction.remove,
//         beforeValue: {
//           definition: expectedDirectiveDefinitionDeprecated,
//           meta: { reason: 'No longer supported' }
//         },
//         beforeDeclarationPaths: [
//           ['components', 'enums', 'ColorEnum', 'type', 'values', 'RED', 'directives', 'deprecated']
//         ],
//       }),
//       expect.objectContaining({
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: 'not used',
//         afterValue: 'not used anymore',
//         beforeDeclarationPaths: [
//           ['components', 'enums', 'ColorEnum', 'type', 'values', 'GREEN', 'directives', 'deprecated', 'meta', 'reason']
//         ],
//         afterDeclarationPaths: [
//           ['components', 'enums', 'ColorEnum', 'type', 'values', 'GREEN', 'directives', 'deprecated', 'meta', 'reason']
//         ]
//       }),
//     ]))
//   })

//   it('specifiedBy directive test', () => {
//     const before = graphapi`
//         scalar UUID
//         scalar UUID2 @specifiedBy(url: "https://example.com")
//         scalar UUID3 @specifiedBy(url: "https://example.com/3")
//     `
//     const after = graphapi`
//         scalar UUID @specifiedBy(url: "https://example.com")
//         scalar UUID2 @specifiedBy(url: "https://example.com/2")
//         scalar UUID3
//     `
//     const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

//     const specifiedByDirectiveDefinition = {
//       title: 'specifiedBy',
//       description: 'Exposes a URL that specifies the behavior of this scalar.',
//       locations: ['SCALAR'],
//       args: {
//         type: {
//           kind: 'object',
//           properties: {
//             url: {
//               description: 'The URL that specifies the behavior of this scalar.',
//               output: {
//                 type: { kind: 'string' },
//                 nullable: false,
//               }
//             }
//           }
//         }
//       },
//       repeatable: false
//     }

//     expect(diffs).toEqual(diffsMatcher([
//       expect.objectContaining({
//         type: annotation,
//         action: DiffAction.replace,
//         beforeValue: 'https://example.com',
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'UUID2', 'directives', 'specifiedBy', 'meta', 'url']
//         ],
//         afterValue: 'https://example.com/2',
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'UUID2', 'directives', 'specifiedBy', 'meta', 'url']
//         ],
//       }),
//       expect.objectContaining({
//         type: unclassified,
//         action: DiffAction.add,
//         afterValue: {
//           definition: specifiedByDirectiveDefinition,
//           meta: { url: 'https://example.com' }
//         },
//         afterDeclarationPaths: [
//           ['components', 'scalars', 'UUID', 'directives', 'specifiedBy']
//         ],
//       }),
//       expect.objectContaining({
//         type: unclassified,
//         action: DiffAction.remove,
//         beforeValue: {
//           definition: specifiedByDirectiveDefinition,
//           meta: { url: 'https://example.com/3' }
//         },
//         beforeDeclarationPaths: [
//           ['components', 'scalars', 'UUID3', 'directives', 'specifiedBy']
//         ],
//       }),
//     ]))
//   })
// })
