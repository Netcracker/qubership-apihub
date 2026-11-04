import {
  API_TYPE_ASYNCAPI,
  API_TYPE_GRAPHQL,
  API_TYPE_REST,
  API_TYPE_TITLE_MAP,
  type ApiType,
} from '../../entities/api-types'
import type { ChangesSummary } from '../../entities/change-severities'
import { CONTRACT_TYPE_DDL, CONTRACT_TYPE_MCP, CONTRACT_TYPE_TITLE_MAP } from '../../entities/contract-types'
import type { OperationTypeSummary, VersionContractsSummary } from '../../entities/version-contents'
import {
  getPackageVersionApiTypeDocumentListTooltip,
  getPackageVersionApiTypeNoOperationsTooltip,
  getPackageVersionApiTypeSomeOperationsTooltip,
  getPackageVersionContractTypeNoEntitiesTooltip,
  getPackageVersionContractTypeSomeEntitiesTooltip,
  PUBLICATION_ERROR_MESSAGES,
} from '../../utils/publicationErrorMessages'
import {
  GRAPHQL_SPEC_TYPE,
  MARKDOWN_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
  type SpecType,
  UNKNOWN_SPEC_TYPE,
} from '../../utils/specs'
import {
  isApiTypeFullyInvalid,
  resolveApiTypeEmptyMessage,
  resolveApiTypeProblemDetails,
  resolveOverviewSummaryApiTypeProblemsMap,
  resolveVersionApiTypeProblemsMap,
} from './apiTypeProblemDetails'

const EMPTY_CHANGES_SUMMARY: ChangesSummary = {
  breaking: 0,
  risky: 0,
  deprecated: 0,
  'non-breaking': 0,
  unclassified: 0,
  annotation: 0,
}

const VERSION_KEY = '2024.1'

const REST_TITLE = API_TYPE_TITLE_MAP[API_TYPE_REST]
const GRAPHQL_TITLE = API_TYPE_TITLE_MAP[API_TYPE_GRAPHQL]
const ASYNCAPI_TITLE = API_TYPE_TITLE_MAP[API_TYPE_ASYNCAPI]
const DDL_TITLE = CONTRACT_TYPE_TITLE_MAP[CONTRACT_TYPE_DDL]
const MCP_TITLE = CONTRACT_TYPE_TITLE_MAP[CONTRACT_TYPE_MCP]

describe('isApiTypeFullyInvalid', () => {
  test.each([
    {
      name: 'API type with errors and zero operations',
      apiType: API_TYPE_REST,
      operationType: operationType(API_TYPE_REST, { operationsCount: 0 }),
      expected: true,
    },
    {
      name: 'API type with errors and operations present',
      apiType: API_TYPE_REST,
      operationType: operationType(API_TYPE_REST),
      expected: false,
    },
    {
      name: 'API type without errors',
      apiType: API_TYPE_REST,
      operationType: operationType(API_TYPE_REST, { hasErrors: false, operationsCount: 0 }),
      expected: false,
    },
    {
      name: 'DDL with errors and zero tables',
      apiType: CONTRACT_TYPE_DDL,
      contractsSummary: ddlSummary(0),
      expected: true,
    },
    {
      name: 'DDL with errors and tables present',
      apiType: CONTRACT_TYPE_DDL,
      contractsSummary: ddlSummary(3),
      expected: false,
    },
    {
      name: 'MCP with errors and zero entities',
      apiType: CONTRACT_TYPE_MCP,
      contractsSummary: mcpSummary(0, 0, 0),
      expected: true,
    },
    {
      name: 'MCP with errors and entities present',
      apiType: CONTRACT_TYPE_MCP,
      contractsSummary: mcpSummary(2, 0, 1),
      expected: false,
    },
  ])('$name', ({ apiType, operationType, contractsSummary, expected }) => {
    expect(isApiTypeFullyInvalid(apiType, operationType, contractsSummary)).toBe(expected)
  })
})

describe('resolveApiTypeEmptyMessage', () => {
  test('maps fully invalid API and contract types to empty state messages', () => {
    expect(resolveApiTypeEmptyMessage(
      API_TYPE_REST,
      operationType(API_TYPE_REST, { operationsCount: 0 }),
    )).toBe(PUBLICATION_ERROR_MESSAGES.emptyState.noValidOperationsInApiType)

    expect(resolveApiTypeEmptyMessage(
      CONTRACT_TYPE_DDL,
      undefined,
      ddlSummary(0),
    )).toBe(PUBLICATION_ERROR_MESSAGES.emptyState.noValidEntitiesInContractType)
  })

  test('returns undefined when the type is not fully invalid', () => {
    expect(resolveApiTypeEmptyMessage(
      API_TYPE_REST,
      operationType(API_TYPE_REST),
    )).toBeUndefined()
  })
})

