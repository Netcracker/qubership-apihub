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

import type { Locator } from '@playwright/test'
import type { DownloadedTestFile } from '@shared/entities/files'
import { BaseComponent } from '@shared/components/base'
import { ExpectLocator } from './ExpectLocator'
import { ExpectComponent } from './ExpectComponent'
import { ExpectFile } from './ExpectFile'
import { ExpectText } from './ExpectText'
import { ExpectApiVersion } from './ExpectApiVersion'
import { ExpectApiPackage } from './ExpectApiPackage'

export const expect = function (actual: BaseComponent | Locator, message?: string): ExpectComponent | ExpectLocator {
  if (actual instanceof BaseComponent) {
    return new ExpectComponent(actual, false, false, message)
  } else { return new ExpectLocator(actual, false, false, message) }
}
expect.soft = function (actual: BaseComponent | Locator, message?: string): ExpectComponent | ExpectLocator {
  if (actual instanceof BaseComponent) {
    return new ExpectComponent(actual, false, true, message)
  } else { return new ExpectLocator(actual, false, true, message) }
}

export const expectFile = function (actual: DownloadedTestFile, message?: string): ExpectFile {
  return new ExpectFile(actual, false, false, message)
}
expectFile.soft = function (actual: DownloadedTestFile, message?: string): ExpectFile {
  return new ExpectFile(actual, false, true, message)
}

export const expectText = function (actual: string, message?: string): ExpectText {
  return new ExpectText(actual, false, false, message)
}
expectText.soft = function (actual: string, message?: string): ExpectText {
  return new ExpectText(actual, false, true, message)
}

export const expectApiVersion = function (actual: {
  packageId: string
  version: string
}, message?: string): ExpectApiVersion {
  return new ExpectApiVersion(actual, false, false, message)
}
expectApiVersion.soft = function (actual: { packageId: string; version: string }, message?: string): ExpectApiVersion {
  return new ExpectApiVersion(actual, false, true, message)
}

export const expectApiPackage = function (actual: {
  packageId: string
  name?: string
}, message?: string): ExpectApiPackage {
  return new ExpectApiPackage(actual, false, false, message)
}
expectApiPackage.soft = function (actual: { packageId: string; name?: string }, message?: string): ExpectApiPackage {
  return new ExpectApiPackage(actual, false, true, message)
}
