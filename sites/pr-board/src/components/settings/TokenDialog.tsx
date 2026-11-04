import { useState } from 'react';
import { useModal } from '../../hooks/useModal.ts';
import { SETTINGS_BUTTON_ID, TOKEN_HELP_URL } from '../common/ids.ts';

// Explains how to create a token and takes it (SET-18). There is no <form>, so browsers do not offer to save the token
// as a password and sync it outside this browser. A click outside does not close it, as with the setup wizard: a stray
// click would count as Not now and keep it from opening again until a reload.
export function TokenDialog({ onSave, onClose }: { onSave: (token: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const { ref, onKeyDown } = useModal(onClose, SETTINGS_BUTTON_ID);
  const save = () => { if (draft.trim()) onSave(draft.trim()); };

  return (
    <div className="dialog-backdrop">
      <div className="token-dialog" role="dialog" aria-modal="true" aria-labelledby="token-dialog-title" ref={ref} onKeyDown={onKeyDown}>
        <h2 id="token-dialog-title">Add a GitHub token</h2>
        <p>The board reads pull requests from GitHub with your own token. It stays in this browser and is sent only to
          api.github.com.</p>
        <ol>
          <li>Open <a href={TOKEN_HELP_URL} target="_blank" rel="noopener">Create a fine-grained token</a> on GitHub.</li>
          <li>Give it any name and expiry.</li>
          <li>Under <strong>Repository access</strong>, choose <strong>Public repositories (read-only)</strong>. No other
            permissions are needed.</li>
          <li>Click <strong>Generate token</strong> and copy the value that starts with <code>github_pat_</code>.</li>
        </ol>
        <label htmlFor="token-dialog-input">Token</label>
        <input id="token-dialog-input" type="password" autoComplete="off" autoFocus placeholder="github_pat_…" value={draft}
          onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') save(); }} />
        <div className="actions">
          <button type="button" className="btn primary" disabled={!draft.trim()} onClick={save}>Save and load</button>
          <button type="button" className="btn" onClick={onClose}>Not now</button>
        </div>
      </div>
    </div>
  );
}
