import { readFile } from 'fs/promises'
import path from 'node:path'

export const ROOT_RESOURCES = 'resources'
export const ROOT_DOWNLOADS = 'temp/downloads'

export class TestFile {

  readonly path: string
  readonly testMeta?: TestMetaFile
  name: string

  constructor(relativePath: string, testMetaParams?: TestMetaFileParams) {
    this.path = path.resolve(relativePath)
    this.testMeta = testMetaParams ? new TestMetaFile(testMetaParams) : undefined
    this.name = path.parse(this.path).base
  }

  get slug(): string {
    return path.parse(this.path).name
  }

  async blob(): Promise<Blob> {
    return new Blob([await readFile(this.path)])
  }
}

class TestMetaFile {
  readonly nameChanged?: string
  readonly slugChanged?: string
  readonly docTitle?: string
  readonly docTitleChanged?: string
  readonly docVersion?: string
  readonly docVersionChanged?: string
  readonly txtString?: string
  readonly jsonString?: string
  readonly jsonRefString?: string
  readonly yamlString?: string
  readonly yamlRefString?: string
  readonly gqlString?: string
  readonly mdString?: string
  readonly email?: string
  readonly license?: string
  readonly description?: string
  readonly termsOfService?: string
  readonly externalDocs?: string

  constructor(params: TestMetaFileParams) {
    this.nameChanged = params.nameChanged
    this.slugChanged = params.slugChanged
    this.docTitle = params.docTitle
    this.docTitleChanged = params.docTitleChanged
    this.docVersion = params.docVersion
    this.docVersionChanged = params.docVersionChanged
    this.txtString = params.txtString
    this.jsonString = params.jsonString
    this.jsonRefString = params.jsonRefString
    this.yamlString = params.yamlString
    this.yamlRefString = params.yamlRefString
    this.gqlString = params.gqlString
    this.mdString = params.mdString
    this.email = params.email
    this.license = params.license
    this.description = params.description
    this.termsOfService = params.termsOfService
    this.externalDocs = params.externalDocs
  }

  get docName(): string {
    if (!this.docTitle || !this.docVersion) {
      throw new Error('Missing "docTitle" or "docVersion"')
    }
    return `${this.docTitle} ${this.docVersion}`
  }

  get docNameChanged(): string {
    if (!this.docTitleChanged || !this.docVersionChanged) {
      throw new Error('Missing "docTitleChanged" or "docVersionChanged"')
    }
    return `${this.docTitleChanged} ${this.docVersionChanged}`
  }
}

type TestMetaFileParams = Omit<TestMetaFile, 'docName' | 'docNameChanged'>

export type DownloadedTestFile = {
  fileId: string // 'slug.extension'
  data: string
}

export type UploadedTestFile = {
  name?: string
  path: string
}
