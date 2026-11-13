# Java API fixtures

Prototype fixtures for `JavaClassViewer`. Both files are jdiff output for
`org.qubership:qip-catalog-library`.

## Categories

| File              | jdiff mode   | Content                                                                             |
| ----------------- | ------------ | ----------------------------------------------------------------------------------- |
| `api-report.json` | `api-report` | Version `2025.1.1.15`, 5 types, 105 rows                                            |
| `api-diff.json`   | `api-diff`   | `2025.1.1.13` → `2025.1.1.15`, 2 types, 7 rows: 5 member changes, 2 inherited types |

The report keeps these types under `org.qubership.integration.platform.catalog.`:

- `consul.ConsulClient`: class with fields, a constructor, and methods (15 rows).
- `persistence.configs.entity.actionlog.EntityType`: enum constants (31 rows).
- `persistence.configs.repository.chain.ElementRepository`: interface methods (25 rows).
- `model.deployment.update.DeploymentInfo`: enclosing class and a type link to its builder (22 rows).
- `model.deployment.update.DeploymentInfo$DeploymentInfoBuilder`: nested class (12 rows).

The diff keeps `DeploymentInfo` (5 rows) and its builder (2 rows) for breaking and non-breaking member changes.
These are the shared samples for data-layer tests, viewer stories, and local mock routes.

An `api-report` compares a version with itself, so every element is `UNCHANGED`, compatible, and `semver: NONE`.

## Accepted jdiff input

The Java builders accept an object with `artifacts`, an array of objects whose `changes` arrays contain flat element
rows. Rows from all artifacts are combined and grouped by `className`; use one artifact's document when binary names
overlap. The transformer reads these fields:

| Field                 | Values and use                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `mode`                | `api-report` or `api-diff`; copied to the document tree root when it is a string                    |
| `artifacts[].changes` | Array of type and member rows                                                                       |
| `className`           | Binary class name, such as `org.example.Outer$Inner`; also the class lookup key                     |
| `elementType`         | `CLASS`, `INTERFACE`, `ENUM`, `ANNOTATION`, `FIELD`, `CONSTRUCTOR`, or `METHOD`                     |
| `member`              | Absent on type rows; field or executable signature on member rows, as shown below                   |
| `status`              | `UNCHANGED`, `NEW`, `REMOVED`, or `MODIFIED`                                                        |
| `changeTypes`         | Array of change codes, such as `METHOD_REMOVED` or `ANNOTATION_REMOVED`; use `[]` when empty        |
| `details`             | Optional explanatory text; retained in compatibility metadata and used to detect an own type change |
| `binaryCompatible`    | Boolean retained in compatibility metadata for additional information                               |
| `sourceCompatible`    | Boolean retained in compatibility metadata for additional information                               |
| `breaking`            | Boolean; a changed row is breaking when `breaking` is true, non-breaking otherwise                  |
| `semver`              | `NONE`, `PATCH`, `MINOR`, or `MAJOR`; retained in metadata without affecting severity               |

Other fields, including tool metadata, artifact coordinates, versions, and `semverVerdict`, are not interpreted.
Unknown type kinds default to `CLASS`; unknown member kinds do not produce tree members.

### Names and signatures

The package of `org.example.Outer$Inner` is `org.example`; its display name is `Outer.Inner` and its enclosing class
is `org.example.Outer`. Nested types also appear in the enclosing class's nested-classes section. Enum fields whose
type exactly equals the enum's binary name become enum constants; other fields remain ordinary fields.

Signatures use erased types with fully qualified reference names. Generic type arguments and parameter names are
not supported: parameters are split on commas, and the last space in an executable's head separates return type
from method name. Arrays remain part of the type string, including nested-class array return types.

```text
java.lang.String NAME
Outer(java.lang.String, int[])
void clear()
org.example.Outer$Inner[] entries(java.lang.String[], int)
```

### Changes and validation

`UNCHANGED` rows have no severity. A type row with `status: MODIFIED`, no `member`, `changeTypes: []`, and no `details`
only reflects changes in its members, so it has no severity and contributes no change count. Any other changed
row is breaking when `breaking` is true and non-breaking otherwise.
Counts measure changed rows, while descriptions can contain several lines for one row's `changeTypes`.
The diff fixture therefore produces four breaking and one non-breaking counted rows after two inherited type
rows are excluded.

Type status `NEW` or `REMOVED` sets the class action to added or removed. Otherwise, any row whose status is not
`UNCHANGED` sets the action to changed, including an inherited `MODIFIED` type row; an unchanged report has no action.

Rows without string `className`, `elementType`, and `status` fields are skipped. Missing `artifacts` or a document
with no accepted rows produces an empty class list and a warning through the supplied logger. The default logger
is silent. An unknown class key produces no class-tree root and a warning. Validation does not check every field:
accepted rows must still supply the compatibility fields, a `changeTypes` array, and well-formed member signatures.

## Storybook and screenshot tests

Stories:

- [Java Class Viewer](../../api-doc-viewer/src/stories/javaapi-suite/java-class-viewer.stories.tsx): classes, enums,
  nested types, diffs, and interactive browsing.

Screenshot ITs cover all 8 stories in one suite:

- [Java Class Viewer ITs](../../api-doc-viewer/src/it/javaapi-suite.java-class-viewer.it-test.ts)

These ITs await execution and baseline generation with the Docker configuration. With a working container engine,
run from `packages/api-doc-viewer`:

```bash
pnpm run regenerate-screenshots-single-suite javaapi-suite
pnpm run screenshot-test-single-suite javaapi-suite
```

## Regenerate

Take the full jdiff `api-report` and retain all rows for the five binary type names listed above.
From the jdiff `api-diff`, retain only rows for `DeploymentInfo` and its builder.
Preserve the document envelopes, one artifact per file, and the original row values and formatting.
