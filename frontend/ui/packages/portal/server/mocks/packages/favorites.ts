/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { USERS_LIST } from '../users/users'

export const CURRENT_USER_ID = USERS_LIST.users[0].id

const USER_IDS = USERS_LIST.users.map(({ id }) => id)

// How many users (first N of USERS_LIST) favorited each package/dashboard
const SEED: ReadonlyArray<[packageId: string, usersCount: number]> = [
  ['package-1', 10],
  ['dashboard-1', 7],
  ['package-2', 5],
  ['package-3', 3],
  ['dashboard-2', 2],
  ['package-0', 1],
]

export const FAVORITES: Map<string, Set<string>> = new Map(USER_IDS.map(userId => [userId, new Set<string>()]))

SEED.forEach(([packageId, usersCount]) => {
  USER_IDS.slice(0, usersCount).forEach(userId => FAVORITES.get(userId)!.add(packageId))
})

export function getFavoritesCount(packageId: string): number {
  let count = 0
  FAVORITES.forEach(packageIds => packageIds.has(packageId) && count++)
  return count
}

export function isFavorite(userId: string, packageId: string): boolean {
  return FAVORITES.get(userId)?.has(packageId) ?? false
}

export function favor(userId: string, packageId: string): void {
  if (!FAVORITES.has(userId)) {
    FAVORITES.set(userId, new Set())
  }
  FAVORITES.get(userId)!.add(packageId)
}

export function disfavor(userId: string, packageId: string): void {
  FAVORITES.get(userId)?.delete(packageId)
}
