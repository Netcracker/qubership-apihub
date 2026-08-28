import { FC, memo, ReactElement } from "react";

type SideBySideLayoutProps = {
  left: ReactElement | null
  right: ReactElement | null
}

export const SideBySideLayout: FC<SideBySideLayoutProps> = memo<SideBySideLayoutProps>((props) => {
  const { left, right } = props
  return (
    <div className="flex w-full flex-row items-stretch">
      <div className="flex w-1/2">
        {left}
      </div>
      <div className="flex w-1/2">
        {right}
      </div>
    </div>
  )
})
