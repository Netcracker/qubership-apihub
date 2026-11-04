# Security and privacy

## Token

- **SEC-1** The GitHub token is the viewer's own fine-grained token with read access to public repositories. It is
  stored only in that browser and sent only to `api.github.com`, never to the page's own host.
- **SEC-2** The token field is a password field without autocomplete. **Forget token** removes the token from the
  browser.

## Untrusted content

- **SEC-3** Everything that comes from GitHub (titles, labels, logins, comments, check names) is untrusted. Plain text
  renders as text, never as HTML. Label colors are used only when they are six hex digits. A failed check links to its
  log only when the address is `https`, since third-party integrations set it.
- **SEC-4** Comment Markdown is rendered with `marked` and then sanitized with DOMPurify. The result has no scripts,
  event handler attributes, `style` tags or attributes, forms, SVG, MathML, image maps, `class` or `id` attributes,
  or `javascript:` links, and every link opens in a new tab with `rel="noopener noreferrer"`.

## Build and deployment

- **SEC-5** The static board build reads no GitHub credential. The monorepo workflow uses its own credentials
  for Pages assembly; checkouts retain no credentials, and no credential enters the board bundle.
- **SEC-6** Only the deploy job may write to Pages and request an OIDC token. A running deploy is never cancelled
  by a newer run; the newer run waits.

## Dependencies

- **SEC-7** New dependencies need a reason, and the standard library or an existing dependency comes first. A new
  version must have been published at least two weeks earlier. Packages that touch untrusted content (`marked`,
  `dompurify`), test tooling with a DOM (`jsdom`), and the fonts (`@fontsource/*`) are pinned to exact versions.
- **SEC-8** The page loads no script, style, or font from another host: the fonts ship with the page from
  `@fontsource`. Images in comments are the exception (see the known limitations).
