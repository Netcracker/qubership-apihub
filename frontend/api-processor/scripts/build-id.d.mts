export type BuildIdOptions = {
  /** Follow the workspace packages in `devDependencies` too. An app bundles them. */
  includeDevDependencies?: boolean
}

export function computeBuildId(packageDir?: string, options?: BuildIdOptions): string

/** `<version from package.json>+<build id>` */
export function stampedVersion(packageDir?: string, options?: BuildIdOptions): string
