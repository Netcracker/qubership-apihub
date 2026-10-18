export async function enableMocking(): Promise<void> {
  const isMswEnabled = import.meta.env.DEV &&
    (import.meta.env.VITE_ENABLE_MSW === 'true' || localStorage.getItem('msw') === 'true')

  if (!isMswEnabled) {
    return
  }

  try {
    const { worker } = await import('./browser-worker')
    await worker.start({
      onUnhandledRequest: 'bypass',
    })
  } catch (error) {
    console.error('[MSW] Failed to register service worker:', error)
  }
}
