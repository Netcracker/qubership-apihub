/**
 * Wording of the "show unchanged" control, shared by every viewer that hides unchanged content:
 * `Show 1 unchanged node`, `Show 3 unchanged nodes` (tree lists), `Show 4 unchanged rows` (a security
 * card). Design: docs/design/shared/features/hiding-unchanged-nodes.md.
 */
export class ShowUnchangedLabels {
  public static nodes(count: number): string {
    return ShowUnchangedLabels.label(count, 'node')
  }

  public static rows(count: number): string {
    return ShowUnchangedLabels.label(count, 'row')
  }

  private static label(count: number, noun: string): string {
    return count === 1 ? `Show 1 unchanged ${noun}` : `Show ${count} unchanged ${noun}s`
  }
}
