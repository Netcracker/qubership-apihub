import { FC, PropsWithChildren } from 'react';

export const NestingIndicatorTitle: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="text-xs text-slate-400 border-b border-slate-400 w-max pt-1"
      style={{ marginLeft: '-1px' }}
    >
      {children}
    </div>
  );
};
