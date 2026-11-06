import { ASYNC_API_SECURITY_PRESENTATION } from "@netcracker/qubership-apihub-next-data-model/model/async-api/security-presentation"
import { FC } from "react"
import { SecuritySchemeCardBase, SecuritySchemeCardProps } from "../shared-components/Security/SecuritySchemeCardBase"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { SizeVariant } from "./types/SizeVariant"

type AsyncApiSecuritySchemeCardProps = SecuritySchemeCardProps & {
  /** `PRIMARY` — operation section (h3 title); `SECONDARY` — server section (h5 title). */
  variant?: SizeVariant
}

/** Scheme name size per section size: always smaller than the `Security` title above it (h3 > h4, h5 > h6). */
const SCHEME_TITLE_VARIANTS: Readonly<Record<SizeVariant, TextValueVariant>> = {
  [SizeVariant.PRIMARY]: TextValueVariant.h4,
  [SizeVariant.SECONDARY]: TextValueVariant.h6,
}

/** A scheme card of an AsyncAPI operation / server: the shared card with the AsyncAPI labels and row visibility (13 scheme types). */
export const AsyncApiSecuritySchemeCard: FC<AsyncApiSecuritySchemeCardProps> = ({ variant = SizeVariant.PRIMARY, ...props }) => (
  <SecuritySchemeCardBase {...props} presentation={ASYNC_API_SECURITY_PRESENTATION} titleVariant={SCHEME_TITLE_VARIANTS[variant]} />
)
