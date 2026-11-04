import { LEGEND, REVIEW } from '../../board/states.ts';
import { RulesButton } from './RulesButton.tsx';

export function LegendBar() {
  return (
    <footer className="legend-bar" aria-label="Legend">
      {LEGEND.map(([name, states]) => (
        <span key={name} className="legend-group">
          <span className="legend-name">{name}</span>
          {Object.values(states).map((st) => (
            <span key={st.label} className="legend-item">
              <span className={'pill short ' + st.tone}>{st.short}</span>{st.label}
            </span>
          ))}
          {states === REVIEW ? <span className="legend-item"><span className="pending">◷</span>pending reviewers</span> : null}
        </span>
      ))}
      <span className="legend-group">
        <span className="legend-name">Row</span>
        <span className="legend-item"><span className="stripe ci-failing"></span>CI failed</span>
        <span className="legend-item"><span className="stripe ci-running"></span>running</span>
        <span className="legend-item"><span className="stripe ci-passing"></span>passed</span>
      </span>
      <RulesButton />
    </footer>
  );
}
