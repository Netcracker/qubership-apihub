import { readFileSync } from "fs"
import { resolve } from "path"
import { OPEN_API_HTTP_METHODS_ORDER } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/http-method"
import { serveTemplateOperationAs } from "../src/stories/openapi-suite/openapi-suite-utils"
import { parseYamlSource } from "../src/stories/utils/parse-yaml-source"

const TEMPLATE = resolve(__dirname, "../../samples/openapi/oas30/http-methods/template/sample.yaml")

describe("OpenAPI method template", () => {
  const template = parseYamlSource(readFileSync(TEMPLATE, "utf-8"))

  it.each(OPEN_API_HTTP_METHODS_ORDER)("serves the template operation as %s", (method) => {
    const served = serveTemplateOperationAs(template, "/orders", method)
    expect(served).toEqual({
      ...template,
      paths: { "/orders": { [method]: { responses: { 200: { description: "" } } } } },
    })
  })

  it("keeps the path item's non-operation fields and leaves the template unchanged", () => {
    const document = { paths: { "/orders": { summary: "Orders", parameters: [], get: { responses: {} } } } }
    expect(serveTemplateOperationAs(document, "/orders", "delete")).toEqual({
      paths: { "/orders": { summary: "Orders", parameters: [], delete: { responses: {} } } },
    })
    expect(document.paths["/orders"]).toHaveProperty("get")
  })

  it("rejects a template without exactly one operation under the path", () => {
    expect(() => serveTemplateOperationAs({ paths: {} }, "/orders", "get")).toThrow("no path item /orders")
    expect(() => serveTemplateOperationAs({ paths: { "/orders": { get: {}, put: {} } } }, "/orders", "post")).toThrow("found 2")
  })
})
