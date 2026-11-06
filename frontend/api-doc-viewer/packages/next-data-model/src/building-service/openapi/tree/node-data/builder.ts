import { SECURITY_NODE_VALUE_PROPS } from "../../../../model/security/types/node-value"
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from "../../../../model/openapi/types/node-kind"
import { OpenApiTreeNodeMeta } from "../../../../model/openapi/types/node-meta"
import { OpenApiAnyTreeNodeValue, OpenApiTreeNodeValue, OpenApiTreeNodeValueTypeExtensions, OpenApiTreeNodeValueTypeMediaType, OpenApiTreeNodeValueTypeOperation, OpenApiTreeNodeValueTypeParameters, OpenApiTreeNodeValueTypeRequestBody, OpenApiTreeNodeValueTypeResponse, OpenApiTreeNodeValueTypeResponseHeaders } from "../../../../model/openapi/types/node-value"
import { isObjectWithStringKeys } from "../../../../utilities"
import { AbstractNodeDataBuilder, NodeDataPickFunction } from "../../../abstract/tree/node-data/builder"

const OPERATION_VALUE_PROPS = [
  'path', 'method', 'specVersion', 'title', 'operationId', 'description', 'externalDocs', 'deprecated',
] as const satisfies readonly (keyof OpenApiTreeNodeValueTypeOperation)[]

const EXTENSIONS_VALUE_PROPS = ['rawValues'] as const satisfies readonly (keyof OpenApiTreeNodeValueTypeExtensions)[]

const PARAMETERS_VALUE_PROPS = ['location', 'schema'] as const satisfies readonly (keyof OpenApiTreeNodeValueTypeParameters)[]

const REQUEST_BODY_VALUE_PROPS = ['description', 'required'] as const satisfies readonly (keyof OpenApiTreeNodeValueTypeRequestBody)[]

const MEDIA_TYPE_VALUE_PROPS = ['mediaType', 'schema'] as const satisfies readonly (keyof OpenApiTreeNodeValueTypeMediaType)[]

const RESPONSE_VALUE_PROPS = ['code', 'codeClass', 'description'] as const satisfies readonly (keyof OpenApiTreeNodeValueTypeResponse)[]

const RESPONSE_HEADERS_VALUE_PROPS = ['schema'] as const satisfies readonly (keyof OpenApiTreeNodeValueTypeResponseHeaders)[]

/** Value props of each kind, typed by the kind's value. */
export type OpenApiNodeValueProps = {
  readonly [K in OpenApiTreeNodeKind]: readonly (keyof OpenApiTreeNodeValue<K>)[]
}

/** Value props per kind. Also the allow-list of field diffs a node aggregates. */
export const OPENAPI_NODE_VALUE_PROPS: OpenApiNodeValueProps = {
  [OpenApiTreeNodeKinds.OPERATION]: OPERATION_VALUE_PROPS,
  [OpenApiTreeNodeKinds.SECURITY]: SECURITY_NODE_VALUE_PROPS[OpenApiTreeNodeKinds.SECURITY],
  [OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES]: SECURITY_NODE_VALUE_PROPS[OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES],
  [OpenApiTreeNodeKinds.SECURITY_REQUIREMENT]: SECURITY_NODE_VALUE_PROPS[OpenApiTreeNodeKinds.SECURITY_REQUIREMENT],
  [OpenApiTreeNodeKinds.SECURITY_SCHEME]: SECURITY_NODE_VALUE_PROPS[OpenApiTreeNodeKinds.SECURITY_SCHEME],
  [OpenApiTreeNodeKinds.OAUTH_FLOW]: SECURITY_NODE_VALUE_PROPS[OpenApiTreeNodeKinds.OAUTH_FLOW],
  [OpenApiTreeNodeKinds.EXTENSIONS]: EXTENSIONS_VALUE_PROPS,
  [OpenApiTreeNodeKinds.REQUEST]: [],
  [OpenApiTreeNodeKinds.PARAMETERS]: PARAMETERS_VALUE_PROPS,
  [OpenApiTreeNodeKinds.REQUEST_BODY]: REQUEST_BODY_VALUE_PROPS,
  [OpenApiTreeNodeKinds.CONTENT]: [],
  [OpenApiTreeNodeKinds.MEDIA_TYPE]: MEDIA_TYPE_VALUE_PROPS,
  [OpenApiTreeNodeKinds.RESPONSES]: [],
  [OpenApiTreeNodeKinds.RESPONSE]: RESPONSE_VALUE_PROPS,
  [OpenApiTreeNodeKinds.RESPONSE_HEADERS]: RESPONSE_HEADERS_VALUE_PROPS,
}

export class OpenApiNodeDataBuilder extends AbstractNodeDataBuilder<OpenApiAnyTreeNodeValue | null, OpenApiTreeNodeMeta> {
  public override createNodeMeta(value: unknown): OpenApiTreeNodeMeta {
    return { _fragment: value }
  }

  public override createNodeValue(
    kind: OpenApiTreeNodeKind,
    _key: PropertyKey,
    value: unknown,
    pick: NodeDataPickFunction,
  ): OpenApiAnyTreeNodeValue | null {
    if (!isObjectWithStringKeys(value)) {
      return null
    }
    return this.pickValue(kind, value, pick)
  }

  /** The kind's value: only its listed props (`OPENAPI_NODE_VALUE_PROPS`, typed per kind). */
  private pickValue<K extends OpenApiTreeNodeKind>(
    kind: K,
    value: Record<string, unknown>,
    pick: NodeDataPickFunction,
  ): OpenApiTreeNodeValue<K> | null {
    return pick<OpenApiTreeNodeValue<K>>(value, OPENAPI_NODE_VALUE_PROPS[kind])
  }
}
