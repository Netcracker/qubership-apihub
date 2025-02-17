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
