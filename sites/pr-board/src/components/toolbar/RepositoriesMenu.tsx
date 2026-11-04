import { groupColor, groupsSummary } from '../../board/groups.ts';
import type { RepoGroup } from '../../board/groups.ts';
import { MenuButton } from '../common/MenuButton.tsx';

// The Repositories menu (FILTER-17): a checkbox per group from Settings, and Ungrouped. It shows only the rows of the
// checked groups. A group's entry has the tint its repository names show (TABLE-31).
export function RepositoriesMenu({ groups, options, checked, counts, setChecked }: {
  groups: RepoGroup[];
  options: string[];
  checked: string[];
  counts: Map<string, number>;
  setChecked: (checked: string[]) => void;
}) {
  const toggle = (name: string) => setChecked(checked.includes(name) ? checked.filter((n) => n !== name) : [...checked, name]);
  const title = (name: string) => {
    const group = groups.find((g) => g.name === name);
    return group ? group.repos.join(', ') : 'Repositories in no group';
  };
  return (
    <MenuButton label="Repositories" summary={groupsSummary(checked, options)}>
      {() => (
        <>
          <div className="actions">
            <button type="button" className="btn" onClick={() => setChecked(options)}>All</button>
            <button type="button" className="btn" onClick={() => setChecked([])}>None</button>
          </div>
          {options.map((name) => {
            const tint = groupColor(groups, name);
            return (
              <label key={name} title={title(name)} className={tint === null ? undefined : 'tinted'}
                style={tint === null ? undefined : { background: 'var(--group-' + tint + ')' }}>
                <input type="checkbox" checked={checked.includes(name)} onChange={() => toggle(name)} />
                <span>{name}</span>
                <span className="n">{counts.get(name) ?? ''}</span>
              </label>
            );
          })}
        </>
      )}
    </MenuButton>
  );
}
