import { ROOT_RESOURCES, TestFile } from '@shared/entities'
import path from 'node:path'

const ROOT_PORTAL = path.join(ROOT_RESOURCES, 'portal')
const ROOT_CHANGELOG = path.join(ROOT_PORTAL, 'for-changelog')
const ROOT_DEPRECATED = path.join(ROOT_PORTAL, 'for-deprecated')
const ROOT_GLOBAL_SEARCH = path.join(ROOT_PORTAL, 'for-global-search')
const ROOT_GROUPING = path.join(ROOT_PORTAL, 'for-grouping')

export const FILE_P_PETSTORE20 = new TestFile(path.join(ROOT_PORTAL, 'atui_petstore20.json'), {
  docTitle: 'ATUI Petstore 2.0',
  docVersion: '1.0.0',
  email: 'apiteam@swagger.io',
  license: 'Apache 2.0',
  description: 'http://swagger.io',
  termsOfService: 'Term of service',
  externalDocs: 'Find out more about Swagger',
})

export const FILE_P_PETSTORE20_CHANGELOG_BASE = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore20_changelog_base.json'))

export const FILE_P_PETSTORE20_CHANGELOG_CHANGED = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore20_changelog_changed.json'))

export const FILE_P_PETSTORE30 = new TestFile(path.join(ROOT_PORTAL, 'atui_petstore30.yaml'), {
  docTitle: 'ATUI Petstore 3.0',
  docVersion: '1.0.0',
  jsonString: '"title": "ATUI Petstore 3.0",',
  jsonRefString: '"$ref": "#/components/schemas/Pet"',
  yamlString: 'title: ATUI Petstore 3.0',
  yamlRefString: '$ref: \'#/components/schemas/Pet\'',
  email: 'apiteam@swagger.io',
  license: 'Apache 2.0',
  description: 'https://swagger.io',
  termsOfService: 'Term of service',
  externalDocs: 'Find out more about Swagger',
})

export const FILE_P_PETSTORE30_GS = new TestFile(path.join(ROOT_GLOBAL_SEARCH, 'atui_petstore30.yaml'))

export const FILE_P_PETSTORE30_DEPRECATED_BASE = new TestFile(path.join(ROOT_DEPRECATED, 'atui_petstore30_deprecated_base.yaml'))

export const FILE_P_PETSTORE30_DEPRECATED_NO_DEPRECATED = new TestFile(path.join(ROOT_DEPRECATED, 'atui_petstore30_deprecated_no_deprecated.yaml'))

export const FILE_P_PETSTORE30_DEPRECATED_CHANGED = new TestFile(path.join(ROOT_DEPRECATED, 'atui_petstore30_deprecated_changed.yaml'))

export const FILE_P_PETSTORE30_CHANGELOG_BASE = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore30_changelog_base.yaml'))

export const FILE_P_PETSTORE30_CHANGELOG_CHANGED = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore30_changelog_changed.yaml'))

export const FILE_P_PETSTORE30_CHANGELOG_ANNOTUNCLAS = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore30_changelog_annotunclas.yaml'))

export const FILE_P_PETSTORE30_CHANGELOG_DIFF_OPERATIONS = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore30_changelog_diff_operations.yaml'))

export const FILE_P_PETSTORE30_CHANGED = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore30_changelog_changed.yaml'))

export const FILE_P_PETSTORE30_CHANGELOG_NON_BREAKING = new TestFile(path.join(ROOT_CHANGELOG, 'atui_petstore30_changelog_non_breaking.yaml'))

export const FILE_P_PETSTORE31 = new TestFile(path.join(ROOT_PORTAL, 'atui_petstore31.yaml'), {
  docTitle: 'ATUI Petstore 3.1',
  docVersion: '1.0.0',
  email: 'apiteam@swagger.io',
  license: 'Apache 2.0',
  description: 'https://swagger.io',
  termsOfService: 'Term of service',
  externalDocs: 'Find out more about Swagger',
})

export const FILE_P_PET30_CHANGELOG_BASE = new TestFile(path.join(ROOT_CHANGELOG, 'atui_pet30_base.yaml'))

export const FILE_P_PET30_CHANGELOG_CHANGED = new TestFile(path.join(ROOT_CHANGELOG, 'atui_pet30_changed.yaml'))

export const FILE_P_USER30_CHANGELOG_BASE = new TestFile(path.join(ROOT_CHANGELOG, 'atui_user30_base.yaml'))

export const FILE_P_USER30_CHANGELOG_CHANGED = new TestFile(path.join(ROOT_CHANGELOG, 'atui_user30_changed.yaml'))

export const FILE_P_STORE30_CHANGELOG_BASE = new TestFile(path.join(ROOT_CHANGELOG, 'atui_store30_base.yaml'))

