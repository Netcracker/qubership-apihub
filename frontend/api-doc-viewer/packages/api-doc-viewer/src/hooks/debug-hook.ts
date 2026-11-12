import { useEffect } from 'react'

export function useLogRenderCompleted() {
  useEffect(() => {
    console.debug('operation-viewer:ok')
  }, [])
}