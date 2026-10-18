import { DirectiveLocation } from "graphql";
import { GraphApiDirectiveDefinition } from "../../src/types";

export const DEFAULT_DIRECTIVES: Record<string, GraphApiDirectiveDefinition> = {
  include: {
    title: "include",
    description: "Directs the executor to include this field or fragment only when the `if` argument is true.",
    locations: [DirectiveLocation.FIELD, DirectiveLocation.FRAGMENT_SPREAD, DirectiveLocation.INLINE_FRAGMENT],
    args: {
      if: {
        description: "Included when true.",
        typeDef: { type: { kind: "boolean" } },
        nullable: false,
      },
    },
  },
  skip: {
    title: "skip",
    description: "Directs the executor to skip this field or fragment when the `if` argument is true.",
    locations: [DirectiveLocation.FIELD, DirectiveLocation.FRAGMENT_SPREAD, DirectiveLocation.INLINE_FRAGMENT],
    args: {
      if: {
        description: "Skipped when true.",
        typeDef: { type: { kind: "boolean" } },
        nullable: false,
      },
    },
  },
  deprecated: {
    title: "deprecated",
    description: "Marks an element of a GraphQL schema as no longer supported.",
    locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.ARGUMENT_DEFINITION, DirectiveLocation.INPUT_FIELD_DEFINITION, DirectiveLocation.ENUM_VALUE],
    args: {
      reason: {
        description: "Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted using the Markdown syntax, as specified by [CommonMark](https://commonmark.org/).",
        typeDef: { type: { kind: "string" } },
        default: "No longer supported",
      },
    },
  },
  specifiedBy: {
    title: "specifiedBy",
    description: "Exposes a URL that specifies the behavior of this scalar.",
    locations: [DirectiveLocation.SCALAR],
    args: {
      url: {
        description: "The URL that specifies the behavior of this scalar.",
        typeDef: { type: { kind: "string" } },
        nullable: false,
      },
    },
  },
  oneOf: {
    title: "oneOf",
    description: "Indicates exactly one field must be supplied and this field must not be `null`.",
    locations: [DirectiveLocation.INPUT_OBJECT],
  },
}