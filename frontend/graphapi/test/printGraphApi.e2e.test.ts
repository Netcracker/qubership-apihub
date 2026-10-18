import { printGraphApi } from "../src"
import { buildGraphApi } from "./helpers/build-graphApi"
import { loadFile } from "./helpers/load-file"

describe("Should build the same graphapi from printed graphql schema", () => {
  it("e2e example", async () => {
    const source1 = loadFile("example.graphql")
    const graphapi1 = buildGraphApi(source1)

    const source2 = printGraphApi(graphapi1)
    const graphapi2 = buildGraphApi(source2)

    expect(graphapi1).toMatchObject(graphapi2)
  })

  it("overriden default directive", async () => {
    const source1 = loadFile("overriden_default_directive.graphql")
    const graphapi1 = buildGraphApi(source1)

    const source2 = printGraphApi(graphapi1)
    const graphapi2 = buildGraphApi(source2)

    expect(graphapi1).toMatchObject(graphapi2)
  })

  it("custom directive", async () => {
    const source1 = loadFile("custom_directive.graphql")
    const graphapi1 = buildGraphApi(source1)

    const source2 = printGraphApi(graphapi1)
    const graphapi2 = buildGraphApi(source2)

    expect(graphapi1).toMatchObject(graphapi2)
  })
})
