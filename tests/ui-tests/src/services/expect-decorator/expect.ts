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
