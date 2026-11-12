import {
  ACCEPTABLE_VERSION_FILE_EXTENSIONS,
  createUnsupportedFilesMessage,
  isAcceptableFileName,
  partitionFilesByExtension,
  toAllowedFormatsEnumeration,
} from './acceptable-files'

describe('acceptable-files', () => {
  describe('isAcceptableFileName', () => {
    it.each([
      'openapi.json',
      'openapi.yaml',
      'openapi.yml',
      'schema.graphql',
      'schema.gql',
      'service.proto',
      'README.md',
      'index.html',
      'docs.zip',
      'package.tgz',
      'OPENAPI.JSON',
      'my.api.v1.yaml',
    ])('accepts %s', (fileName) => {
      expect(isAcceptableFileName(fileName, ACCEPTABLE_VERSION_FILE_EXTENSIONS)).toBe(true)
    })

    it.each([
      'shell.php',
      'image.jpg.php',
      'app.exe',
      'page.jsp',
      'script.py',
      'image.svg',
      'schema.graphqls',
      'module.iml',
      'no-extension',
      'trailing-dot.',
      '.gitignore',
    ])('rejects %s', (fileName) => {
      expect(isAcceptableFileName(fileName, ACCEPTABLE_VERSION_FILE_EXTENSIONS)).toBe(false)
    })
  })

  describe('null byte in file name', () => {
    it('rejects shell.php%00.jpg', () => {
      expect(isAcceptableFileName('shell.php%00.jpg', ACCEPTABLE_VERSION_FILE_EXTENSIONS)).toBe(false)
    })

    it('rejects a raw null byte in file name', () => {
      expect(isAcceptableFileName('shell.php\0.jpg', ACCEPTABLE_VERSION_FILE_EXTENSIONS)).toBe(false)
    })
  })

  describe('partitionFilesByExtension', () => {
    it('splits files into accepted and rejected', () => {
      const json = { name: 'openapi.json' } as File
      const exe = { name: 'app.exe' } as File
      const proto = { name: 'service.proto' } as File

      const { accepted, rejected } = partitionFilesByExtension([json, exe, proto], ACCEPTABLE_VERSION_FILE_EXTENSIONS)

      expect(accepted).toEqual([json, proto])
      expect(rejected).toEqual([exe])
    })
  })

  describe('toAllowedFormatsEnumeration', () => {
    it('lists formats without dots separated by comma', () => {
      expect(toAllowedFormatsEnumeration(['.json', '.yaml', '.zip'])).toBe('json, yaml, zip')
    })
  })

  describe('createUnsupportedFilesMessage', () => {
    it('lists rejected files and allowed formats without dots', () => {
      const files = [{ name: 'app.exe' }, { name: 'shell.php' }] as File[]

      expect(createUnsupportedFilesMessage(files, ['.json', '.yaml']))
        .toBe('The file format is not supported: app.exe, shell.php.\nAllowed formats: json, yaml')
    })
  })
})
