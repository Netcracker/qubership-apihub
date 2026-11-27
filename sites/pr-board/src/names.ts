// Lists of names typed by people or read from the address: logins, repositories, labels, and group or priority names.
// GitHub compares logins and repository names without regard to case, so the helpers do too.

export function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Keeps the first of names that differ only in case.
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// The entries of a list separated by commas, spaces, or new lines, such as logins or repositories.
export function splitList(text: string): string[] {
  return text.split(/[\s,]+/).filter(Boolean);
}

// splitList without repeats, for the Settings fields of logins and labels.
export function parseList(text: string): string[] {
  return uniqueNames(splitList(text));
}

// Names that may hold spaces, such as priorities and group names, separated by commas only, trimmed, without repeats.
export function commaList(text: string): string[] {
  return uniqueNames(text.split(',').map((name) => name.trim()).filter(Boolean));
}
