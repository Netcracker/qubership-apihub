import { OpenApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/openapi/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { FC } from "react"
import { ExtensionsSectionContent, ExtensionsSectionTitleRow } from "../shared-components/ExtensionsSection/ExtensionsSection"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { OpenApiSectionTitleRowProps, useOpenApiSectionTitleRowProps } from "./CollapsibleSection"
import { takeOpenApiSeverities } from "./diff-state"

type ExtensionsNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.EXTENSIONS>

type ExtensionsTitleRowProps = {
  node: ExtensionsNode
  variant: TextValueVariant
}

type ExtensionsTitleRowContentProps = ExtensionsTitleRowProps & {
  section?: OpenApiSectionTitleRowProps
}

type ExtensionsValuesProps = {
  node: ExtensionsNode
}

/** Operation (h2), Response (h3) and Responses Object (h3) extensions title. Layout block: `extensions-blocks.tsx`. */
export const ExtensionsTitleRow: FC<ExtensionsTitleRowContentProps> = ({ node, variant, section }) => {
  // Background and highlighting mode from the one diff that paints the row.
  const diff = OpenApiRowDiffs.Section.takeHeaderRowDiff(node)
  return (
    <ExtensionsSectionTitleRow
      data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
      variant={variant}
      section={section}
      titleRowDiffProps={{
        diff,
        diffsSeverities: takeOpenApiSeverities(node),
        highlightingMode: diff?.highlightingMode,
      }}
    />
  )
}

/** The same title with the section expander (expanded state from the operation view state). */
export const CollapsibleExtensionsTitleRow: FC<ExtensionsTitleRowProps> = (props) => {
  const section = useOpenApiSectionTitleRowProps(props.node.id)
  return <ExtensionsTitleRow {...props} section={section} />
}

/** The `x-*` values (JSO viewer); its first row keeps the nested-viewer inset. */
export const ExtensionsValues: FC<ExtensionsValuesProps> = ({ node }) => (
  <ExtensionsSectionContent rawValues={node.value()?.rawValues ?? {}} contentPrecededBy={PrecededBy.SEPARATOR_LAYOUT_NESTED_VIEWER_START} />
)
