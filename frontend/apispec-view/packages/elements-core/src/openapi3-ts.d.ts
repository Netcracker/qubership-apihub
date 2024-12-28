import { PathsObject } from "openapi3-ts";

export declare module 'openapi3-ts' {
  export interface CustomPathsObjects extends PathsObject {
    [diffMetaKey: symbol]: Record<PropertyKey, unknown>
  }
}