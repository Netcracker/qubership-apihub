import { cn } from '@apihub/utils/common/cn';
import { FC } from 'react';

export const NestingHorizontalIndicator: FC<{ short?: boolean; }> = (props) => {
  const { short = false } = props;
  return (
    <div className={cn("bg-slate-400 h-px")} style={{ width: short ? 4 : 16 }}>
    </div>
  );
};
