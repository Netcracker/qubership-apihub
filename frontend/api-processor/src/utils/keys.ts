export function getCompositeKey(...args: string[]): string {
  // return args.join('-$@#^&!-')
  return JSON.stringify(args)
}
