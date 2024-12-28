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

import type { Service } from '@apihub/entities/services'

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
