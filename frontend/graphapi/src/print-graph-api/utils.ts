
export function isPrintableString(value: string): boolean {
  for (let i = 0; i < value.length; ++i) {
    switch (value.codePointAt(i)) {
      case 0x0000:
      case 0x0001:
      case 0x0002:
      case 0x0003:
      case 0x0004:
      case 0x0005:
      case 0x0006:
      case 0x0007:
      case 0x0008:
      case 0x000b:
      case 0x000c:
      case 0x000e:
      case 0x000f:
        return false // Has non-printable characters
      case 0x000d: // \r
        return false // Has \r or \r\n which will be replaced as \n
    }
  }

  return true
}

export function isPrintableMultilineString(value: string): boolean {
  return isPrintableString(value) && value.includes('\n')
}
