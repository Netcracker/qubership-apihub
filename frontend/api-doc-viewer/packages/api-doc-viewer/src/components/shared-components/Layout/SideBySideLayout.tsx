import { cn } from "@apihub/utils/common/cn";
import { FC, memo, ReactElement } from "react";

type SideBySideLayoutProps = {
  left: ReactElement | null
  right: ReactElement | null
}

export const SideBySideLayout: FC<SideBySideLayoutProps> = memo<SideBySideLayoutProps>((props) => {
  const { left, right } = props
  return (
    // `side-by-side-layout`: a style hook only (no rules of its own) - e.g. frame.css widens framed
    // cards in diffs mode.
    <div className={cn("side-by-side-layout flex w-full flex-row items-stretch")}>
      <div className={cn("flex w-1/2")}>
        {left}
      </div>
      <div className={cn("flex w-1/2")}>
        {right}
      </div>
    </div>
  )
})
