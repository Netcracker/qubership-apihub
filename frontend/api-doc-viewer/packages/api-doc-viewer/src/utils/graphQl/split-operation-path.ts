import { SplitOperationPathResult } from "@apihub/components/GraphQLOperationViewer/GraphQLOperationViewer";


export function splitOperationPath(operationPath: string | undefined): SplitOperationPathResult | undefined {
  if (!operationPath) {
    return undefined
  }
  const [operationType, operationName] = operationPath.split('-')
  if (operationType !== 'query' &&
    operationType !== 'mutation' &&
    operationType !== 'subscription') {
    return undefined
  }
  if (!operationName) {
    return undefined
  }
  return { operationType, operationName }
}
