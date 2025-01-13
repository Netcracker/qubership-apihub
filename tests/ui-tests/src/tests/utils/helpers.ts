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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { millisecondsToMinuteSeconds } from '@services/custom-reporter/utils'

export const formatNamespaceData = (namespaceData: {
  name: string
  jsonData: any
  time: number // ms
}): {
  name: string
  time: string // (mm:ss)
  services: number
  servicesWithSpec?: number
  noTestService?: boolean
  noBackEndService?: boolean
} => {
  if (namespaceData.jsonData === undefined) {
    return {
      name: namespaceData.name,
      time: 'unknown',
      services: -1,
    }
  }
  const { services } = namespaceData.jsonData
  return {
    name: namespaceData.name,
    time: millisecondsToMinuteSeconds(namespaceData.time),
    services: services.length,
    servicesWithSpec: countServicesWithSpec(services),
    noTestService: isServiceExist(services, 'apihub-agent-test-service') ? undefined : true,
    noBackEndService: isServiceExist(services, 'apihub-backend') ? undefined : true,
  }
}

function countServicesWithSpec(services: any[]): number {
  let count = 0
  for (const service of services) {
    if (service.specs.length > 0) {
      ++count
    }
  }
  return count
}

function isServiceExist(services: any[], serviceId: string): boolean {
  let isExist = false
  for (const service of services) {
    if (service.id === serviceId) {
      isExist = true
    }
  }
  return isExist
}

export function sortByField(field: string) {
  return (a: any, b: any) => (a[field] > b[field] ? 1 : -1)
}

export function removeObjectsWithField(arr: any[], field: string): any[] {
  return arr.filter((obj) => !Object.prototype.hasOwnProperty.call(obj, field))
}
