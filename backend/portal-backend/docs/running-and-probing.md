# Running and probing the service

## Start the process from this directory

Several resource trees are resolved relative to the working directory through `technicalParameters.basePath`, whose
default is `.` — the migration set, the static portal assets, and the MCP prompt and resource assets. Starting the
binary anywhere else panics with a message about migration files, or loads an empty asset set. `APIHUB_CONFIG_FOLDER`
relocates only the configuration file, not the resources. Run the binary with this directory as the working
directory, wherever the binary itself sits, or set `basePath` deliberately.

## The runtime needs four ports, not two

Besides its HTTP port and the database, the embedded distributed cache binds two more ports with fixed defaults, and
they are not part of the configuration block that local-development documentation walks you through. Two instances on
one machine collide.

The collision is nastier than a startup failure. The cache starts on a goroutine after the HTTP server is already
listening, so the process answers `/live` with 200, looks healthy for half a minute, and then disappears. The
built-in "port busy, pick a random one" fallback does not rescue it: the free-port probe tests the wildcard address
while the member list binds a specific interface address, and on some platforms the wildcard bind succeeds while the
specific one is taken.

Set the cache ports explicitly in your config whenever you run the service locally, and check occupancy with
`lsof -nP -iTCP:<port> -sTCP:LISTEN` rather than connecting to localhost — the service binds a LAN address.

## Production mode is the default, and it changes the route table

The production-mode flag defaults to on. In that mode the process refuses to start without a configured identity
provider, so a config that looks complete fails with a message about missing providers and then panics. Turn it off
for local work.

The flag does more than gate authentication: a block of routes is registered only when it is off — local login,
profiling endpoints, and internal user-management endpoints among them. So a local probe sees endpoints that
production does not serve. Establish any claim about production behaviour from the route registration in the wiring
file, and say which mode an observation was made in.

## An unknown path answers 421, not 404

A catch-all responds `Requested unknown endpoint` with HTTP 421 for three different situations: a path no route
matches, a method mismatch on a path that exists, and a route whose registration is gated behind configuration. The
status reads like a proxy or base-URL problem and usually is not. Treat 421 as "this build and this config do not
serve that route", then check the route registration and the config gate.

## Three entry points, three conventions, and misleading failures

Local login is HTTP Basic. A JSON body never reaches credential checking, and the resulting 401 says credentials were
not provided, which reads like a wrong password. The current login route sets cookies and returns an empty body; the
older one returns a bearer token in the body, which is what a script wants.

The MCP endpoint is registered for an exact path ending in a slash — without it you get the 421 above — and it
authenticates from its own header rather than a bearer token, using the bootstrap access token from your config. A
valid user token is rejected there with a message about an empty header.

A failing MCP tool call still returns HTTP 200 with the error inside the JSON-RPC body, so the status code is not the
result.

Read the `debug` field of an error body before believing its message.

## A green health check does not mean your process is up

Two different mistakes hide here.

The first is somebody else's process. If your instance died on a port conflict, the probe is answered by whatever
else holds that port — backed by a different database and a different bootstrap token, so every subsequent call fails
with an authentication error that has nothing to do with credentials. After starting the service, confirm the
listener belongs to your process and grep your own log for a fatal line.

The second is the shape of readiness itself. It is signalled once, over a channel, after migration completes: before
that the endpoint answers 404, and afterwards it is never recomputed. So a polling loop that waits for 200 blocks for
the whole migration, and a schema that breaks underneath a running process leaves readiness green while requests fail.
Poll liveness for "the process is alive" and readiness for "migration finished", and never infer schema health from
either.

## A database problem looks like an authentication problem

Readiness polls no dependency, so it stays 200 with the database completely down.
Meanwhile API-key and token clients, including MCP, receive 401, because the auth path does a database lookup and
reports the failure as "not authenticated" with nothing logged above the lowest level. A frozen database is worse
than a stopped one: connections carry no read or write deadline, so requests hang for the whole outage.

When the service starts answering 401 or returning empty results during local work, check the database before you
check credentials, and never use `/ready` as evidence that it can serve traffic.

## Panics and library logs do not reach the configured log file, and metrics are off by default

The log file receives logrus output only. The Go runtime writes crash dumps to standard error, and the distributed
cache and the database driver log there too, so a collected log simply stops at the last normal line. Start the
service with standard error redirected to a file of its own, and read that when a run "just stopped". Merging both
streams into one file is convenient but destroys the distinction you need when the question is where a message went.

Metrics collection is off by default, so the metrics endpoint answers 200 with runtime series and nothing
application-specific. Turn it on before concluding anything about instrumentation, and assert on series names rather
than on the status code.

Startup also logs several errors about unset identity-provider settings in an otherwise healthy local run. They are
noise. When diagnosing a failed start, read the last line before the exit rather than the first line that says ERROR.

## You cannot publish anything with only this service running

Builds are executed by a separate deployable, so publish, comparison, and export requests are accepted and then queue
forever. Object storage is usually unconfigured locally, and storage falls back to the database.

For any check that needs content, insert rows directly. Read the actual columns with `\d <table>` first and insert in
foreign-key order — the side tables keyed by content hash have to exist before the rows that reference them, and a
user row has to exist before anything owned by a user. Packages and workspaces share one table with dotted
identifiers where the parent is the prefix.

An empty catalogue is the trap that follows: a search that returns nothing looks like a filter working correctly. It
usually means the data is missing or a default filter fired.

## Waiting for the database container

The readiness probe of a stock PostgreSQL image goes green while the initialisation scripts that create the
application role and database are still running against a Unix socket. Poll with an actual query as the application
user instead. Do not use the compose file under the local-development documentation as written — it mounts the
current directory as the data directory and writes a database into the working tree.

## Do not guess a file name from a type name

Several implementations share one file, and the file is named after the domain rather than after any one type. Locate
a handler or a service by grepping for its receiver or method name across the layer directory. Guessing a path from
the type name produces a confident "no such file" that reads like the code does not exist.

## The middleware package identifier is misspelled

The directory is spelled correctly and the `package` clause inside it is not. Imports and call sites use the
misspelling. Glob the path with the correct spelling, write the misspelled identifier inside those files, and expect
a symbol search on either spelling to return half the story.
