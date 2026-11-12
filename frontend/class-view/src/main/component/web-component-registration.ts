let counter = 0

export function registerWebComponent(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void {
    // for HMR support only
  let uniqueSuffix = ''
    if (window.customElements.get(name)) {
      uniqueSuffix = (counter++).toString()
    }
  window.customElements.define(name + uniqueSuffix, constructor, options)
}
