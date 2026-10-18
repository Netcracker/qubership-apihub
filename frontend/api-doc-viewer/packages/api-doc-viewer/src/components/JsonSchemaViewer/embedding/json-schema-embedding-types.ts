import { DiffMetaKeys } from "@apihub/types/DiffMetaKeys"
import { DisplayMode } from "@apihub/types/DisplayMode"
import { FC } from "react"

export type JsonSchemaExtensionsJsoComponentProps = {
  source: object
  initialLevel?: number
}

export type JsonSchemaExtensionsJsoComponent = FC<JsonSchemaExtensionsJsoComponentProps>

export type JsonSchemaExtensionsJsoDiffsComponentProps = {
  mergedSource: unknown
  initialLevel?: number
  displayMode?: DisplayMode
  diffMetaKeys: DiffMetaKeys
}

export type JsonSchemaExtensionsJsoDiffsComponent = FC<JsonSchemaExtensionsJsoDiffsComponentProps>
