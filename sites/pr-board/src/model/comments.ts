// Comment text without HTML comment markers, which bots use to find their own reports.

export function stripHtmlComments(body: string | null | undefined): string {
  return (body || '').replace(/<!--[\s\S]*?-->/g, ' ').trim();
}

export function cleanCommentText(body: string | null | undefined): string {
  return stripHtmlComments(body).replace(/\s+/g, ' ');
}
