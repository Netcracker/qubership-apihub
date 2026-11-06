import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { SecurityTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/security/types/aliases"
import { SecurityTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/security/types/node-kind"
import { OpenApiResponseCode } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/response-code"
import {
  findOpenApiChild,
  getOpenApiOptions,
  isOpenApiContentNode,
  isOpenApiMediaTypeNode,
  isOpenApiResponseNode,
} from "./node-type-checkers"
import { resolveSelectedSecurityAlternative } from "../security/node-type-checkers"

/**
 * View-state selection of the OpenAPI operation viewer: owner node id -> selected child node id
 * (security -> alternative, responses -> response, request body / response -> media type). An owner
 * without an entry shows its default option. CSS-free so it can be unit tested.
 * Design: docs/design/openapi/features/operation-viewer.md -> "View state".
 */
export type OpenApiSelection = ReadonlyMap<string, string>

type SecurityNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.SECURITY>
type ResponsesNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.RESPONSES>
type MediaTypeOwnerNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.REQUEST_BODY> | OpenApiTreeNode<typeof OpenApiTreeNodeKinds.RESPONSE>

export class OpenApiViewSelection {
  /** The selected security alternative: the chosen one, else the first (index 0 of the merged list). */
  public static alternative(security: SecurityNode, selection: OpenApiSelection): SecurityTreeNode<typeof SecurityTreeNodeKinds.SECURITY_REQUIREMENT> | undefined {
    return resolveSelectedSecurityAlternative(security, selection.get(security.id))
  }

  /** The selected response: the chosen one, else the default code (`OpenApiResponseCode.pickDefault`, features/response-code-selector.md). */
  public static response(responses: ResponsesNode, selection: OpenApiSelection): OpenApiTreeNode<typeof OpenApiTreeNodeKinds.RESPONSE> | undefined {
    const codes = getOpenApiOptions(responses, isOpenApiResponseNode)
    return codes.find(response => response.id === selection.get(responses.id))
      ?? OpenApiResponseCode.pickDefault(codes, response => String(response.key))
  }

  /** Media types of a body owner (request body, or a response for its body), in document order. */
  public static mediaTypes(owner: MediaTypeOwnerNode): OpenApiTreeNode<typeof OpenApiTreeNodeKinds.MEDIA_TYPE>[] {
    return getOpenApiOptions(findOpenApiChild(owner, isOpenApiContentNode), isOpenApiMediaTypeNode)
  }

  /** The selected media type of a body owner: the chosen one, else the first. */
  public static mediaType(owner: MediaTypeOwnerNode, selection: OpenApiSelection): OpenApiTreeNode<typeof OpenApiTreeNodeKinds.MEDIA_TYPE> | undefined {
    const mediaTypes = OpenApiViewSelection.mediaTypes(owner)
    return mediaTypes.find(mediaType => mediaType.id === selection.get(owner.id)) ?? mediaTypes[0]
  }
}
