import { useContext } from 'react';
import { plural } from '../../board/format.ts';
import { PrNameContext } from '../../context.ts';
import { usePopover } from '../../hooks/usePopover.ts';

const ATTENTION_POPOVER_PX = 300;

export function AttentionBadge({ reasons }: { reasons: string[] }) {
  const prName = useContext(PrNameContext);
  const { open, position, ref, toggle } = usePopover(ATTENTION_POPOVER_PX);
  const label = plural(reasons.length, 'problem');
  return (
    <div className="attn" ref={ref}>
      <button type="button" className="attn-icon" aria-expanded={open} aria-label={prName + ': ' + label}
        title={reasons.join('\n')} onClick={toggle}>
        <span aria-hidden="true">!</span>{reasons.length > 1 ? <span className="attn-count">{reasons.length}</span> : null}
      </button>
      {open ? (
        <div className="popover attn-popover" role="dialog" aria-label={'Why ' + prName + ' needs attention'} style={position}>
          <strong className="popover-title">{label}</strong>
          <ul>{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
