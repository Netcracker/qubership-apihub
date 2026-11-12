import JSZip from 'jszip'
import { ZipTool } from './package'

export class JsZipTool implements ZipTool {
  zip: JSZip = new JSZip

  constructor(zip?: JSZip | null) {
    if (zip) {
      this.zip = zip
    }
  }

  async buildResult(options?: JSZip.JSZipGeneratorOptions | undefined): Promise<any> {
    options = { ...defaultZipOptions, ...options }
    return await this.zip.generateAsync(options)
  }

  async file(path: string, content: object | string | Blob): Promise<void> {
    if (content instanceof Blob) {
      this.zip.file(path, content.arrayBuffer())
      return
    }
    this.zip.file(path, typeof content === 'string' ? content : JSON.stringify(content))
  }

  folder(name: string): ZipTool {
    return new JsZipTool(this.zip.folder(name))
  }
}

const defaultZipOptions: JSZip.JSZipGeneratorOptions<'nodebuffer'> = {
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: {
    level: 9,
  },
}
