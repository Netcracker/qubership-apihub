import { FC, memo, ReactElement } from "react";

type OneSideLayoutProps = {
  content: ReactElement | null
}

export const OneSideLayout: FC<OneSideLayoutProps> = memo<OneSideLayoutProps>((props) => {
  const { content } = props
  return (
    <div className="flex flex-row w-full">
      {content}
    </div>
  )
})
