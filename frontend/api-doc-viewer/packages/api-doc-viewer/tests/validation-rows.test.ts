import {
  JsonSchemaValidationRow,
  JsonSchemaValidationRowKeys,
  JsonSchemaValidationRows,
} from "../src/components/JsonSchemaViewer/utils/validation-rows"

describe("JsonSchemaValidationRows.resolveListValues", () => {
  it("returns one chip string per list item", () => {
    expect(JsonSchemaValidationRows.resolveListValues([["a"], ["a", "b"]])).toEqual(['["a"]', '["a","b"]'])
  })
})

describe("JsonSchemaValidationRows.resolve", () => {
  it("splits bound range constraints into separate chip values", () => {
    const rows = JsonSchemaValidationRows.resolve({
      type: "array",
      minItems: 1,
      maxItems: 10,
    })

    const itemsCount = rows.find((row) => row.key === JsonSchemaValidationRowKeys.ITEMS_COUNT)
    expect(itemsCount?.values).toEqual([">= 1", "<= 10"])
  })
})

describe("JsonSchemaValidationRows.sortByType", () => {
  function row(key: JsonSchemaValidationRow["key"]): JsonSchemaValidationRow {
    return { key, label: key, values: [] }
  }

  it("orders rows by schema-type group (String -> Number -> Object -> Array), regardless of input order", () => {
    const shuffled = [
      row("itemsCount"),
      row("valueRange"),
      row("uniqueItems"),
      row("valuePattern"),
      row("propertiesCount"),
      row("valueLength"),
      row("valueMultipleOf"),
    ]

    expect(JsonSchemaValidationRows.sortByType(shuffled).map((r) => r.key)).toEqual([
      "valueLength",
      "valuePattern",
      "valueRange",
      "valueMultipleOf",
      "propertiesCount",
      "uniqueItems",
      "itemsCount",
    ])
  })

  // Mirrors packages/samples/json-schema-diffs/type-changes/type-value-changes/001-string-to-number
  // and its reverse, 006-number-to-string: whichever type's rows only exist via a diff (base rows
  // for the other side, pushed after base rows before sorting) must not flip the group order.
  it("keeps String-before-Number group order regardless of which side's rows are diff-only", () => {
    const stringToNumber = [row("valueRange"), row("valueMultipleOf"), row("valueLength"), row("valuePattern")]
    const numberToString = [row("valueLength"), row("valuePattern"), row("valueRange"), row("valueMultipleOf")]

    expect(JsonSchemaValidationRows.sortByType(stringToNumber).map((r) => r.key))
      .toEqual(["valueLength", "valuePattern", "valueRange", "valueMultipleOf"])
    expect(JsonSchemaValidationRows.sortByType(numberToString).map((r) => r.key))
      .toEqual(["valueLength", "valuePattern", "valueRange", "valueMultipleOf"])
  })

  it("does not mutate the input array", () => {
    const input = [row("itemsCount"), row("valueLength")]
    const inputCopy = [...input]
    JsonSchemaValidationRows.sortByType(input)
    expect(input).toEqual(inputCopy)
  })
})
