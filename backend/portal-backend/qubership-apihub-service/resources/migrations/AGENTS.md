# Working with migrations

## Never edit a migration that has been applied

The service applies migrations itself at startup, in both directions, and it stores each down script in the database
when it applies the corresponding up. A rollback therefore replays SQL from the database, not from these files.

Two consequences follow. Editing an applied file changes what the service believes it has run, and the next start
replays the stored down version. And starting an older binary against a newer database silently downgrades the schema
and drops tables, at informational log level, with no flag and no confirmation. Add a new numbered pair instead of
editing, and give every checkout its own throwaway database.

The integrity hash covers only the highest-numbered migration, so a change to any earlier file passes unnoticed.

## Check numbering per side of the pair

The obvious check is wrong in a way that reports health. Listing every file and looking for repeated numbers finds
every correctly paired migration, because each number legitimately appears twice — so it cannot detect a duplicate,
and it reports a missing down script as healthy.

Detect duplicates over one side only, and test pairing separately:

```bash
ls *.up.sql | sed 's/_.*//' | sort -n | uniq -d
for u in *.up.sql; do n="${u%%_*}"; ls ${n}_*.down.sql >/dev/null 2>&1 || echo "no down: $u"; done
```

Not every migration has a down script today, so the pairing loop prints results. That is the current state, not a
regression you introduced.

## Startup migration takes no lock

Two instances starting against one database at the same time race, and one dies on a unique-constraint violation
while the other proceeds. There is no command that applies migrations without running the service. When you exercise
migrations, start instances one at a time.

## Conventions

Use the next unused numeric prefix, never reuse a number, and provide the paired down script when a rollback is
meaningful.
