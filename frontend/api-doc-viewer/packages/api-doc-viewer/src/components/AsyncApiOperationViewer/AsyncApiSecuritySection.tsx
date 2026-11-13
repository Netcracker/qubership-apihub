import { cn } from "@apihub/utils/common/cn"
import { SECURITY_SECTION_TITLE } from "@netcracker/qubership-apihub-next-data-model/model/security/display/labels"
import { takeSecuritySeverities } from "@apihub/utils/security/diff-state"
import { findSecurityAlternatives, resolveSelectedSecurityAlternative } from "@apihub/utils/security/node-type-checkers"
import { ASYNC_API_SECURITY_DISPLAY_LABELS } from "@netcracker/qubership-apihub-next-data-model/model/async-api/security-presentation"
import { SecurityRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/security/tree-with-diffs/row-diffs"
import { FC, memo, useMemo, useState } from "react"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import {
  SecuritySectionNode,
  SecurityToolbarRow,
} from "../shared-components/Security/SecuritySectionBase"
import { buildSecurityContentBlocks, buildSecurityToolbarBlock } from "../shared-components/Security/security-section-blocks"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { AsyncApiSecuritySchemeCard } from "./AsyncApiSecuritySchemeCard"
import { SizeVariant } from "./types/SizeVariant"

type AsyncApiSecuritySectionProps = WithPrecededByProps & {
  node: SecuritySectionNode
  /** `PRIMARY` — the operation's section in the message (h3); `SECONDARY` — a server's section (h5). */
  variant?: SizeVariant
}

/**
 * The Security section of an AsyncAPI operation or server. The title row is an AsyncAPI row (spaced by
 * `data-precededby`, h3 / h5 like `Bindings`); the toolbar and the selected alternative's scheme cards
 * are the shared Security section elements in their own vertical layout (`level="security"`, outer
 * halves). The selected alternative is local state. The element after the section is
 * `PrecededBy.SECURITY_SECTION`. Design: docs/design/async-api/features/security.md.
 */
export const AsyncApiSecuritySection: FC<AsyncApiSecuritySectionProps> = memo(props => {
  const { node, variant = SizeVariant.PRIMARY, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props
  const [selectedId, setSelectedId] = useState<string>()
  const selected = resolveSelectedSecurityAlternative(node, selectedId)

  const toolbar = findSecurityAlternatives(node)

  const blocks: StackBlock[] = useMemo(() => [
    ...(toolbar ? [buildSecurityToolbarBlock(toolbar, () => (
      <SecurityToolbarRow
        key="security-toolbar"
        toolbar={toolbar}
        labels={ASYNC_API_SECURITY_DISPLAY_LABELS}
        selected={selected}
        onSelect={(alternative) => setSelectedId(alternative.id)}
      />
    ))] : []),
    ...buildSecurityContentBlocks(selected, scheme => <AsyncApiSecuritySchemeCard key={scheme.id} node={scheme} variant={variant} />),
  ], [toolbar, selected, variant])

  return (
    <div data-testid="async-api-security-section" className={cn("flex flex-col")}>
      <TitleRow
        data-precededby={precededBy}
        value={SECURITY_SECTION_TITLE}
        expandable={false}
        variant={variant === SizeVariant.PRIMARY ? TextValueVariant.h3 : TextValueVariant.h5}
        diff={SecurityRowDiffs.Section.takeHeaderRowDiff(node)}
        diffsSeverities={takeSecuritySeverities(node)}
      />
      <StackLayout blocks={blocks} level="security" outerHalves={true} />
    </div>
  )
})
