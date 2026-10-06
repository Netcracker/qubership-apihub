import { UxBadge } from "@apihub/components/kit/ux/UxBadge/UxBadge"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { resolveDiffSideStyle } from "@apihub/utils/diffs/resolve-diff-side-style"
import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC } from "react"
import { JsonSchemaNodeTitleDisplay, JsonSchemaNodeTitleVariants } from '../utils/resolve-json-schema-node-title'
import { JsonSchemaRequiredDiffIndicator } from "./JsonSchemaRequiredDiffIndicator"

const JSON_SCHEMA_NODE_TITLE_CLASS = "text-xs text-black font-Inter-Medium"

export type JsonSchemaNodeTitleProps = {
  display: JsonSchemaNodeTitleDisplay
  required?: boolean
  requiredDiff?: Diff
  layoutSide?: LayoutSide
  /** Diff of the title text itself (e.g. a renamed property key), highlighted on `layoutSide`. */
  textDiff?: ChangedPropertyMetaData
}

export type JsonSchemaNodeTitlePlainProps = Omit<JsonSchemaNodeTitleProps, "requiredDiff" | "layoutSide" | "textDiff">

export const JsonSchemaNodeTitlePlain: FC<JsonSchemaNodeTitlePlainProps> = (props) => {
  const { display, required = false } = props

  switch (display.variant) {
    case JsonSchemaNodeTitleVariants.BADGE:
      return <UxBadge kind={display.badgeKind} text={display.text} inline={true} />
    case JsonSchemaNodeTitleVariants.TEXT:
      return (
        <div className={`inline ${JSON_SCHEMA_NODE_TITLE_CLASS}`}>
          {display.text}
          {required && <sup className="ml-0.5 text-red-500">*</sup>}
        </div>
      )
  }
}

export const JsonSchemaNodeTitleWithDiffs: FC<JsonSchemaNodeTitleProps> = (props) => {
  const { display, required = false, requiredDiff, layoutSide, textDiff } = props

  switch (display.variant) {
    case JsonSchemaNodeTitleVariants.BADGE:
      return <UxBadge kind={display.badgeKind} text={display.text} inline={true} />
    case JsonSchemaNodeTitleVariants.TEXT: {
      const highlighterClassName = textDiff && layoutSide
        ? DiffsClassesBuilder.highlighter(resolveDiffSideStyle(textDiff, layoutSide).textHighlighterColor)
        : undefined
      return (
        <div className={`inline ${JSON_SCHEMA_NODE_TITLE_CLASS}`}>
          {highlighterClassName ? <span className={highlighterClassName}>{display.text}</span> : display.text}
          <JsonSchemaRequiredDiffIndicator
            required={required}
            requiredDiff={requiredDiff}
            layoutSide={layoutSide}
          />
        </div>
      )
    }
  }
}
