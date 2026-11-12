import type { Service } from '@agents/entities/services'

export function filterServices(
  value: string | undefined,
  services: ReadonlyArray<Service>,
): ReadonlyArray<Service> {
  if (!value) {
    return services
  }
  const lowerCaseValue = value.toLowerCase()
  return services.filter(({ key, baseline, labels }) => {
    return key.includes(lowerCaseValue) ||
      baseline?.name.toLowerCase().includes(lowerCaseValue) ||
      baseline?.packageKey.toLowerCase().includes(lowerCaseValue) ||
      Object.entries(labels ?? {})
        .some(([key, value]) => getFormattedLabel(key, value).toLowerCase().includes(lowerCaseValue))
  })
}

export function getFormattedLabel(key: string, value: string): string {
  return `${key}: ${value}`
}
