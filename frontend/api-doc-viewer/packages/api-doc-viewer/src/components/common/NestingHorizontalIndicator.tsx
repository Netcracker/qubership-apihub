import { FC } from 'react';

export const NestingHorizontalIndicator: FC<{ short?: boolean; }> = (props) => {
  const { short = false } = props;
  return (
    <div className="bg-slate-400 h-px" style={{ width: short ? 4 : 16 }}>
    </div>
  );
};
