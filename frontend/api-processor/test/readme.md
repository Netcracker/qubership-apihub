# Test Helpers

## Registry

Registry provide version config-file and files data like APIHUB Registry.
Data folder: `./versions/<packageId>/<version>`

### Usage
Create registry for package:
```ts
const registry = await Registry.openPackage("basic")
```

Publish project from folder `./projects/<projectId>` to registry:
```ts
const result = await registry.publish("basic", {
  version: "v3",
  previousVersion: "v2",
  serviceName: "basic-service"
})
```
- package - publish results with `BuildResult` interface:
```ts

export interface BuildResult {
  documents: ApiDocument[]
  changes: ApiChangeMessage[]
  bwcErrors: ApiValidationMessage[]
  config: VersionConfig
  errors?: string[]
}

interface VersionConfig {
  packageId: string
  version: string
  previousVersion?: string
  previousVersionPackageId?: string
  packageName?: string
  status: string
  refs: Array<{ ... }>
  files: Array<{
    fileId: string
    type: "openapi-3-0" | "openapi-3-1" | "openapi-2-0" | "asyncapi-2" | "unknown"
    format: "json" | "yaml" | "md" | "unknown"
    slug: string
    openapi?: {
      title: string
      operations: Array<{ 
        path: string
        method: "get" | "post" | "put" | "delete" | "patch" | "head" | "options" | "connect" | "trace"
      }> 
      description?: string
      version?: string
    }
    asyncapi?: {
      title: string
      operations: Array<{ 
        channel: string
        method: "publish" | "subscribe"
      }>
      description?: string
      version?: string
    }
    labels: string[]
  }>
}

```

Get version config and files:
```ts
const { config, files } = await registry.getVersion("v3")
```
- `files` - Map of parsed files data
- `config` - object with `VersionConfig` interface

Update version in registry:
```ts
registry.setVersion(package)
```

Update version file in registry (by slug):
```ts
await registry.updateVersionFile("v3", "openapi-json", (data) => {
  delete data.paths["pets"]
  return data
})
```

## Editor

Project data folder: `./projects/<packageId>`

### Usage

Create editor for project with exiting registry:
```ts
const registry = await Registry.openPackage("basic")
const editor = await Editor.openProject("basic", registry)
```

Create registry from editor:
```ts
const editor = await Editor.openProject("basic")
const registry = editor.registry
```

Run bundle and validation for project files:
```ts
const result = await editor.run()
```

Update project config:
```ts
const result = await editor.update({
  previousVersion: "v2"
})
```

Update project file content:
```ts
const result = await editor.updateJsonFile("openapi.json", (data) => {
  delete data.paths["pets"]
  return data
})
```
