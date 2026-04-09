import { FC, PropsWithChildren } from "react";

export const Aligner: FC<PropsWithChildren> = (props) => {
  const { children } = props

  return (
    <div className='-ml-2'>
      {children}
    </div>
  )
}