import React from "react";
import { FC, PropsWithChildren, ReactNode } from "react";

type WrapperProps = {
  wrapper?: FC<PropsWithChildren>
  children?: ReactNode[]
}

const DEFAULT_WRAPPER: FC<PropsWithChildren> = ({ children }) => <>{children}</>

export const Wrapper: FC<WrapperProps> = (props) => {
  const {
    wrapper: WrapperInternal = DEFAULT_WRAPPER,
    children = []
  } = props

  if (children.length < 2) {
    return <>{children[0]}</>
  }
  return (
    <WrapperInternal>
      {children.map((child, i) => (
        <React.Fragment key={i}>
          {child}
        </React.Fragment>
      ))}
    </WrapperInternal>
  )
}

export class DefaultWrappers {
  public static readonly DivGap2: FC<PropsWithChildren> = ({ children }) => (
    <div className="flex flex-row items-start gap-2">
      {children}
    </div>
  )
}
