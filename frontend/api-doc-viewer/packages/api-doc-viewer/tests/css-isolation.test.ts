import postcss from "postcss"
import { resolve } from "path"
import { FONT_FAMILY_INTER, FONT_FAMILY_INTER_NAME } from "../src/consts/fonts"
import { CSS_CLASS_PREFIX as RUNTIME_PREFIX } from "../src/utils/common/cn"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cssIsolation = require("../postcss/css-isolation.cjs")

const SRC_DIR = resolve(__dirname, "../src")
const ROOT = ":where(.api-doc-viewer-root)"
const SCOPE = ":where(.api-doc-viewer-root, .api-doc-viewer-root *)"

function isolate(css: string, from: string = resolve(SRC_DIR, "sample.css")): string {
  return postcss([cssIsolation({ include: [SRC_DIR], fontFamilies: ["Inter", "Inter Semi Bold"] })])
    .process(css, { from })
    .css
}

describe("css-isolation PostCSS plugin", () => {
  it("uses the same prefix as cn()", () => {
    expect(cssIsolation.CSS_CLASS_PREFIX).toBe(RUNTIME_PREFIX)
  })

  it("prefixes every class selector, including escaped Tailwind classes and classes in pseudo arguments", () => {
    expect(isolate(".flex{} .hover\\:bg-x:hover{} .-mt-1{} .\\!mt-0{} .min-w-\\[16px\\]{}")).toBe(
      ".api-doc-viewer-flex{} .api-doc-viewer-hover\\:bg-x:hover{} .api-doc-viewer--mt-1{} " +
      ".api-doc-viewer-\\!mt-0{} .api-doc-viewer-min-w-\\[16px\\]{}",
    )
    expect(isolate(".group:hover .group-hover\\:x, button.selected:not(.disabled){}")).toBe(
      ".api-doc-viewer-group:hover .api-doc-viewer-group-hover\\:x, " +
      "button.api-doc-viewer-selected:not(.api-doc-viewer-disabled){}",
    )
  })

  it("does not prefix an already prefixed class", () => {
    expect(isolate(".api-doc-viewer-root{}")).toBe(".api-doc-viewer-root{}")
  })

  it("maps document-root selectors to the viewer root", () => {
    expect(isolate(":root{} html, :host{} body{}")).toBe(`${ROOT}{} ${ROOT}, ${ROOT}{} ${ROOT}{}`)
  })

  it("scopes other class-less selectors to the viewer root and its descendants", () => {
    expect(isolate("ul{} a:hover{} [data-precededby=\"x\"]{} ul ul{}")).toBe(
      `ul${SCOPE}{} a:hover${SCOPE}{} [data-precededby="x"]${SCOPE}{} ul${SCOPE} ul{}`,
    )
  })

  it("inserts the scope before pseudo-elements", () => {
    expect(isolate("*, ::before, ::after{} ::backdrop{} p:first-line{}")).toBe(
      `*${SCOPE}, ${SCOPE}::before, ${SCOPE}::after{} ${SCOPE}::backdrop{} p${SCOPE}:first-line{}`,
    )
  })

  it("scopes a selector whose classes are only inside :not()", () => {
    expect(isolate("a:not(.x){}")).toBe(`a:not(.api-doc-viewer-x)${SCOPE}{}`)
  })

  it("keeps combinator spacing", () => {
    expect(isolate("ul > li{} ol  li{}")).toBe(`ul${SCOPE} > li{} ol${SCOPE}  li{}`)
  })

  it("scopes rules nested in at-rules and leaves keyframe selectors alone", () => {
    expect(isolate("@media (prefers-color-scheme: light){:root{color:red} button{color:red}}")).toBe(
      `@media (prefers-color-scheme: light){${ROOT}{color:red} button${SCOPE}{color:red}}`,
    )
    expect(isolate("@keyframes pulse{from{opacity:1}50%{opacity:.5}} .x{animation: pulse 2s infinite}")).toBe(
      "@keyframes api-doc-viewer-pulse{from{opacity:1}50%{opacity:.5}} " +
      ".api-doc-viewer-x{animation: api-doc-viewer-pulse 2s infinite}",
    )
  })

  it("renames the configured font families and keeps local() font names", () => {
    expect(isolate(
      "@font-face{font-family:'Inter';src:local('Inter'),url(a.ttf)} .x{font-family: Inter, system-ui, sans-serif} " +
      ".y{font-family: \"Inter Semi Bold\", sans-serif} .z{font-family: inherit}",
    )).toBe(
      "@font-face{font-family:\"api-doc-viewer Inter\";src:local('Inter'),url(a.ttf)} " +
      ".api-doc-viewer-x{font-family: \"api-doc-viewer Inter\", system-ui, sans-serif} " +
      ".api-doc-viewer-y{font-family: \"api-doc-viewer Inter Semi Bold\", sans-serif} " +
      ".api-doc-viewer-z{font-family: inherit}",
    )
  })

  it("renames Inter to the family that FONT_FAMILY_INTER_NAME / FONT_FAMILY_INTER name", () => {
    expect(isolate(".x{font-family: Inter}")).toBe(`.api-doc-viewer-x{font-family: ${FONT_FAMILY_INTER}}`)
    expect(FONT_FAMILY_INTER).toBe(`"${FONT_FAMILY_INTER_NAME}"`)
  })

  it("leaves stylesheets outside the included directories untouched", () => {
    const css = ".flex{} ul{} @font-face{font-family:'Inter'}"
    expect(isolate(css, resolve(__dirname, "../node_modules/some-dependency/style.css"))).toBe(css)
  })
})
