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
import { _TemplateResolver, ExportDocument } from '../types'
import { getDocumentTitle } from './document'

export async function createCommonStaticExportDocuments(packageName: string, version: string, templateResolver: _TemplateResolver, backLinkFilename: string): Promise<ExportDocument[]> {
  return [
    createUnknownExportDocument('ls.html', await generateLegalStatementPage(packageName, version, await templateResolver('ls.html'), backLinkFilename)),
    createUnknownExportDocument('resources/corporatelogo.png', await templateResolver('resources/corporatelogo.png')),
    createUnknownExportDocument('resources/styles.css', await templateResolver('resources/styles.css')),
  ]
}

export function createUnknownExportDocument(filename: string, data: Blob): ExportDocument {
  return {
    filename: filename,
    data: data,
  }
}

export async function generateLegalStatementPage(packageName: string, version: string, legalStatement: Blob, backLinkFilename: string): Promise<Blob> {
  const filled = (await legalStatement.text())
    .replaceAll('{{packageName}}', packageName)
    .replaceAll('{{version}}', version)
    .replace('{{backLinkFilename}}', backLinkFilename)
  return new Blob([filled])
}

export async function generateHtmlPage(document: string, fileTitle: string, packageName: string, version: string, templateResolver: _TemplateResolver, addBackLink: boolean = false): Promise<Blob> {
  const template = await (await templateResolver('page.html')).text()
  const apispecViewScript = await (await templateResolver('scripts/apispec-view.js')).text()
  const breadcrumbs = addBackLink ? `<div class="breadcrumbs"><a href="index.html">Table of contents</a> > <span>${fileTitle}</span></div>` : ''
  const filled = template
    .replace('{{fileTitle}}', fileTitle)
    // arrow function disables replacement patterns like $&
    .replace('{{apispecViewScript}}', () => apispecViewScript)
    .replaceAll('{{packageName}}', packageName)
    .replaceAll('{{version}}', version)
    .replace('{{breadcrumbs}}', breadcrumbs)
    .replace('{{spec}}', escapeHTML(document))
  return new Blob([filled])
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
}

async function generateReadmeParts(templateResolver: _TemplateResolver, readme?: string): Promise<[string, string]> {
  if (!readme) {
    return ['', '']
  }
  const markdownIt = await (await templateResolver('scripts/markdown-it.min.js')).text()
  const readmeHtml = `    <div id="readmeMdDiv" class="card content">\n        <div class="card content"></div>\n    </div>\n    <br>\n    <script>\n        var md = window.markdownit();\n        let temp=md.render(\`${readme}\`);\n        const readmeMdDiv = document.getElementById('readmeMdDiv');\n        readmeMdDiv.innerHTML=temp;\n    </script>`
  return [readmeHtml, `<script>${markdownIt}</script>`]
}

export async function generateIndexHtmlPage(packageName: string, version: string, generatedHtmlExportDocuments: ExportDocument[], templateResolver: _TemplateResolver, readme?: string): Promise<Blob> {
  const template = await (await templateResolver('index.html')).text()
  const htmlList = generatedHtmlExportDocuments.reduce(
    (acc, { filename }) => acc.concat(`        <li><a href="${filename}">${getDocumentTitle(filename)}</a></li>\n`),
    '',
  )

  const [readmeHtml, markdownItScript] = await generateReadmeParts(templateResolver, readme)

  const filled = template
    .replaceAll('{{packageName}}', packageName)
    .replaceAll('{{version}}', version)
    .replace('{{markdownItScript}}', markdownItScript)
    .replace('{{readmeHtml}}', readmeHtml)
    .replace('{{htmlList}}', htmlList)
  return new Blob([filled])
}

export function createSingleFileExportName(packageId: string, version: string, documentTitle: string, format: string): string {
  return `${packageId}_${version}_${documentTitle}.${format}`
}
