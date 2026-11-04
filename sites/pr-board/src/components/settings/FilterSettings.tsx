import { useEffect, useRef, useState } from 'react';
import { AREAS, CRITERIA_FIELDS, DEFAULT_AREA_CRITERIA, areaCriteriaQuery, parseAreaCriteria } from '../../model/areas.ts';
import type { AreaCriteria, AreaCriteriaMap } from '../../model/areas.ts';
import type { AreaId } from '../../types.ts';

const FIELD_LABELS: Record<keyof AreaCriteria, string> = {
  labels: 'Labels', scopes: 'Title scopes', tags: 'Title tags',
  directories: 'Directories mentioned in titles', repositories: 'Repository names',
};

type Drafts = Record<AreaId, Record<keyof AreaCriteria, string>>;

function toDrafts(criteria: AreaCriteriaMap): Drafts {
  const fields = (id: AreaId) => ({
    labels: criteria[id].labels.join(', '), scopes: criteria[id].scopes.join(', '),
    tags: criteria[id].tags.join(', '), directories: criteria[id].directories.join(', '),
    repositories: criteria[id].repositories.join(', '),
  });
  return { be: fields('be'), fe: fields('fe') };
}

export function FilterSettings({ criteria, onChange }: {
  criteria: AreaCriteriaMap;
  onChange: (criteria: AreaCriteriaMap) => void;
}) {
  const [drafts, setDrafts] = useState(() => toDrafts(criteria));
  useEffect(() => setDrafts(toDrafts(criteria)), [criteria]);
  const commit = () => {
    const next = structuredClone(criteria);
    for (const { id } of AREAS) {
      for (const field of CRITERIA_FIELDS) next[id][field] = drafts[id][field].split(',').map((entry) => entry.trim());
    }
    const parsed = parseAreaCriteria(next);
    if (areaCriteriaQuery(parsed) !== areaCriteriaQuery(criteria)) onChange(parsed);
  };
  const flush = useRef(commit);
  flush.current = commit;
  useEffect(() => () => flush.current(), []);

  return (
    <section>
      <div className="section-head">
        <h2>Filter settings</h2>
        <button type="button" className="btn ghost" onClick={() => {
          setDrafts(toDrafts(DEFAULT_AREA_CRITERIA));
          onChange(structuredClone(DEFAULT_AREA_CRITERIA));
        }}>Reset filters</button>
      </div>
      <p className="hint">Separate values with commas. Empty lists disable a criterion. Any matching criterion selects
        the area; a pull request can match both. Customized filters travel in the page address.</p>
      {AREAS.map(({ id, label }) => (
        <fieldset key={id} className="area-criteria">
          <legend>{label}</legend>
          {CRITERIA_FIELDS.map((field) => (
            <div className="area-field" key={field}>
              <label className="stacked-field" htmlFor={'filter-' + id + '-' + field}>{label} {FIELD_LABELS[field].toLowerCase()}</label>
              <textarea id={'filter-' + id + '-' + field} className="text-field" rows={2}
                value={drafts[id][field]} onChange={(event) => setDrafts({ ...drafts,
                  [id]: { ...drafts[id], [field]: event.target.value } })}
                onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />
            </div>
          ))}
        </fieldset>
      ))}
      <p className="hint">Labels also accept module: names. Tags match bracketed text in PR or linked issue titles.
        Directories match mentions in those titles. Repository names use owner/name.</p>
    </section>
  );
}
