import type { StateInfo } from '../../board/states.ts';

// A status code that opens nothing, such as OK or P. role="img" lets the full name reach screen readers; a plain span
// cannot carry a name (QUAL-1).
export function Pill({ state }: { state: StateInfo }) {
  const tooltip = state.label + (state.hint ? ': ' + state.hint : '');
  return <span className={'pill short ' + state.tone} role="img" title={tooltip} aria-label={state.label}>{state.short}</span>;
}
