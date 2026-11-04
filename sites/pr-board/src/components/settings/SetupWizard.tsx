import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { REVIEWER_PRESETS } from '../../board/reviewers.ts';
import type { ReviewerPreset } from '../../board/reviewers.ts';
import { useModal } from '../../hooks/useModal.ts';
import type { Settings } from '../../settings.ts';
import { SETTINGS_BUTTON_ID } from '../common/ids.ts';
import { ReviewCellPreview, ReviewerOrderPreview, ViewPreview } from './ViewPreview.tsx';

interface Choice {
  label: string;
  hint: string;
  picked: boolean;
  pick: () => void;
  preview: ReactNode;
}

// Walks through the look of the board with a picture for every choice (SET-21). Each choice applies at once, so the
// board behind the dialog changes with it.
export function SetupWizard({ settings, onChange, onClose }: { settings: Settings; onChange: (settings: Settings) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  // Focus returns to the Settings button when the wizard came from the panel, which closed.
  const { ref: dialog, onKeyDown } = useModal(onClose, SETTINGS_BUTTON_ID);
  // Each step starts on the card picked now.
  useEffect(() => {
    const picked = dialog.current && dialog.current.querySelector<HTMLElement>('.wizard-card[aria-pressed="true"]');
    if (picked) picked.focus();
  }, [step, dialog]);

  const { theme, density, reviewColumn, reviewerOrder, showLabels } = settings;
  // The other steps draw in the theme picked, or in light and dark when it follows the system.
  const shown = theme === 'system' ? 'split' : theme;
  const set = (change: Partial<Settings>) => onChange({ ...settings, ...change });
  const steps: { title: string; text: string; choices: Choice[] }[] = [
    {
      title: 'Theme',
      text: 'Pick the colors of the board.',
      choices: [
        { label: 'System', hint: 'Follows the light or dark setting of your system.', picked: theme === 'system', pick: () => set({ theme: 'system' }),
          preview: <ViewPreview theme="split" density={density} review={reviewColumn} labels={showLabels} /> },
        { label: 'Light', hint: 'Dark text on a light background.', picked: theme === 'light', pick: () => set({ theme: 'light' }),
          preview: <ViewPreview theme="light" density={density} review={reviewColumn} labels={showLabels} /> },
        { label: 'Dark', hint: 'Light text on a dark background.', picked: theme === 'dark', pick: () => set({ theme: 'dark' }),
          preview: <ViewPreview theme="dark" density={density} review={reviewColumn} labels={showLabels} /> },
      ],
    },
    {
      title: 'Row density',
      text: 'Pick how much room each pull request takes.',
      choices: [
        { label: 'Comfortable', hint: 'More space around each row.', picked: density === 'comfortable', pick: () => set({ density: 'comfortable' }),
          preview: <ViewPreview theme={shown} density="comfortable" review={reviewColumn} labels={showLabels} /> },
        { label: 'Compact', hint: 'More rows on the screen at once.', picked: density === 'compact', pick: () => set({ density: 'compact' }),
          preview: <ViewPreview theme={shown} density="compact" review={reviewColumn} labels={showLabels} /> },
      ],
    },
    {
      title: 'Review column',
      text: 'Pick how the Review column shows reviews.',
      choices: [
        { label: 'Code', hint: 'One short code per PR: ✓ approved, CR changes requested.', picked: reviewColumn === 'code',
          pick: () => set({ reviewColumn: 'code' }), preview: <ReviewCellPreview theme={shown} review="code" /> },
        { label: 'Reviewers', hint: 'Every reviewer with GitHub\'s icons; your own pending review stands out.', picked: reviewColumn === 'list',
          pick: () => set({ reviewColumn: 'list' }), preview: <ReviewCellPreview theme={shown} review="list" /> },
      ],
    },
    {
      title: 'Reviewers order',
      text: 'Pick who leads the list of reviewers, when the Review column lists them. Settings can order every group.',
      choices: [
        ...([
          ['changes', 'Changes first', 'Requested changes, then reviews not given yet; approvals last.'],
          ['waiting', 'Waiting first', 'Who still owes a review, then requested changes; approvals last.'],
          ['approved', 'Approvals first', 'How close the PR is to merging: approvals, then requested changes.'],
        ] as [ReviewerPreset, string, string][]).map(([preset, label, hint]) => ({
          label, hint, picked: reviewerOrder.join(',') === REVIEWER_PRESETS[preset].join(','),
          pick: () => set({ reviewerOrder: REVIEWER_PRESETS[preset] }),
          preview: <ReviewerOrderPreview theme={shown} order={REVIEWER_PRESETS[preset]} />,
        })),
      ],
    },
    {
      title: 'Labels',
      text: 'Pick whether labels show under the titles. Search finds them either way.',
      choices: [
        { label: 'Show', hint: 'Colored labels under each title and linked issue.', picked: showLabels, pick: () => set({ showLabels: true }),
          preview: <ViewPreview theme={shown} density={density} review={reviewColumn} labels /> },
        { label: 'Hide', hint: 'Shorter rows with titles alone.', picked: !showLabels, pick: () => set({ showLabels: false }),
          preview: <ViewPreview theme={shown} density={density} review={reviewColumn} labels={false} /> },
      ],
    },
  ];
  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    // A click outside does not close it: a stray click would end the first-visit wizard for good.
    <div className="dialog-backdrop">
      <div className="setup-wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title" ref={dialog} onKeyDown={onKeyDown}>
        <div className="wizard-top">
          <h2 id="wizard-title">Set up your board</h2>
          <span className="muted">Step {step + 1} of {steps.length}</span>
        </div>
        <h3>{current.title}</h3>
        <p className="muted">{current.text}</p>
        <div className={'wizard-choices n' + current.choices.length} role="group" aria-label={current.title}>
          {current.choices.map((choice) => {
            const hintId = 'wizard-hint-' + choice.label.toLowerCase().replace(/\W+/g, '-');
            return (
              <button key={choice.label} type="button" className="wizard-card" aria-pressed={choice.picked} onClick={choice.pick}
                aria-label={choice.label} aria-describedby={hintId}>
                {choice.preview}
                <strong>{choice.label}</strong>
                <span className="muted" id={hintId}>{choice.hint}</span>
              </button>
            );
          })}
        </div>
        <div className="wizard-foot">
          <span className="muted">You can change these later in Settings.</span>
          <button type="button" className="btn ghost" onClick={onClose}>Skip</button>
          {step > 0 ? <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button> : null}
          {last ? <button type="button" className="btn primary" onClick={onClose}>Done</button>
            : <button type="button" className="btn primary" onClick={() => setStep(step + 1)}>Next</button>}
        </div>
      </div>
    </div>
  );
}
