import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { SideContext, SideContexts, SideReader } from "../../shared/side-reader"

/**
 * Presence per side of the built sections: does a section show anything on a side. A section's
 * presence decides its synthetic whole add / remove (a media type without `schema` is not content,
 * so the raw section object can exist while showing nothing).
 * Design: docs/design/openapi/features/diffs.md -> "Section presence and whole-section changes".
 */
export class OpenApiSectionPresence {
  private readonly presence = new WeakMap<object, SideContext>()

  constructor(private readonly reader: SideReader) { }

  public set(section: object, presence: SideContext): void {
    this.presence.set(section, presence)
  }

  /** A section without recorded presence shows content on both sides. */
  public of(section: object): SideContext {
    return this.presence.get(section) ?? SideContexts.BOTH
  }

  /**
   * Whole-section diff of `section` in `owner`'s record under `key`: a synthetic add / remove when
   * the section's presence flips. Under a wholly added / removed operation (`operationWholeDiff`)
   * nothing is written - every node inherits the operation diff.
   */
  public writeSectionDiff(
    owner: object,
    key: string,
    section: object,
    operationWholeDiff: Diff | undefined,
    presence: SideContext = this.of(section),
    rawSectionDiff?: Diff,
  ): void {
    if (operationWholeDiff) {
      return
    }
    const current = this.reader.record(owner)?.[key]
    if (SideReader.isWholeChangeOrRename(current)) {
      return
    }
    // A raw add / remove of the section object itself (e.g. a whole `content` map) wins over a synthetic one.
    const diff = rawSectionDiff && SideReader.isWholeChange(rawSectionDiff)
      ? rawSectionDiff
      : this.reader.diffPresence(presence, section, [rawSectionDiff, ...this.reader.collectDiffs(section)])
    this.reader.writeDiff(owner, key, diff)
  }
}
