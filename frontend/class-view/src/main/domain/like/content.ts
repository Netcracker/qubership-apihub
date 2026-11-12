import { ClassLike } from 'main/domain/like/class'
import { RelationLike } from 'main/domain/like/all'

export interface ContentLike {
  readonly classes: ClassLike[];
  readonly relations: RelationLike[];
}
