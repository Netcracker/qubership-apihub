import { AUTHOR_GROUPS, authorsSummary, chosenAuthorGroups, toggleAuthor } from '../../board/authors.ts';
import type { AuthorEntry } from '../../board/authors.ts';
import { displayLogin } from '../../board/format.ts';
import type { AuthorsFilter } from '../../board/view.ts';
import { GHOST_LOGIN } from '../../types.ts';
import { Avatar } from '../common/Avatar.tsx';
import { MenuButton } from '../common/MenuButton.tsx';

export function AuthorMenu({ authors, selected, mode, setAuthors, viewer }: {
  authors: AuthorEntry[];
  selected: Set<string>;
  mode: AuthorsFilter;
  setAuthors: (value: AuthorsFilter) => void;
  viewer: string;
}) {
  const summary = authorsSummary(mode, selected);
  const toggle = (login: string) => setAuthors(toggleAuthor(login, selected, authors, mode));
  const group = (title: string, list: AuthorEntry[]) => list.length ? (
    <>
      <div className="group">{title}</div>
      {list.map((a) => (
        <label key={a.login} className="author-option">
          <input type="checkbox" checked={selected.has(a.login)} onChange={() => toggle(a.login)} />
          <Avatar actor={a.actor} small />
          <span>{a.actor ? displayLogin(a.actor) : GHOST_LOGIN}</span>
          <span className="n">{a.count}</span>
        </label>
      ))}
    </>
  ) : null;

  return (
    <MenuButton label="Authors" summary={summary}>
      {() => (
        <>
          <div className="actions">
            <button type="button" className="btn" disabled={!viewer} aria-pressed={mode === 'me'}
              title={viewer ? 'Show pull requests opened by ' + viewer : 'Load live data with your token to identify your pull requests'}
              onClick={() => setAuthors('me')}>Me</button>
            <button type="button" className="btn" onClick={() => setAuthors(null)}>People</button>
            <button type="button" className="btn" onClick={() => setAuthors('bots')}>Bots</button>
            <button type="button" className="btn" onClick={() => setAuthors('all')}>Everyone</button>
            <button type="button" className="btn" onClick={() => setAuthors([])}>Clear</button>
          </div>
          <div role="group" aria-label="Author categories">
            {AUTHOR_GROUPS.map(([id, label]) => (
              <label key={id}>
                <input type="checkbox" checked={chosenAuthorGroups(mode).includes(id)} onChange={() => {
                  const chosen = chosenAuthorGroups(mode);
                  setAuthors({ groups: chosen.includes(id) ? chosen.filter((group) => group !== id) : [...chosen, id] });
                }} />
                {label}
              </label>
            ))}
          </div>
          {group('People', authors.filter((a) => !a.bot))}
          {group('Bots', authors.filter((a) => a.bot))}
        </>
      )}
    </MenuButton>
  );
}
