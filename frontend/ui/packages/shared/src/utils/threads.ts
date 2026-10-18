export async function stopThread(message: string = 'Thread is stopped'): Promise<void> {
  await pauseThread(0, message)
}

export async function pauseThread(timeoutMs: number = 0, message: string = 'Thread is paused'): Promise<void> {
  await new Promise(resolve => {
    console.log(message)
    if (timeoutMs > 0) {
      setTimeout(() => {
        resolve(undefined)
      }, timeoutMs)
    }
  })
}
