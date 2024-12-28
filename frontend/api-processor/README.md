# qubership-apihub-api-processor

## Basic usage

```typescript
import { PackageVersionBuilder } from '@netcracker/qubership-apihub-api-processor'

const builder = new PackageVersionBuilder(config, {
  resolvers: {
    fileResolver: this.fileResolver.bind(this),
    ...versionResolvers,
  },
})

const buildResult = await builder.run()
```