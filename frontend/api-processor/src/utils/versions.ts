import { REVISION_DELIMITER } from '../consts'

export function getSplittedVersionKey(version: string | undefined): [string, number] {
  if (!version) {
    return ['', 0]
  }

  if (!version.includes(REVISION_DELIMITER)) {
    return [version, 0]
  }

  const [currentVersion, revision] = version.split(REVISION_DELIMITER)
  return [currentVersion, +revision]
}
