import { DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"

/**
 * Reduces `baseLevel` by 1 (clamped to >= 0) on the side where `reductionAction`-described
 * content is absent (add -> origin; remove -> changed); returns `baseLevel` unchanged otherwise
 * (including when `reductionAction` is undefined).
 */
export function applyLevelReduction(
  baseLevel: number,
  layoutSide: LayoutSide,
  reductionAction: typeof DiffAction.add | typeof DiffAction.remove | undefined,
): number {
  if (!reductionAction) {
    return baseLevel
  }
  const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE
  const reduceThisSide = reductionAction === DiffAction.add ? isOrigin : !isOrigin
  return reduceThisSide ? Math.max(baseLevel - 1, 0) : baseLevel
}
