export const VS_CODE_EXTENSION_URL =
  'https://marketplace.visualstudio.com/items?itemName=Netcracker.qubership-apihub-vscode'

export function navigateToExternalPage(url: string, openInNewTab: boolean = true): void {
  window.open(url, openInNewTab ? '_blank' : '_self', 'noopener,noreferrer')
}
