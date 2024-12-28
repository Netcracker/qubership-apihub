export const CREATE_CUSTOM_SERVICE_EVENT = 'createCustomService'
export const createCustomService = new CustomEvent(CREATE_CUSTOM_SERVICE_EVENT, {
  composed: true,
  bubbles: true,
})

export const OPEN_FULLSCREEN_EXAMPLES_POPUP = 'openFullscreenExamplesPopup'
export const openFullscreenExamplesPopup = new CustomEvent(OPEN_FULLSCREEN_EXAMPLES_POPUP, {
  composed: true,
  bubbles: true,
})
