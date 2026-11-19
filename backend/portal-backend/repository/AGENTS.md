# Working in the repository layer

## Dynamic SQL here is guarded, and the guard is not next to it

Some queries interpolate a column or a direction into the statement, which looks like an injection hole on a grep
hit. The permitted values are checked by whitelist helpers and, for some paths, rejected earlier in the calling
service. Find the whitelist before reporting or patching one of these; the naive reading has produced wrong patches.

That does not extend to numeric paging parameters, which are not validated anywhere and reach the database as
written.

## Files are large; read the region, not the file

The main repository implementations run to thousands of lines. Locate a query by grepping for the method or the table
name and read the surrounding range. Reading these whole wastes context and usually answers a different question than
the one you asked.

## Table shapes worth knowing before you write a query

Packages and workspaces live in one table, distinguished by a kind column, with dotted identifiers where the parent
is the prefix of the child. Content is split between a row table and a side table keyed by a content hash, so the
hashed side must exist before anything that references it. Schema version lives in its own tables under names that do
not include the word "migration" on its own.

Read the actual columns before writing inserts. Guessing an `id` column is a common way to get a confusing error.

## A new table keyed by package_id is invisible to package move until you add it there

`TransitionRepository.go` moves a package by rewriting `package_id` (and a few related columns, such as
`previous_package_id`) across a fixed, hand-maintained list of tables — `copyVersions`, `moveNonVersionsData`, and
`deleteVersionsData` each enumerate them by name. Nothing derives that list from the schema, so a new table or
entity that stores a `package_id` (or a workspace-scoped equivalent) is silently excluded: after a move, its rows
stay attached to the old, now-deleted package id instead of following the data to the new one, and the delete step
at the end of `MovePackage` does not remove them either (unless the table also has a `package_id` foreign key with
`ON DELETE CASCADE`, in which case the rows vanish instead of moving).

When you add an entity/table that references a package (directly or by a derived id such as an operation or
comparison key that embeds the package id), check whether it needs a line in `copyVersions`/`moveNonVersionsData`
(to move with the package) or `deleteVersionsData` (to clean up the old package id), and add it. The same applies to
`MoveGroupingPackage`, which is still a stub (`TODO: not supported yet`) — do not assume it already handles child
packages.

## Performance

When you add or change a non-trivial query, state the indexes it relies on and the row counts you expect, and check
for N+1 patterns in the calling service.
