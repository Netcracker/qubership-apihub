export function toBase64(data: string): string {
  return Buffer.from(data).toString('base64')
}

export function fromBase64(data: string): string {
  return Buffer.from(data, 'base64').toString()
}
