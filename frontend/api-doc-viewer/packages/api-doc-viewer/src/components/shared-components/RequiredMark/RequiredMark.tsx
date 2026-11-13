import { cn } from "@apihub/utils/common/cn"
import { FC } from "react"

/**
 * The red `*` after a required item's name (OpenAPI Body title, security scope rows). Presentational:
 * whether to show it comes from the data layer (`OpenApiRowDiffs.RequestBody.isRequiredStarVisibleOnSide`,
 * `SecurityScopeRow`).
 */
export const RequiredMark: FC = () => <sup className={cn("ml-0.5 text-red-500")}>*</sup>
