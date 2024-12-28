import { printGraphApi } from "../src/print-graph-api";
import { buildGraphApi } from "./helpers/build-graphApi";

const operationKinds = ['queries', 'mutations', 'subscriptions', 'methods'] as const;
const operationsMap: Record<typeof operationKinds[number], string> = {
  queries: 'Query',
  mutations: 'Mutation',
  subscriptions: 'Subscription',
  methods: 'MyType',
};

const ORIGINAL_MULTILINE_DESCRIPTION = (
  '    """\n' +
  '       - First arg\n' +
  '         - Multi-line\n' +
  '               - Description\n' +
  '       #!@#$%^&*   ()_+12345         67890~`\n' +
  '    """\n'
)
const PRINTED_MULTILINE_DESCRIPTION = (
  '    """\n' +
  '    - First arg\n' +
  '      - Multi-line\n' +
  '            - Description\n' +
  '    #!@#$%^&*   ()_+12345         67890~`\n' +
  '    """\n'
)

describe('GraphAPI to GraphQL. Usages', () => {
  describe('directives', () => {
    it('on schema', () => {
      const expectedGraphQl = (
        '"Schema Description"\n' +
        'schema @foo {\n' +
        '  query: Query\n' +
        '}\n' +
        'directive @foo(arg: String = "default") repeatable on SCHEMA\n' +
        'type Query {\n' +
        '  todo: String\n' +
        '}'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on field definition', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on FIELD_DEFINITION\n' +
        'type MyType {\n' +
        '  withoutValue: ID! @foo\n' +
        '  withNull: ID! @foo(arg: null)\n' +
        '  withValue: ID! @foo(arg: "Test")\n' +
        '}'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on argument definition', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on ARGUMENT_DEFINITION\n' +
        'type Query {\n' +
        '  todo(search: String! @foo): ID!\n' +
        '}'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on enum value', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on ENUM_VALUE\n' +
        'enum MyEnum {\n' +
        '  First @foo\n' +
        '  Second @foo(arg: null)\n' +
        '  Third @foo(arg: "Test")\n' +
        '}'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on scalar', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on SCALAR\n' +
        'scalar MyScalar @foo'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on enum', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on ENUM\n' +
        'enum MyEnum @foo {\n' +
        '  First\n' +
        '  Second\n' +
        '}'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on union', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on UNION\n' +
        'union MyUnion @foo(arg: "value") = String | Int'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on object', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on OBJECT\n' +
        'type MyType @foo {\n' +
        '  first: ID!\n' +
        '  second: String\n' +
        '}'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on input object', () => {
      const expectedGraphQl = (
        'directive @foo(arg: String = "default") repeatable on INPUT_OBJECT\n' +
        'input MyInput @foo {\n' +
        '  first: ID!\n' +
        '  second: String\n' +
        '}'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })
  })

  describe('arguments', () => {
    operationKinds.forEach(kind => {
      it(`on ${kind} (1, simple)`, () => {
        const expectedGraphQl = (
          `type ${operationsMap[kind]} {\n` +
          '  todo(one: ID!): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(expectedGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        expect(actualGraphQl).toBe(expectedGraphQl)
      })

      it(`on ${kind} (1, with simple description and directive)`, () => {
        const expectedGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          '    "First arg"\n' +
          '    one: ID! @foo\n' +
          '  ): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(expectedGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        expect(actualGraphQl).toBe(expectedGraphQl)
      })

      it(`on ${kind} (1, with multiline description and directive)`, () => {
        const originalGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          ORIGINAL_MULTILINE_DESCRIPTION +
          '    one: ID! @foo\n' +
          '  ): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(originalGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        const expectedGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          PRINTED_MULTILINE_DESCRIPTION +
          '    one: ID! @foo\n' +
          '  ): String!\n' +
          '}'
        )
        expect(actualGraphQl).toBe(expectedGraphQl)
      })

      it(`on ${kind} (1, with simple description and 2 directives)`, () => {
        const expectedGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          'directive @bar on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          '    "First arg"\n' +
          '    one: ID! @foo @bar\n' +
          '  ): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(expectedGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        expect(actualGraphQl).toBe(expectedGraphQl)
      })

      it(`on ${kind} (1, with multiline description and 2 directives)`, () => {
        const originalGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          'directive @bar on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          ORIGINAL_MULTILINE_DESCRIPTION +
          '    one: ID! @foo @bar\n' +
          '  ): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(originalGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        const expectedGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          'directive @bar on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          PRINTED_MULTILINE_DESCRIPTION +
          '    one: ID! @foo @bar\n' +
          '  ): String!\n' +
          '}'
        )
        expect(actualGraphQl).toBe(expectedGraphQl)
      })

      it(`on ${kind} (2, simple)`, () => {
        const expectedGraphQl = (
          `type ${operationsMap[kind]} {\n` +
          '  todo(one: ID!, second: Int): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(expectedGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        expect(actualGraphQl).toBe(expectedGraphQl)
      })

      it(`on ${kind} (2, one with simple description, another with multiline)`, () => {
        const originalGraphQl = (
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          '    """\n' +
          '       - First arg\n' +
          '         - Multi-line\n' +
          '               - Description\n' +
          '       #!@#$%^&*   ()_+12345         67890~`\n' +
          '    """\n' +
          '    one: ID!\n' +
          '    \n' +
          '    "Second Description"\n' +
          '    second: Int\n' +
          '  ): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(originalGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        const expectedGraphQl = (
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          '    """\n' +
          '    - First arg\n' +
          '      - Multi-line\n' +
          '            - Description\n' +
          '    #!@#$%^&*   ()_+12345         67890~`\n' +
          '    """\n' +
          '    one: ID!\n' +
          '\n' +
          '    "Second Description"\n' +
          '    second: Int\n' +
          '  ): String!\n' +
          '}'
        )
        expect(actualGraphQl).toBe(expectedGraphQl)
      })

      it(`on ${kind} (2, one with simple description and with directive, another with multiline and no directive)`, () => {
        const originalGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          ORIGINAL_MULTILINE_DESCRIPTION +
          '    one: ID! @foo\n' +
          '    \n' +
          '    "Second Description"\n' +
          '    second: Int\n' +
          '  ): String!\n' +
          '}'
        )
        const graphApi = buildGraphApi(originalGraphQl)
        const actualGraphQl = printGraphApi(graphApi)
        const expectedGraphQl = (
          'directive @foo on ARGUMENT_DEFINITION\n' +
          `type ${operationsMap[kind]} {\n` +
          '  todo(\n' +
          PRINTED_MULTILINE_DESCRIPTION +
          '    one: ID! @foo\n' +
          '\n' +
          '    "Second Description"\n' +
          '    second: Int\n' +
          '  ): String!\n' +
          '}'
        )
        expect(actualGraphQl).toBe(expectedGraphQl)
      })
    })

    it('on directives (1, simple)', () => {
      const expectedGraphQl = 'directive @foo(one: ID!) on FIELD_DEFINITION | ENUM_VALUE'
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on directives (1, with simple description)', () => {
      const expectedGraphQl = (
        'directive @foo(\n' +
        '  "First Description"\n' +
        '  one: ID!\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on directives (1, with multiline description)', () => {
      const originalMultilineDescription = (
        '  """\n' +
        '    - First arg\n' +
        '         - Multi-line\n' +
        '               - Description\n' +
        '       #!@#$%^&*   ()_+12345         67890~`\n' +
        '  """\n'
      )
      const printedMultilineDescription = (
        '  """\n' +
        '  - First arg\n' +
        '       - Multi-line\n' +
        '             - Description\n' +
        '     #!@#$%^&*   ()_+12345         67890~`\n' +
        '  """\n'
      )
      const originalGraphQl = (
        'directive @foo(\n' +
        originalMultilineDescription +
        '  one: ID!\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      const graphApi = buildGraphApi(originalGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      const expectedGraphQl = (
        'directive @foo(\n' +
        printedMultilineDescription +
        '  one: ID!\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on directives (2, simple)', () => {
      const expectedGraphQl = 'directive @foo(one: ID!, second: Int) on FIELD_DEFINITION | ENUM_VALUE'
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on directives (2, one with simple description, another without)', () => {
      const expectedGraphQl = (
        'directive @foo(\n' +
        '  "First Description"\n' +
        '  one: ID!\n' +
        '  second: Int\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on directives (2, one without simple description, another with)', () => {
      const expectedGraphQl = (
        'directive @foo(\n' +
        '  one: ID!\n' +
        '\n' +
        '  "Second Description"\n' +
        '  second: Int\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on directives (2, both with simple description)', () => {
      const expectedGraphQl = (
        'directive @foo(\n' +
        '  "First Description"\n' +
        '  one: ID!\n' +
        '\n' +
        '  "Second Description"\n' +
        '  second: Int\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      const graphApi = buildGraphApi(expectedGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      expect(actualGraphQl).toBe(expectedGraphQl)
    })

    it('on directives (2, one with simple descr, another with multiline)', () => {
      const originalGraphQl = (
        'directive @foo(\n' +
        '  "First Description"\n' +
        '  one: ID!\n' +
        '\n' +
        '  """\n' +
        '    - First\n' +
        '       - Second\n' +
        '             - Third\n' +
        '     ~`!@#$%^&*()_+1234567890\n' +
        '  """\n' +
        '  second: Int\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      const graphApi = buildGraphApi(originalGraphQl)
      const actualGraphQl = printGraphApi(graphApi)
      const expectedGraphQl = (
        'directive @foo(\n' +
        '  "First Description"\n' +
        '  one: ID!\n' +
        '\n' +
        '  """\n' +
        '  - First\n' +
        '     - Second\n' +
        '           - Third\n' +
        '   ~`!@#$%^&*()_+1234567890\n' +
        '  """\n' +
        '  second: Int\n' +
        ') on FIELD_DEFINITION | ENUM_VALUE'
      )
      expect(actualGraphQl).toBe(expectedGraphQl)
    })
  })
})
