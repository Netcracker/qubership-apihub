import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { useLevelContext } from "@apihub/contexts/LevelContext"
import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { useMemo } from "react"

export function useEffectiveLevel(layoutSide: LayoutSide): number {
  const syncLevelContext = useLevelContext()
  const asyncLevelContext = useAsyncLevelContext()
  return useMemo(() => {
    if (asyncLevelContext) {
      return layoutSide === ORIGIN_LAYOUT_SIDE ? asyncLevelContext.beforeLevel : asyncLevelContext.afterLevel
    }
    return syncLevelContext
  }, [layoutSide, syncLevelContext, asyncLevelContext])
}
