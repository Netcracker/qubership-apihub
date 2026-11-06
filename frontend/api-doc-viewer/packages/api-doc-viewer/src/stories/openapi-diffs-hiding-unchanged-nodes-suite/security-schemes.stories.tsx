import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  buildOpenApiHidingUnchangedDocuments,
  openApiHidingUnchangedCases,
} from "@netcracker/qubership-apihub-samples";
import { OPENAPI_DIFFS_STORY_ARG_TYPES, OPENAPI_DIFFS_STORY_DEFAULT_ARGS } from "../openapi-suite/openapi-story-args";
import { OpenApiDiffSampleStory } from "../openapi-diffs-suite/OpenApiDiffSampleStory";

/**
 * Security scheme cards with "hide unchanged nodes": every scheme kind unchanged (title row plus the
 * three-dots row) and changed (every row), plus cards of one alternative decided one by one, and an
 * anonymous alternative (`{}`) change that must not reveal any card.
 * Cases are built from one template and per-scheme fragments (`hasChanges`) in
 * `packages/samples/src/openapi-diffs-hiding-unchanged-nodes.ts`, not stored as YAML.
 * Design: docs/design/openapi/features/hiding-unchanged-nodes.md
 */
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes)/Security Schemes",
  component: OpenApiDiffSampleStory,
  argTypes: OPENAPI_DIFFS_STORY_ARG_TYPES,
  args: { ...OPENAPI_DIFFS_STORY_DEFAULT_ARGS, hideUnchangedNodes: true },
} satisfies Meta<typeof OpenApiDiffSampleStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = (caseId: string): Story => {
  const testCase = openApiHidingUnchangedCases.find(candidate => candidate.caseId === caseId);
  if (!testCase) {
    throw new Error(`Hiding-unchanged case not found: ${caseId}`);
  }
  const { before, after } = buildOpenApiHidingUnchangedDocuments(testCase);
  // `parseYamlSource` reads JSON as well.
  return {
    name: `${caseId}: ${testCase.title}`,
    args: { caseId, beforeYaml: JSON.stringify(before), afterYaml: JSON.stringify(after) },
  };
};

export const Case_01_api_key_header_unchanged: Story = createCaseStory("01-api-key-header-unchanged");
export const Case_02_api_key_header_changed: Story = createCaseStory("02-api-key-header-changed");
export const Case_03_api_key_query_unchanged: Story = createCaseStory("03-api-key-query-unchanged");
export const Case_04_api_key_query_changed: Story = createCaseStory("04-api-key-query-changed");
export const Case_05_api_key_cookie_unchanged: Story = createCaseStory("05-api-key-cookie-unchanged");
export const Case_06_api_key_cookie_changed: Story = createCaseStory("06-api-key-cookie-changed");
export const Case_07_http_basic_unchanged: Story = createCaseStory("07-http-basic-unchanged");
export const Case_08_http_basic_changed: Story = createCaseStory("08-http-basic-changed");
export const Case_09_http_bearer_unchanged: Story = createCaseStory("09-http-bearer-unchanged");
export const Case_10_http_bearer_changed: Story = createCaseStory("10-http-bearer-changed");
export const Case_11_openid_connect_unchanged: Story = createCaseStory("11-openid-connect-unchanged");
export const Case_12_openid_connect_changed: Story = createCaseStory("12-openid-connect-changed");
export const Case_13_oauth2_single_flow_unchanged: Story = createCaseStory("13-oauth2-single-flow-unchanged");
export const Case_14_oauth2_single_flow_changed: Story = createCaseStory("14-oauth2-single-flow-changed");
export const Case_15_oauth2_all_flows_unchanged: Story = createCaseStory("15-oauth2-all-flows-unchanged");
export const Case_16_oauth2_all_flows_changed: Story = createCaseStory("16-oauth2-all-flows-changed");
export const Case_17_mutual_tls_unchanged: Story = createCaseStory("17-mutual-tls-unchanged");
export const Case_18_mutual_tls_changed: Story = createCaseStory("18-mutual-tls-changed");
export const Case_19_two_schemes_first_unchanged_second_changed: Story = createCaseStory("19-two-schemes-first-unchanged-second-changed");
export const Case_20_two_schemes_first_changed_second_unchanged: Story = createCaseStory("20-two-schemes-first-changed-second-unchanged");
export const Case_21_three_schemes_all_unchanged: Story = createCaseStory("21-three-schemes-all-unchanged");
export const Case_22_anonymous_added_cards_unchanged: Story = createCaseStory("22-anonymous-added-cards-unchanged");
export const Case_23_anonymous_removed_cards_unchanged: Story = createCaseStory("23-anonymous-removed-cards-unchanged");
