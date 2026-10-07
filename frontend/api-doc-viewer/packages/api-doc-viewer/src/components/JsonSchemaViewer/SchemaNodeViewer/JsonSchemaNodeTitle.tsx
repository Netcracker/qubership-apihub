import { UxBadge } from "@apihub/components/kit/ux/UxBadge/UxBadge"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { resolveDiffSideStyle } from "@apihub/utils/diffs/resolve-diff-side-style"
import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, ReactNode } from "react"
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
  /** Makes the title clickable (e.g. toggles the row's expander); omit for a non-interactive title. */
  onClick?: () => void
}

export type JsonSchemaNodeTitlePlainProps = Omit<JsonSchemaNodeTitleProps, "requiredDiff" | "layoutSide" | "textDiff">

type ClickableTitleBadgeProps = Pick<JsonSchemaNodeTitleProps, "onClick"> & {
  children: ReactNode
}

// UxBadge is a kit component without click support, so the badge variant gets a clickable wrapper
const ClickableTitleBadge: FC<ClickableTitleBadgeProps> = (props) => {
  const { onClick, children } = props
  if (!onClick) {
    return <>{children}</>
  }
  return <span className="inline-flex hover:cursor-pointer" onClick={onClick}>{children}</span>
}

function resolveTitleTextClassName(onClick?: () => void): string {
  return `inline ${JSON_SCHEMA_NODE_TITLE_CLASS}${onClick ? " hover:cursor-pointer" : ""}`
}

export const JsonSchemaNodeTitlePlain: FC<JsonSchemaNodeTitlePlainProps> = (props) => {
  const { display, required = false, onClick } = props

  switch (display.variant) {
    case JsonSchemaNodeTitleVariants.BADGE:
      return (
        <ClickableTitleBadge onClick={onClick}>
          <UxBadge kind={display.badgeKind} text={display.text} inline={true} />
        </ClickableTitleBadge>
      )
    case JsonSchemaNodeTitleVariants.TEXT:
      return (
        <div className={resolveTitleTextClassName(onClick)} onClick={onClick}>
          {display.text}
          {required && <sup className="ml-0.5 text-red-500">*</sup>}
        </div>
      )
  }
}

export const JsonSchemaNodeTitleWithDiffs: FC<JsonSchemaNodeTitleProps> = (props) => {
  const { display, required = false, requiredDiff, layoutSide, textDiff, onClick } = props

  switch (display.variant) {
    case JsonSchemaNodeTitleVariants.BADGE:
      return (
        <ClickableTitleBadge onClick={onClick}>
          <UxBadge kind={display.badgeKind} text={display.text} inline={true} />
        </ClickableTitleBadge>
      )
    case JsonSchemaNodeTitleVariants.TEXT: {
      const highlighterClassName = textDiff && layoutSide
        ? DiffsClassesBuilder.highlighter(resolveDiffSideStyle(textDiff, layoutSide).textHighlighterColor)
        : undefined
      return (
        <div className={resolveTitleTextClassName(onClick)} onClick={onClick}>
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
