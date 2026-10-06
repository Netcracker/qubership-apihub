import { CustomizationOptions } from "@apihub/contexts/CustomizationOptionsContext"
import { DiffMetaKeys } from "@apihub/types/DiffMetaKeys"
import { DisplayMode } from "@apihub/types/DisplayMode"
import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { FC } from "react"

export type JsoEmbeddedSchemaComponentProps = {
  schema: unknown
  expandedDepth?: number
  displayMode?: DisplayMode
  customizationOptions?: CustomizationOptions
}

export type JsoEmbeddedSchemaComponent = FC<JsoEmbeddedSchemaComponentProps>

export type JsoEmbeddedSchemaDiffsComponentProps = {
  schema: unknown
  expandedDepth?: number
  displayMode?: DisplayMode
  diffMetaKeys: DiffMetaKeys
  diffTypes?: ReadonlyArray<DiffType>
  customizationOptions?: CustomizationOptions
}

export type JsoEmbeddedSchemaDiffsComponent = FC<JsoEmbeddedSchemaDiffsComponentProps>
