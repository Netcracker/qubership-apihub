import { Optional } from 'main/domain/base'
import { DefaultDomainMeta, DomainMeta, RelationObject } from 'main/domain/object/meta'

export interface ContentObject<Meta extends DomainMeta = DefaultDomainMeta> {
  readonly classes?: Optional<Meta['class'][]>;
  readonly relations?: Optional<RelationObject<Meta>[]>;
}
