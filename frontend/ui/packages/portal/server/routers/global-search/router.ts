import { Router } from 'express'
import { performSearch } from './global-search'

export type GlobalSearchRouter = Router

export function GlobalSearchRouter(): GlobalSearchRouter {
  const router = Router()

  performSearch(router)

  return router
}
