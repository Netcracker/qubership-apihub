import { JsonPath } from "@netcracker/qubership-apihub-json-crawl";

export type DdlApiTransformFunc<S> =
  (
    key: PropertyKey,
    value: unknown,
    source: unknown,
    path: JsonPath,
    state: S,
  ) => unknown;
