import { useContext } from 'react';
import { RulesContext } from '../../context.ts';
import { usePopover } from '../../hooks/usePopover.ts';
import { DEFAULT_RULES, TITLE_TYPES } from '../../model/rules.ts';
import { rulesAreDefault } from '../../settings.ts';
import { BUILD_DEFAULTS } from '../../config.ts';

const RULES_POPOVER_PX = 440;

export function RulesButton() {
  const { open, position, ref, toggle } = usePopover(RULES_POPOVER_PX);
  const rules = useContext(RulesContext);
  const custom = !rulesAreDefault(rules, BUILD_DEFAULTS.bots);
  return (
    <div className="legend-rules" ref={ref}>
      {custom ? <span className="chip custom" title="Your attention rules differ from the team defaults. Change them in Settings.">Custom rules</span> : null}
      <button type="button" className="legend-link" aria-expanded={open} onClick={toggle}>Rules</button>
      {open ? (
        <div className="popover rules-popover" role="dialog" aria-label="Board rules" style={position}>
          <strong className="popover-title">Attention</strong>
          <ul>
            {rules.checkTitle ? <li>The title does not follow Conventional Commits, <code>type(scope): subject</code> with type {TITLE_TYPES.join(', ')}.</li> : null}
            <li>The PR is open for more than {rules.staleDays} days.</li>
            {rules.requireIssue ? <li>The PR has no linked issue (the Development field) and is not added to a GitHub Project.</li> : null}
          </ul>
          {custom ? (
            <p className="muted">These are your rules from Settings. The team defaults are {DEFAULT_RULES.staleDays} days, with the
              title check {DEFAULT_RULES.checkTitle ? 'on' : 'off'} and the issue check {DEFAULT_RULES.requireIssue ? 'on' : 'off'}.</p>
          ) : null}
          <strong className="popover-title">How states are read</strong>
          <ul>
            <li>CI uses the overall check status of the last commit.</li>
            <li>Review shows Changes requested if any reviewer's latest decision asks for changes. A comment-only review does not cancel an approval.</li>
            <li>Conflicts shows Checking while GitHub is still computing mergeability.</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
