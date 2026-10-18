import React, { FC, memo, useContext, useMemo } from 'react';
import { useChangeSeverityFilters } from "@stoplight/elements/containers/ChangeSeverityFiltersContext";

export type DiffSide = 'before' | 'after' | 'undefined';

export type DiffContextType = {
  side: DiffSide;
  containerElement: HTMLDivElement | null;
} | null;

const DiffContext = React.createContext<DiffContextType>(null);

const defaultDiffContext = {
  side: 'undefined' as DiffSide,
  containerElement: null
};
export const useDiffContext = () => useContext(DiffContext) ?? defaultDiffContext;

export const DiffContextProvider: FC<DiffContextType> = memo(
  value => {
    const { side, containerElement, children } = value;
    const filters = useChangeSeverityFilters()
    // eslint-disable-next-line
    const diffContextValue = useMemo(
      () => ({ side, containerElement, filters }),
      [side, containerElement, filters]
    );
    // eslint-disable-next-line
    return <DiffContext.Provider value={diffContextValue}>{children}</DiffContext.Provider>;
  },
  (prevProps, nextProps) => prevProps === nextProps,
);
