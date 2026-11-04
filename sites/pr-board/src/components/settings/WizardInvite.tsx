// A small card on the first visit that offers the setup wizard instead of opening it, so the board shows first
// (SET-21). Either button answers it for good in this browser.
export function WizardInvite({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  return (
    <aside className="wizard-invite" aria-labelledby="wizard-invite-title">
      <strong id="wizard-invite-title">New here?</strong>
      <p>Take a short tour of how the board can look: theme, row density, the Review column, and labels.</p>
      <div className="actions">
        <button type="button" className="btn primary" onClick={onStart}>Take the tour</button>
        <button type="button" className="btn ghost" onClick={onDismiss}>Not now</button>
      </div>
    </aside>
  );
}