describe('resolveApiTypeProblemDetails', () => {
  test('returns no problems when hasErrors is absent', () => {
    expect(resolveApiTypeProblemDetails({
      apiType: API_TYPE_GRAPHQL,
      operationType: operationType(API_TYPE_GRAPHQL, { hasErrors: false }),
      versionKey: VERSION_KEY,
    })).toEqual({ hasProblems: false })
  })

  test('returns document list tooltip when invalidDocumentNames is populated', () => {
    expect(resolveApiTypeProblemDetails({
      apiType: API_TYPE_REST,
      operationType: operationType(API_TYPE_REST),
      invalidDocumentNames: ['petstore.json', 'customer-api.yaml'],
      versionKey: VERSION_KEY,
    })).toEqual({
      hasProblems: true,
      tooltip: getPackageVersionApiTypeDocumentListTooltip(['petstore.json', 'customer-api.yaml']),
    })
  })

  test.each([
    {
      name: 'API type with no operations',
      apiType: API_TYPE_REST,
      operationType: operationType(API_TYPE_REST, { operationsCount: 0 }),
      tooltip: getPackageVersionApiTypeNoOperationsTooltip(REST_TITLE, VERSION_KEY),
    },
    {
      name: 'API type with partial operations',
      apiType: API_TYPE_REST,
      operationType: operationType(API_TYPE_REST),
      tooltip: getPackageVersionApiTypeSomeOperationsTooltip(REST_TITLE, VERSION_KEY),
    },
    {
      name: 'DDL with no entities',
      apiType: CONTRACT_TYPE_DDL,
      contractsSummary: ddlSummary(0),
      tooltip: getPackageVersionContractTypeNoEntitiesTooltip(DDL_TITLE, VERSION_KEY),
    },
    {
      name: 'DDL with partial entities',
      apiType: CONTRACT_TYPE_DDL,
      contractsSummary: ddlSummary(3),
      tooltip: getPackageVersionContractTypeSomeEntitiesTooltip(DDL_TITLE, VERSION_KEY),
    },
    {
      name: 'MCP with no entities',
      apiType: CONTRACT_TYPE_MCP,
      contractsSummary: mcpSummary(0, 0, 0),
      tooltip: getPackageVersionContractTypeNoEntitiesTooltip(MCP_TITLE, VERSION_KEY),
    },
    {
      name: 'MCP with partial entities',
      apiType: CONTRACT_TYPE_MCP,
      contractsSummary: mcpSummary(2, 0, 1),
      tooltip: getPackageVersionContractTypeSomeEntitiesTooltip(MCP_TITLE, VERSION_KEY),
    },
  ])('$name', ({ apiType, operationType, contractsSummary, tooltip }) => {
    expect(resolveApiTypeProblemDetails({
      apiType: apiType,
      operationType: operationType,
      contractsSummary: contractsSummary,
      versionKey: VERSION_KEY,
    })).toEqual({
      hasProblems: true,
      tooltip: tooltip,
    })
  })

  test('falls back to count-based tooltip when invalidDocumentNames is empty', () => {
    expect(resolveApiTypeProblemDetails({
      apiType: API_TYPE_REST,
      operationType: operationType(API_TYPE_REST, { operationsCount: 0 }),
      invalidDocumentNames: [],
      versionKey: VERSION_KEY,
    })).toEqual({
      hasProblems: true,
      tooltip: getPackageVersionApiTypeNoOperationsTooltip(REST_TITLE, VERSION_KEY),
    })
  })
})

describe('resolveVersionApiTypeProblemsMap', () => {
  test('keeps only types with problems', () => {
    expect(resolveVersionApiTypeProblemsMap({
      allowedApiTypes: [API_TYPE_REST, API_TYPE_GRAPHQL, API_TYPE_ASYNCAPI, CONTRACT_TYPE_DDL],
      operationTypes: {
        [API_TYPE_REST]: operationType(API_TYPE_REST),
        [API_TYPE_GRAPHQL]: operationType(API_TYPE_GRAPHQL, { hasErrors: false }),
        [API_TYPE_ASYNCAPI]: operationType(API_TYPE_ASYNCAPI, { operationsCount: 0 }),
      },
      contractsSummary: ddlSummary(3),
      versionKey: VERSION_KEY,
    })).toEqual({
      [API_TYPE_REST]: {
        hasProblems: true,
        tooltip: getPackageVersionApiTypeSomeOperationsTooltip(REST_TITLE, VERSION_KEY),
      },
      [API_TYPE_ASYNCAPI]: {
        hasProblems: true,
        tooltip: getPackageVersionApiTypeNoOperationsTooltip(ASYNCAPI_TITLE, VERSION_KEY),
      },
      [CONTRACT_TYPE_DDL]: {
        hasProblems: true,
        tooltip: getPackageVersionContractTypeSomeEntitiesTooltip(DDL_TITLE, VERSION_KEY),
      },
    })
  })
})

