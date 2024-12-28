import { GraphApiSchema, printGraphApi } from '../src'
import { buildGraphApi } from './helpers/build-graphApi'

describe('GraphAPI to GraphQL. Definitions', () => {
  it('directive', () => {
    const expectedGraphQl = 'directive @foo(arg: String = "Default") repeatable on FIELD_DEFINITION | ENUM_VALUE'
    const graphApi = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('scalar', () => {
    const expectedGraphQl = 'scalar MyScalar'
    const graphApi: GraphApiSchema = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('enum', () => {
    const expectedGraphQl = (
      'enum Fruit {\n' +
      '  Orange\n' +
      '  Banana\n' +
      '  Apple\n' +
      '}'
    )
    const graphApi: GraphApiSchema = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('simple object', () => {
    const expectedGraphQl = (
      'type Fruit {\n' +
      '  id: ID\n' +
      '  flavour: String\n' +
      '  discoveredAtYear: Int\n' +
      '  avgWeight: Float\n' +
      '  isExotic: Boolean\n' +
      '}'
    )
    const graphApi: GraphApiSchema = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('simple object (not nullable props)', () => {
    const expectedGraphQl = (
      'type Fruit {\n' +
      '  id: ID!\n' +
      '  flavour: String!\n' +
      '  discoveredAtYear: Int!\n' +
      '  avgWeight: Float!\n' +
      '  isExotic: Boolean!\n' +
      '}'
    )
    const graphApi: GraphApiSchema = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('simple input object', () => {
    const expectedGraphQl = (
      'input Fruit {\n' +
      '  id: ID\n' +
      '  flavour: String\n' +
      '  discoveredAtYear: Int\n' +
      '  avgWeight: Float\n' +
      '  isExotic: Boolean\n' +
      '}'
    )
    const graphApi: GraphApiSchema = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('simple input object (not nullable props)', () => {
    const expectedGraphQl = (
      'input Fruit {\n' +
      '  id: ID!\n' +
      '  flavour: String!\n' +
      '  discoveredAtYear: Int!\n' +
      '  avgWeight: Float!\n' +
      '  isExotic: Boolean!\n' +
      '}'
    )
    const graphApi: GraphApiSchema = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('simple union', () => {
    const expectedGraphQl = 'union Primitive = ID | String | Int | Float | Boolean'
    const graphApi = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('union with custom scalars', () => {
    const expectedGraphQl = (
      'scalar First\n' +
      'scalar Second\n' +
      'union Primitive = First | Second'
    )
    const graphApi = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('complex object', () => {
    const expectedScalar = 'scalar MyScalar'
    const expectedEnum = (
      '\nenum MyEnum {\n' +
      '  First\n' +
      '  Second\n' +
      '}'
    )
    const expectedObject = (
      '\ntype MyObject {\n' +
      '  first: String\n' +
      '  second: Int\n' +
      '}'
    )
    const expectedUnion = '\nunion MyUnion = String | MyScalar | MyEnum | MyObject'
    const expectedRoot = (
      '\ntype Root {\n' +
      '  array1: [String]!\n' +
      '  array2: [MyScalar!]\n' +
      '  array3: [MyEnum!]!\n' +
      '  array4: [MyObject]\n' +
      '  union1: MyUnion\n' +
      '  union2: MyUnion!\n' +
      '}'
    )
    const expected = (
      expectedScalar +
      expectedObject +
      expectedRoot +
      expectedUnion +
      expectedEnum
    )
    const graphApi = buildGraphApi(expected)
    const actual = printGraphApi(graphApi)
    expect(actual).toBe(expected)
  })

  it('interface', () => {
    const expectedGraphQl = (
      'interface IMyType {\n' +
      '  first: Float!\n' +
      '  second: Boolean\n' +
      '}'
    )
    const graphApi = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('extending interface', () => {
    const expectedGraphQl = (
      'interface IParent {\n' +
      '  first: Float!\n' +
      '  second: Boolean\n' +
      '}\n' +
      'interface IChild implements IParent {\n' +
      '  first: Float!\n' +
      '  second: Boolean\n' +
      '\n' +
      '  "Added new field"\n' +
      '  third: Int\n' +
      '}'
    )
    const graphApi = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })

  it('multi-extending interface', () => {
    const expectedGraphQl = (
      'interface IParentA {\n' +
      '  first: Float!\n' +
      '  second: Boolean\n' +
      '}\n' +
      'interface IParentB {\n' +
      '  third: Int\n' +
      '}\n' +
      'interface IChild implements IParentA & IParentB {\n' +
      '  first: Float!\n' +
      '  second: Boolean\n' +
      '  third: Int\n' +
      '\n' +
      '  "Added new field"\n' +
      '  fourth: String!\n' +
      '}'
    )
    const graphApi = buildGraphApi(expectedGraphQl)
    const actualGraphQl = printGraphApi(graphApi)
    expect(actualGraphQl).toBe(expectedGraphQl)
  })
})
