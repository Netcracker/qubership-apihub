import { readFileSync } from "fs"
import { resolve } from "path"
import { OpenApiResponseCodeClass, OpenApiResponseCodeClasses } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/response-code"
import { OPENAPI_SECTION_IDS_BY_LEVEL, OPENAPI_SECTION_ORDER } from "../src/components/OpenApiOperationViewer/config/section-order"
import { ASYNC_API_ACTION_BADGE_CONFIG, resolveAsyncApiActionBadge } from "../src/utils/async-api/action-badge-config"
import { OPENAPI_HTTP_METHOD_BADGE_CONFIG, resolveHttpMethodBadge } from "../src/utils/openapi/http-method-badge-config"
import { OPENAPI_RESPONSE_CODE_TONE_CLASSES, resolveResponseCodeToneClass } from "../src/utils/openapi/response-code-tone"

const COLORS_DIR = resolve(__dirname, "../src/components/shared-styles/colors")

/** Declarations of the rule whose selector list contains `selector` exactly (CSS is read as text: jest has no CSS loader). */
function takeDeclarations(cssFile: string, selector: string): Record<string, string> {
  const css = readFileSync(resolve(COLORS_DIR, cssFile), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
  const rule = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .find(([, selectors]) => selectors.split(",").map(value => value.trim()).includes(selector))
  if (!rule) {
    throw new Error(`${cssFile}: no rule for ${selector}`)
  }
  return Object.fromEntries(rule[2].split(";").map(value => value.trim()).filter(Boolean).map(declaration => {
    const [property, ...rest] = declaration.split(":")
    return [property.trim(), rest.join(":").trim().toUpperCase()]
  }))
}

describe("OpenAPI viewer config", () => {
  describe("section order", () => {
    it.each(Object.keys(OPENAPI_SECTION_ORDER) as Array<keyof typeof OPENAPI_SECTION_ORDER>)(
      "%s order is a permutation of the allowed ids",
      (level) => {
        const order = OPENAPI_SECTION_ORDER[level]
        expect(new Set(order).size).toBe(order.length)
        expect([...order].sort()).toEqual([...OPENAPI_SECTION_IDS_BY_LEVEL[level]].sort())
      },
    )

    it("keeps response extensions after Headers and before Body", () => {
      const order = OPENAPI_SECTION_ORDER.response
      expect(order.indexOf("responseHeaders")).toBeLessThan(order.indexOf("responseExtensions"))
      expect(order.indexOf("responseExtensions")).toBeLessThan(order.indexOf("responseBody"))
    })
  })

  describe("response code tone", () => {
    it.each([
      [OpenApiResponseCodeClasses.INFORMATIONAL, "openapi-response-code_1xx"],
      [OpenApiResponseCodeClasses.SUCCESS, "openapi-response-code_2xx"],
      [OpenApiResponseCodeClasses.REDIRECTION, "openapi-response-code_3xx"],
      [OpenApiResponseCodeClasses.CLIENT_ERROR, "openapi-response-code_4xx"],
      [OpenApiResponseCodeClasses.SERVER_ERROR, "openapi-response-code_5xx"],
      [OpenApiResponseCodeClasses.DEFAULT, undefined],
      [OpenApiResponseCodeClasses.UNKNOWN, undefined],
      [undefined, undefined],
    ])("%s -> %s", (codeClass, toneClass) => {
      expect(resolveResponseCodeToneClass(codeClass)).toBe(toneClass)
    })

    // [code class, selected background, selected text, hovered background, text of untouched / hovered]
    it.each<[OpenApiResponseCodeClass, string, string, string, string]>([
      [OpenApiResponseCodeClasses.INFORMATIONAL, "#9B7BF7", "#FFFFFF", "#ECE6FE", "#9B7BF7"],
      [OpenApiResponseCodeClasses.SUCCESS, "#00BB5B", "#FFFFFF", "#D0FAD4", "#00BB5B"],
      [OpenApiResponseCodeClasses.REDIRECTION, "#4FC0F8", "#FFFFFF", "#D6F2FE", "#4FC0F8"],
      [OpenApiResponseCodeClasses.CLIENT_ERROR, "#FFB02E", "#FFFFFF", "#FFF4CC", "#FFB02E"],
      [OpenApiResponseCodeClasses.SERVER_ERROR, "#FF636F", "#FFFFFF", "#FFC8C1", "#FF5260"],
    ])("%s colors", (codeClass, selectedBackground, selectedText, hoveredBackground, text) => {
      const option = `button.button-selector-option.${OPENAPI_RESPONSE_CODE_TONE_CLASSES[codeClass]}`
      expect(takeDeclarations("openapi.css", option)).toMatchObject({ "background-color": "TRANSPARENT", color: text })
      expect(takeDeclarations("openapi.css", `${option}:hover`)).toMatchObject({ "background-color": hoveredBackground, color: text })
      expect(takeDeclarations("openapi.css", `${option}.selected`)).toMatchObject({ "background-color": selectedBackground, color: selectedText })
    })
  })

  describe("HTTP method badge", () => {
    it("is case-insensitive and upper-cases the text", () => {
      expect(resolveHttpMethodBadge("Post")).toEqual({ text: "POST", colorClass: OPENAPI_HTTP_METHOD_BADGE_CONFIG.post.colorClass })
    })

    it.each([
      ["get", "#00BB5B"],
      ["post", "#4FC0F8"],
      ["delete", "#FF5260"],
      ["patch", "#FFB02E"],
      ["put", "#FFB02E"],
    ])("paints %s %s", (method, background) => {
      expect(takeDeclarations("openapi.css", `.${resolveHttpMethodBadge(method).colorClass}`)).toEqual({ "background-color": background })
    })

    it("defines a color for every configured class", () => {
      for (const { colorClass } of Object.values(OPENAPI_HTTP_METHOD_BADGE_CONFIG)) {
        expect(takeDeclarations("openapi.css", `.${colorClass}`)["background-color"]).toMatch(/^#[0-9A-F]{6}$/)
      }
    })

    it("falls back to the default color for an unknown method", () => {
      expect(resolveHttpMethodBadge("query").colorClass).toBe(OPENAPI_HTTP_METHOD_BADGE_CONFIG.DEFAULT.colorClass)
    })
  })
})

describe("AsyncAPI action badge", () => {
  it("upper-cases the text and maps the action to its class", () => {
    expect(resolveAsyncApiActionBadge("send")).toEqual({ text: "SEND", colorClass: ASYNC_API_ACTION_BADGE_CONFIG.send.colorClass })
  })

  it("defines a color for every configured class", () => {
    for (const { colorClass } of Object.values(ASYNC_API_ACTION_BADGE_CONFIG)) {
      expect(takeDeclarations("async-api.css", `.${colorClass}`)["background-color"]).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it("leaves an unknown action without a background class", () => {
    expect(resolveAsyncApiActionBadge("publish")).toEqual({ text: "PUBLISH", colorClass: "" })
  })
})

describe("Icon buttons (scroll-strip arrows, three-dots trigger)", () => {
  // docs/design/shared/features/arrow-scroll-strip.md -> "Arrow button styles"
  it("keeps the specified colors and radius as variables of one rule", () => {
    expect(takeDeclarations("icon-buttons.css", ".icon-button")).toEqual({
      "--icon-button-color": "#0068FF",
      "--icon-button-hover-background": "#ECEDEF",
      "--icon-button-hover-color": "#0068FF",
      "--icon-button-disabled-color": "#353C4E",
      "--icon-button-radius": "6PX",
    })
  })

  it("paints every state from the variables only", () => {
    expect(takeDeclarations("icon-buttons.css", "button.icon-button")).toMatchObject({
      "background-color": "TRANSPARENT",
      color: "VAR(--ICON-BUTTON-COLOR)",
      "border-radius": "VAR(--ICON-BUTTON-RADIUS)",
    })
    expect(takeDeclarations("icon-buttons.css", "button.icon-button:hover:enabled")).toEqual({
      "background-color": "VAR(--ICON-BUTTON-HOVER-BACKGROUND)",
      color: "VAR(--ICON-BUTTON-HOVER-COLOR)",
    })
    expect(takeDeclarations("icon-buttons.css", "button.icon-button:disabled")).toMatchObject({
      color: "VAR(--ICON-BUTTON-DISABLED-COLOR)",
    })
  })
})
