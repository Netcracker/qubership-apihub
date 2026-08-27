# Working with the API specifications

These documents are the normative HTTP contract, and any REST change must update them. Two things make them
unreliable as a description of what the service currently does.

## They have already drifted, in both directions

Operations are published here that the service does not serve, documented query parameters are ignored by their
handlers, response bodies do not always match their schemas, and some enum values differ from what the code returns.
Nothing mechanically compares these files against the implementation, so the drift accumulates quietly.

When the question is "does this endpoint exist and what does it return", check both: the route registration in the
wiring file, including the configuration guard it sits under, and a live call. A single source will mislead you. An
endpoint that is documented here and answers 421 at runtime is usually gated behind configuration rather than absent.

## Declared constraints are not enforced

Ranges, bounds, and required-field declarations here are documentation. The handlers do not validate against them, so
out-of-range values reach the database. Do not conclude a value is bounded because the specification says so.

## Editing

Match the surrounding indentation, leave no trailing whitespace on changed lines, and wrap a `$ref` in `allOf` when
you need to add a description beside it. The running service serves these files unauthenticated, which is a
convenient way to fetch a specification exactly as a deployment exposes it.
