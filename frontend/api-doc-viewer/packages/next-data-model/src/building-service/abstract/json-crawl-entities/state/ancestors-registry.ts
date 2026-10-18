/**
 * Path-local registry of values already converted to tree nodes on the current DFS path.
 * Mutated with enter/leave (via syncCrawl exitHook) instead of copying a Map per node.
 */
export class AncestorsRegistry<N> {
  private readonly byValue = new Map<unknown, N>()

  get(value: unknown): N | undefined {
    return this.byValue.get(value)
  }

  enter(value: unknown, node: N): void {
    this.byValue.set(value, node)
  }

  leave(value: unknown): void {
    this.byValue.delete(value)
  }
}
