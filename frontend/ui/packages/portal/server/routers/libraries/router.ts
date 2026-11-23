import { Router } from 'express'

import type { LibraryStore } from '../../mocks/libraries/store'
import {
  checkLibraryExists,
  createLibrary,
  deleteLibrary,
  deleteLibraryApiKey,
  deleteLibraryMember,
  deleteLibraryVersion,
  disfavorLibrary,
  favorLibrary,
  generateLibraryApiKey,
  getLibraries,
  getLibrary,
  getLibraryApiKeys,
  getLibraryAvailableVersions,
  getLibraryChanges,
  getLibraryChangesSummary,
  getLibraryJavaApiDiff,
  getLibraryJavaApiReport,
  getLibraryMembers,
  getLibraryVersion,
  getLibraryVersions,
  publishLibraryVersion,
  updateLibrary,
  updateLibraryMember,
  updateLibraryVersion,
} from './libraries'

export function LibrariesRouter(store: LibraryStore): Router {
  const router = Router()

  getLibraries(router, store)
  getLibrary(router, store)
  createLibrary(router, store)
  checkLibraryExists(router, store)
  updateLibrary(router, store)
  deleteLibrary(router, store)
  getLibraryMembers(router, store)
  updateLibraryMember(router, store)
  deleteLibraryMember(router, store)
  getLibraryApiKeys(router, store)
  generateLibraryApiKey(router, store)
  deleteLibraryApiKey(router, store)
  getLibraryAvailableVersions(router, store)
  getLibraryVersions(router, store)
  getLibraryJavaApiReport(router, store)
  getLibraryJavaApiDiff(router, store)
  getLibraryChangesSummary(router, store)
  getLibraryChanges(router, store)
  getLibraryVersion(router, store)
  publishLibraryVersion(router, store)
  updateLibraryVersion(router, store)
  deleteLibraryVersion(router, store)

  return router
}

export function LibraryFavoritesRouter(store: LibraryStore): Router {
  const router = Router()

  favorLibrary(router, store)
  disfavorLibrary(router, store)

  return router
}
