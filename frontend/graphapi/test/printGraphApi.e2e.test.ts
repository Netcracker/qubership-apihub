import { printGraphApi } from "../src"
import { buildGraphApi } from "./helpers/build-graphApi"
import { loadFile } from "./helpers/load-file"

describe.skip("Print schema from GraphApi", () => {
  it("should build the same graphapi from printed graphql schema", async () => {
    const source1 = loadFile("example.graphql")
    const graphapi1 = buildGraphApi(source1)

    const source2 = printGraphApi(graphapi1)
    const graphapi2 = buildGraphApi(source2)

    expect(graphapi1).toMatchObject(graphapi2)
  })
})
