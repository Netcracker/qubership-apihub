import { cn } from "@apihub/utils/common/cn";
import { FC, memo, ReactElement } from "react";

type OneSideLayoutProps = {
  content: ReactElement | null
}

export const OneSideLayout: FC<OneSideLayoutProps> = memo<OneSideLayoutProps>((props) => {
  const { content } = props
  return (
    // `one-side-layout`: a style hook only (no rules of its own) - e.g. the indent of collapsible
    // OpenAPI section content.
    <div className={cn("one-side-layout flex flex-row w-full")}>
      {content}
    </div>
  )
})