describe('resolveOverviewSummaryApiTypeProblemsMap', () => {
  test('returns empty map when no section errors exist', () => {
    expect(resolveOverviewSummaryApiTypeProblemsMap({
      operationTypes: {
        [API_TYPE_REST]: operationType(API_TYPE_REST, { hasErrors: false }),
      },
      contractsSummary: {
        ddl: {
          tablesCount: 1,
          hasErrors: false,
        },
      },
      documents: [invalidDocument({ type: OPENAPI_3_0_SPEC_TYPE, title: 'Broken API' })],
      versionKey: VERSION_KEY,
    })).toEqual({})
  })

  test('groups invalid documents by API and contract type', () => {
    expect(resolveOverviewSummaryApiTypeProblemsMap({
      operationTypes: {
        [API_TYPE_REST]: operationType(API_TYPE_REST),
        [API_TYPE_GRAPHQL]: operationType(API_TYPE_GRAPHQL),
      },
      documents: [
        invalidDocument({ type: OPENAPI_3_0_SPEC_TYPE, title: 'REST Doc' }),
        invalidDocument({ type: OPENAPI_3_0_SPEC_TYPE, filename: 'from-filename.json' }),
        invalidDocument({ type: GRAPHQL_SPEC_TYPE, slug: 'from-slug' }),
        invalidDocument({ type: UNKNOWN_SPEC_TYPE, title: 'Irrelevant Doc' }),
      ],
      versionKey: VERSION_KEY,
    })).toEqual({
      [API_TYPE_REST]: {
        hasProblems: true,
        tooltip: getPackageVersionApiTypeDocumentListTooltip(['REST Doc', 'from-filename.json']),
      },
      [API_TYPE_GRAPHQL]: {
        hasProblems: true,
        tooltip: getPackageVersionApiTypeDocumentListTooltip(['from-slug']),
      },
    })
  })

  test('uses count-based fallback when section has errors but no matching invalid documents', () => {
    expect(resolveOverviewSummaryApiTypeProblemsMap({
      operationTypes: {
        [API_TYPE_REST]: operationType(API_TYPE_REST, { operationsCount: 0 }),
        [API_TYPE_GRAPHQL]: operationType(API_TYPE_GRAPHQL),
      },
      contractsSummary: ddlSummary(0),
      documents: [
        invalidDocument({ type: MARKDOWN_SPEC_TYPE, title: 'Readme' }),
      ],
      versionKey: VERSION_KEY,
    })).toEqual({
      [API_TYPE_REST]: {
        hasProblems: true,
        tooltip: getPackageVersionApiTypeNoOperationsTooltip(REST_TITLE, VERSION_KEY),
      },
      [API_TYPE_GRAPHQL]: {
        hasProblems: true,
        tooltip: getPackageVersionApiTypeSomeOperationsTooltip(GRAPHQL_TITLE, VERSION_KEY),
      },
      [CONTRACT_TYPE_DDL]: {
        hasProblems: true,
        tooltip: getPackageVersionContractTypeNoEntitiesTooltip(DDL_TITLE, VERSION_KEY),
      },
    })
  })
})

function operationType(
  apiType: ApiType,
  overrides: Partial<OperationTypeSummary> = {},
): OperationTypeSummary {
  return {
    apiType: apiType,
    changesSummary: EMPTY_CHANGES_SUMMARY,
    numberOfImpactedOperations: EMPTY_CHANGES_SUMMARY,
    operationsCount: 1,
    deprecatedCount: 0,
    noBwcOperationsCount: 0,
    internalAudienceOperationsCount: 0,
    unknownAudienceOperationsCount: 0,
    apiAudienceTransitions: [],
    hasErrors: true,
    ...overrides,
  }
}

function ddlSummary(tablesCount: number): VersionContractsSummary {
  return {
    ddl: {
      tablesCount: tablesCount,
      hasErrors: true,
    },
  }
}

function mcpSummary(
  toolsCount: number,
  promptsCount: number,
  resourcesCount: number,
): VersionContractsSummary {
  return {
    mcp: {
      byEndpoint: {},
      totals: {
        endpoints: 1,
        toolsCount: toolsCount,
        promptsCount: promptsCount,
        resourcesCount: resourcesCount,
        hasErrors: true,
      },
    },
  }
}

type TestInvalidDocument = Readonly<{
  type: SpecType
  title?: string
  filename?: string
  slug?: string
  hasErrors?: boolean
}>

function invalidDocument(overrides: Partial<TestInvalidDocument> = {}): TestInvalidDocument {
  return {
    type: OPENAPI_3_0_SPEC_TYPE,
    hasErrors: true,
    ...overrides,
  }
}
