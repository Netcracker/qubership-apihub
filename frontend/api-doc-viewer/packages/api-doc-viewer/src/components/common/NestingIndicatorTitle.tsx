import { FC, PropsWithChildren } from "react"
import { NestingIndicatorTitleLabel } from "@apihub/components/shared-components/NestingIndicatorTitleRow/NestingIndicatorTitleLabel"

/** @deprecated Prefer `NestingIndicatorTitleRow` for layout-aware rows. */
export const NestingIndicatorTitle: FC<PropsWithChildren> = ({ children }) => {
  return <NestingIndicatorTitleLabel title={String(children ?? "")} />
}
