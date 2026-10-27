export type BuildIdOptions = {
  /** Follow the workspace packages in `devDependencies` of the package itself too. An app bundles them. */
  includeDevDependencies?: boolean
}

/** A hash of the sources of the package and of the workspace packages it depends on. */
export function computeBuildId(packageDir: string, options?: BuildIdOptions): string

/** `<version from package.json>+<build id>` */
export function stampedVersion(packageDir: string, options?: BuildIdOptions): string
