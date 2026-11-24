import { OPENAPI_SECURITY_PRESENTATION } from "@netcracker/qubership-apihub-next-data-model/model/openapi/security-presentation"
import { FC } from "react"
import { SecuritySchemeCardBase, SecuritySchemeCardProps } from "../shared-components/Security/SecuritySchemeCardBase"

/** A scheme card of an OpenAPI operation: the shared card with the OpenAPI labels and row visibility (5 scheme types). */
export const OpenApiSecuritySchemeCard: FC<SecuritySchemeCardProps> = (props) => (
  <SecuritySchemeCardBase {...props} presentation={OPENAPI_SECURITY_PRESENTATION} />
)
