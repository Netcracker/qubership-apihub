export const CREATE_CUSTOM_SERVER_EVENT = 'create-custom-server'
export const createCustomServer = new CustomEvent(CREATE_CUSTOM_SERVER_EVENT, {
  composed: true,
  bubbles: true,
})

export const DELETE_CUSTOM_SERVER_EVENT = 'delete-custom-server'
export const deleteCustomServer = (server: { url: string }) =>
  new CustomEvent(DELETE_CUSTOM_SERVER_EVENT, {
    detail: server,
    composed: true,
    bubbles: true,
  })

export const SELECT_CREATED_CUSTOM_SERVER = 'select-created-custom-server'
export const selectCustomServer = (server: { url: string }) =>
  new CustomEvent(SELECT_CREATED_CUSTOM_SERVER, {
    detail: server,
    composed: true,
    bubbles: true,
  })

export const OPEN_FULLSCREEN_EXAMPLES_POPUP = 'open-fullscreen-examples-popup'
export const openFullscreenExamplesPopup = new CustomEvent(OPEN_FULLSCREEN_EXAMPLES_POPUP, {
  composed: true,
  bubbles: true,
})
