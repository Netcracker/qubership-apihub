# Working in the controller layer

## Responding with an error does not end the handler

The respond helpers write a response and return normally. Several handlers here forget the `return` after one, so the
body carries two JSON documents and the side effect behind the guard runs anyway.

This matters most when you are reading rather than writing. A branch that looks unreachable because "validation
rejects that input above" may be perfectly reachable, because the validation never returned. Before you treat
downstream code as protected by a check, confirm the check's failure branch ends with `return`.

## Error identity is the concrete type, not the wrapped chain

The responder decides an error's status by type-asserting one concrete pointer type. An error of that type passed by
value, or wrapped with `%w`, does not match — it falls through to a generic 500 with no error code, silently
contradicting the status the OpenAPI document promises.

Return the type the responder actually matches, and verify a status code by calling the endpoint rather than by
reading the constructor.

## Published bounds are documentation, not validation

Ranges declared in the OpenAPI documents and in tool input schemas are not enforced by the handlers. Out-of-range and
negative values reach SQL and come back as a 500 carrying the raw driver message. Treat every published bound as
unenforced until you find the code that checks it, and add validation in the handler rather than in the schema.

## Conventions

Use the `net/http` status constants rather than numeric literals, and return API errors as the shared error-code
constants so the message and code stay consistent across handlers.
