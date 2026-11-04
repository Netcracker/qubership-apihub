// Matches the requirement ids in docs/requirements/ with the ids that test titles name, so a requirement without a
// test, or a test that names a removed requirement, fails the check.

// A requirement is defined where its bold id starts a bullet or a table row.
const DEFINITION = /^(?:- |\| )\*\*([A-Z]+-\d+)\*\*(.*)$/gm;
// Tests name ids at the start of their title, in any kind of quotes: test('DATA-5 DATA-16: ...').
const TEST_TITLE = /\btest\(\s*['"`]((?:[A-Z]+-\d+[ ,]*)+):/g;
const ID = /[A-Z]+-\d+/g;
const PLANNED = '*Planned';
const MANUAL = '*Manual check';
// A removed requirement keeps its id (the conventions in docs/requirements/README.md) and needs no test.
const REMOVED = '*Removed';

export interface RequirementCheck {
  covered: string[];
  // No test and not marked as planned or manual.
  missing: string[];
  planned: string[];
  manual: string[];
  removed: string[];
  // Tests that still name a removed requirement.
  stale: { id: string; file: string }[];
  unknown: { id: string; file: string }[];
  // Ids defined more than once, which would make one definition hide the other.
  duplicate: string[];
}

// A definition is its line and the indented lines that continue the same bullet; markers are looked for only there.
function definitions(text: string): [string, string][] {
  return [...text.matchAll(DEFINITION)].map((match) => {
    const rest = text.slice(match.index + match[0].length).split('\n').slice(1);
    const stop = rest.findIndex((line) => !line.startsWith('  '));
    const continued = stop < 0 ? rest : rest.slice(0, stop);
    return [match[1], [match[0], ...continued].join('\n')];
  });
}

export function checkRequirements(specFiles: Record<string, string>, testFiles: Record<string, string>): RequirementCheck {
  const defined = new Map<string, string>();
  const duplicate: string[] = [];
  for (const text of Object.values(specFiles)) {
    for (const [id, body] of definitions(text)) {
      if (defined.has(id)) duplicate.push(id);
      defined.set(id, body);
    }
  }
  const named = new Set<string>();
  const unknown: { id: string; file: string }[] = [];
  const stale: { id: string; file: string }[] = [];
  for (const [file, text] of Object.entries(testFiles)) {
    for (const title of text.matchAll(TEST_TITLE)) {
      for (const [id] of title[1].matchAll(ID)) {
        if (!defined.has(id)) unknown.push({ id, file });
        else if (defined.get(id)!.includes(REMOVED)) stale.push({ id, file });
        else named.add(id);
      }
    }
  }
  const result: RequirementCheck = { covered: [], missing: [], planned: [], manual: [], removed: [], stale, unknown, duplicate };
  const order = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });
  for (const [id, body] of [...defined].sort(([a], [b]) => order(a, b))) {
    if (body.includes(REMOVED)) result.removed.push(id);
    else if (named.has(id)) result.covered.push(id);
    else if (body.includes(PLANNED)) result.planned.push(id);
    else if (body.includes(MANUAL)) result.manual.push(id);
    else result.missing.push(id);
  }
  return result;
}