export const FILE_P_GQL_SMALL = new TestFile(path.join(ROOT_PORTAL, 'atui_graphql.graphql'), {
  gqlString: 'petAvailabilityCheck(input: AvailabilityCheckRequest): [AvailabilityCheckResult!]',
})

export const FILE_P_GQL_SMALL_GS = new TestFile(path.join(ROOT_GLOBAL_SEARCH, 'atui_graphql.graphql'), {
  gqlString: 'petAvailabilityCheck(input: AvailabilityCheckRequest): [AvailabilityCheckResult!]',
})

export const FILE_P_GQL_SMALL_CHANGELOG_BASE = new TestFile(path.join(ROOT_CHANGELOG, 'atui_graphql_changelog_base.graphql'))

export const FILE_P_GQL_SMALL_CHANGELOG_CHANGED = new TestFile(path.join(ROOT_CHANGELOG, 'atui_graphql_changelog_changed.graphql'))

export const FILE_P_JSON_SCHEMA_JSON = new TestFile(path.join(ROOT_PORTAL, 'atui_schema_json.json'), {
  jsonString: '"type": "object",',
})

export const FILE_P_JSON_SCHEMA_YAML = new TestFile(path.join(ROOT_PORTAL, 'atui_schema_yaml.yaml'), {
  yamlString: 'type: object',
})

export const FILE_P_MSOFFICE = new TestFile(path.join(ROOT_PORTAL, 'atui_msoffice.docx'))

export const FILE_P_MARKDOWN = new TestFile(path.join(ROOT_PORTAL, 'atui_markdown.md'), {
  mdString: '2nd paragraph. *Italic*, **bold**, and `monospace`. Itemized lists look like:',
  txtString: '2nd paragraph. Italic, bold, and monospace. Itemized lists look like:',
})

export const FILE_P_PICTURE = new TestFile(path.join(ROOT_PORTAL, 'atui_picture.png'))

export const FILE_P_ARCHIVE = new TestFile(path.join(ROOT_PORTAL, 'atui_archive.zip'))

export const FILE_P_GRP_PET30_BASE = new TestFile(path.join(ROOT_GROUPING, 'atui_pet30_base.yaml'), {
  docTitle: 'ATUI Pet 3.0',
})

export const FILE_P_GRP_PET30_CHANGED = new TestFile(path.join(ROOT_GROUPING, 'atui_pet30_changed.yaml'))

export const FILE_P_GRP_PET30_PROP = new TestFile(path.join(ROOT_GROUPING, 'atui_pet30_prop.yaml'))

export const FILE_P_GRP_STORE30_BASE = new TestFile(path.join(ROOT_GROUPING, 'atui_store30_base.yaml'), {
  docTitle: 'ATUI Store 3.0',
})

export const FILE_P_GRP_USER30_BASE = new TestFile(path.join(ROOT_GROUPING, 'atui_user30_base.yaml'), {
  docTitle: 'ATUI User 3.0',
})

export const FILE_P_GRP_USER30_CHANGED = new TestFile(path.join(ROOT_GROUPING, 'atui_user30_changed.yaml'))

export const FILE_P_GRP_GQL_PROP = new TestFile(path.join(ROOT_GROUPING, 'atui_graphql_prop.graphql'))

// export const FILE_P_GRP_MORE200_1 = new TestFile(path.join(ROOT_GROUPING, 'atui_more200_1.json')) //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
//
// export const FILE_P_GRP_MORE200_2 = new TestFile(path.join(ROOT_GROUPING, 'atui_more200_2.json'))
//
// export const FILE_P_GRP_MORE200_3 = new TestFile(path.join(ROOT_GROUPING, 'atui_more200_3.json'))

export const FILE_P_GRP_PREFIX_PETSTORE30_V2 = new TestFile(path.join(ROOT_GROUPING, 'atui_petstore30_prefix_v2.yaml'))

export const FILE_P_GRP_PREFIX_PETSTORE30_V2_CHANGED = new TestFile(path.join(ROOT_GROUPING, 'atui_petstore30_prefix_v2_changed.yaml'))

export const FILE_P_GRP_OAS_TMPL_JSON = new TestFile(path.join(ROOT_GROUPING, 'atui_oas_template.json'))

export const FILE_P_GRP_OAS_TMPL_YAML = new TestFile(path.join(ROOT_GROUPING, 'atui_oas_template.yaml'))

export const FILE_P_GRP_DOWNLOAD_PUBLISH = new TestFile(path.join(ROOT_GROUPING, 'atui_download_publish.yaml'))

export const FILE_P_PLAYGROUND = new TestFile(path.join(ROOT_PORTAL, 'atui_playground.yaml'))
