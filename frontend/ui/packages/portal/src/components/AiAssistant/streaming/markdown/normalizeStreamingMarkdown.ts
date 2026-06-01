/**
 * Preprocess streaming assistant markdown so unfinished fenced blocks do not leak raw ``` lines (UI req 6.2).
 * Completed messages should pass through unchanged.
 */
export function normalizeStreamingMarkdown(markdown: string): string {
  if (!markdown) {
    return markdown
  }

  const lines = markdown.split('\n')
  let fenceDepth = 0

  for (const line of lines) {
    if (isFenceDelimiterLine(line)) {
      fenceDepth += 1
    }
  }

  if (fenceDepth % 2 === 0) {
    return markdown
  }

  return `${markdown}\n\`\`\`\n`
}

function isFenceDelimiterLine(line: string): boolean {
  return /^(\s*)(`{3,})([^`]*)$/.test(line)
}
