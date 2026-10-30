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

## Performance

When you add or change a non-trivial query, state the indexes it relies on and the row counts you expect, and check
for N+1 patterns in the calling service.
