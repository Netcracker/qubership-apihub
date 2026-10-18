# Working in the service layer

## Panic containment is a convention, not a mechanism

Background work is expected to be wrapped so a panic cannot take the process down. Nothing enforces it: there is no
lint rule and no test, the helpers are used at dozens of call sites, and the convention is already broken in a few
places — a goroutine spawned straight from a request, and scheduled jobs registered without a recovery wrapper.

Two helpers with nearly the same name do not behave the same way. A wrapper only recovers if `recover()` is called
directly by the deferred function; a deferred closure that *calls* a recovery helper recovers nothing, because
`recover()` returns nil when it is not invoked directly from the deferred function. When you add background work,
read the wrapper you are about to use instead of copying the neighbouring line.

## The default local credential is a superuser, so permission code never runs

Permission checks short-circuit for a system administrator, and the bootstrap token that a local stand issues is one.
Everything succeeds, which looks like the authorization layer passing its tests. It was never entered.

To exercise authorization at all, create a principal without the system role and drive the request with that.

## One invariant, several implementations

Scope and prefix checks that enforce the same rule are written more than once, and they do not agree — at least one
compares a prefix without the separator, so a neighbouring scope whose name merely starts with the same characters is
admitted. When you touch one of these, find the siblings and copy the one that handles the separator, rather than the
nearest one.

## Defaults computed at call time

Some search parameters default to a value derived from the current date rather than from the data. A caller that
omits the parameter therefore gets a filtered result with no indication that a filter was applied, and the same call
returns a different answer after a calendar boundary with no change to the data. Some of these values also reach SQL
as pattern matches, so wildcard characters in caller input widen the query silently.

Pass such parameters explicitly, and read an empty result as "filtered out" rather than "not in the catalogue" until
you have checked.

## Scheduled work

Registrations that appear to accumulate state on a service may be written to a copy if the method has a value
receiver. Check the receiver before reasoning about anything a method seems to collect.
