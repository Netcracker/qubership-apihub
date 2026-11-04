import { useContext, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { MAX_NOTE_CHARS } from '../../board/notes.ts';
import { NotesContext, PrNameContext } from '../../context.ts';
import { sidePanelStyle, usePopover } from '../../hooks/usePopover.ts';
import { renderMarkdown } from '../../markdown.ts';
import { pullRequestKey } from '../../model/report.ts';
import type { DerivedPullRequest } from '../../types.ts';

const NOTE_PANEL_PX = 560;
const NOTE_PANEL_STYLE = sidePanelStyle(NOTE_PANEL_PX);

// The note icon in the Pull request cell (NOTE-3): shown on hover, and always once the PR has a note.
export function NoteButton({ pr }: { pr: DerivedPullRequest }) {
  const { notes } = useContext(NotesContext);
  const prName = useContext(PrNameContext);
  const { open, ref, toggle } = usePopover(NOTE_PANEL_PX);
  const key = pullRequestKey(pr);
  const note = notes[key];
  return (
    <span className="note-wrap" ref={ref}>
      <button type="button" className={'note-icon' + (note ? ' has-note' : '')} aria-expanded={open}
        aria-label={(note ? 'Notes' : 'Add a note') + ' for ' + prName} title={note ? 'Your notes' : 'Add a note'}
        onClick={toggle}>✎</button>
      {open ? <NotePanel pr={pr} prKey={key} text={note ? note.text : ''} onClose={toggle} /> : null}
    </span>
  );
}

// One Markdown document (NOTE-4): Preview renders it like a comment, Edit changes it. The text is saved on blur, on
// Ctrl+Enter, on switching to Preview, and when the panel closes.
function NotePanel({ pr, prKey, text, onClose }: {
  pr: DerivedPullRequest;
  prKey: string;
  text: string;
  onClose: (event: MouseEvent<HTMLElement>) => void;
}) {
  const { update, saveFailed } = useContext(NotesContext);
  const prName = useContext(PrNameContext);
  const [editing, setEditing] = useState(!text);
  const [draft, setDraft] = useState(text);
  const draftRef = useRef(draft);
  const saved = useRef(text);
  useEffect(() => { draftRef.current = draft; });
  const commit = () => {
    if (draftRef.current === saved.current) return;
    saved.current = draftRef.current;
    update(prKey, draftRef.current);
  };
  const commitRef = useRef(commit);
  useEffect(() => { commitRef.current = commit; });
  // Closing with Escape or a click outside unmounts the field without a blur, so the draft is saved here too.
  useEffect(() => () => commitRef.current(), []);

  return (
    <div className="popover note-panel" role="dialog" aria-label={'Notes for ' + prName} style={NOTE_PANEL_STYLE}>
      <div className="panel-head">
        <strong className="popover-title">Notes · {prName}</strong>
        <div className="segmented" role="group" aria-label="Note mode">
          <button type="button" aria-pressed={!editing} onClick={() => { commit(); setEditing(false); }}>Preview</button>
          <button type="button" aria-pressed={editing} onClick={() => setEditing(true)}>Edit</button>
        </div>
        <button type="button" className="btn icon-only" aria-label="Close" onClick={onClose}>×</button>
      </div>
      {editing ? (
        <textarea className="text-field note-editor" value={draft} autoFocus aria-label="Note in Markdown" maxLength={MAX_NOTE_CHARS}
          placeholder={'What was done or promised. Markdown works: ## headings, - [ ] tasks, links.'}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) commit(); }} />
      ) : draft.trim() ? (
        // Sanitized by DOMPurify in renderMarkdown, like comments (SEC-4).
        <div className="note-preview markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) }} />
      ) : <p className="muted">No note yet. Switch to Edit to write one.</p>}
      {saveFailed ? <p className="note-foot note-error" role="alert">Not saved: this browser's storage is full or blocked.</p>
        : <p className="muted note-foot">Kept in this browser only.</p>}
    </div>
  );
}
