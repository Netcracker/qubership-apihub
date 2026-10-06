export type NodeDataPickFunction = <TargetType extends object>(
  source: Record<string, unknown> | null,
  keys: readonly (keyof TargetType)[],
) => TargetType | null

export abstract class AbstractNodeDataBuilder<
  V extends object | boolean | null,
  M extends object
> {
  public abstract createNodeMeta(value: unknown): M;
  public abstract createNodeValue(kind: string, key: PropertyKey, value: unknown, pick: NodeDataPickFunction): V | null;
}
