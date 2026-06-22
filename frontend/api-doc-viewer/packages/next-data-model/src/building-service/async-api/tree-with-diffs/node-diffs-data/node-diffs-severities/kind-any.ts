import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { NODE_LEVEL_DIFF_KEY, NodeDiffs, NodeDiffsSeverities, NodeDiffsSeverity, NodeDiffsSeverityPlacemennt } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";

export class AsyncApiNodeDiffsSeveritiesAggregatorKindAny
  extends AbstractNodeDiffsSeveritiesAggregator<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> {

  public aggregate(
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null>,
  ): NodeDiffsSeverities | undefined {
    const diffNode = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (diffNode) {
      const diff = diffNode.data
      const diffType = diff.type
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diffType,
        causedAt: [],
      }
      if (isDiffReplace(diff)) { // case when descendants diffs summary is not empty
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
        return {
          [NodeDiffsSeverityPlacemennt.TitleRow]: nodeDiffsSeverity,
          // TODO: Extract more layers!
          [NodeDiffsSeverityPlacemennt.BindingVersionRow]: nodeDiffsSeverity,
        }
      }
      if (isDiffRemove(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
      } else if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
      }
      return {
        [NodeDiffsSeverityPlacemennt.TitleRow]: nodeDiffsSeverity,
        [NodeDiffsSeverityPlacemennt.DescriptionRow]: nodeDiffsSeverity,
        [NodeDiffsSeverityPlacemennt.SummaryRow]: nodeDiffsSeverity,
        [NodeDiffsSeverityPlacemennt.AddressRow]: nodeDiffsSeverity,
        [NodeDiffsSeverityPlacemennt.BindingVersionRow]: nodeDiffsSeverity,
        [NodeDiffsSeverityPlacemennt.ServerAddressRow]: nodeDiffsSeverity,
      }
    }

    const diffTitle = nodeDiffs['title']
    const diffDescription = nodeDiffs['description']
    const diffSummary = nodeDiffs['summary']
    const diffAddress = nodeDiffs['address']
    const diffBindingVersion = nodeDiffs['version']
    // servers
    const diffServerHost = nodeDiffs['host']
    const diffServerProtocol = nodeDiffs['protocol']

    const diffsSeverities: NodeDiffsSeverities = {}

    if (diffTitle) {
      const diff = diffTitle.data
      const diffType = diff.type
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diffType,
        causedAt: [],
      }
      if (isDiffRemove(diff) || isDiffReplace(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
      }
      if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
      }
      diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] = nodeDiffsSeverity
    }
    if (diffDescription) {
      const diff = diffDescription.data
      const diffType = diff.type
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diffType,
        causedAt: [],
      }
      if (isDiffRemove(diff) || isDiffReplace(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
      }
      if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
      }
      diffsSeverities[NodeDiffsSeverityPlacemennt.DescriptionRow] = nodeDiffsSeverity
    }
    if (diffSummary) {
      const diff = diffSummary.data
      const diffType = diff.type
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diffType,
        causedAt: [],
      }
      if (isDiffRemove(diff) || isDiffReplace(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
      }
      if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
      }
      diffsSeverities[NodeDiffsSeverityPlacemennt.SummaryRow] = nodeDiffsSeverity
    }
    if (diffAddress) {
      const diff = diffAddress.data
      const diffType = diff.type
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diffType,
        causedAt: [],
      }
      if (isDiffRemove(diff) || isDiffReplace(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
      }
      if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
      }
      diffsSeverities[NodeDiffsSeverityPlacemennt.AddressRow] = nodeDiffsSeverity
    }
    if (diffBindingVersion) {
      const diff = diffBindingVersion.data
      const diffType = diff.type
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diffType,
        causedAt: [],
      }
      if (isDiffRemove(diff) || isDiffReplace(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
      }
      if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
      }
      diffsSeverities[NodeDiffsSeverityPlacemennt.BindingVersionRow] = nodeDiffsSeverity
    }

    if (diffServerHost || diffServerProtocol) {
      const diffServerHostData = diffServerHost?.data
      const diffServerProtocolData = diffServerProtocol?.data

      const maxDiff = AbstractNodeDiffsSeveritiesAggregator.maxDiffByDiffType(diffServerHostData, diffServerProtocolData)
      if (maxDiff) {
        const nodeDiffsSeverity: NodeDiffsSeverity = {
          type: maxDiff.type,
          causedAt: [],
        }
        if (isDiffRemove(maxDiff) || isDiffReplace(maxDiff)) {
          nodeDiffsSeverity.causedAt = maxDiff.beforeDeclarationPaths[0]
        }
        if (isDiffAdd(maxDiff)) {
          nodeDiffsSeverity.causedAt = maxDiff.afterDeclarationPaths[0]
        }
        diffsSeverities[NodeDiffsSeverityPlacemennt.ServerAddressRow] = nodeDiffsSeverity
      }
    }

    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined;
  }
}