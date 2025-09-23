import { isGraphApi, isGraphApiInputObjectDefinition, isGraphApiInterfaceDefinition, isGraphApiObjectDefinition, isGraphApiOperation } from "@netcracker/qubership-apihub-graphapi"

function createNode(fragment: any, id: string, kind: string): any {
  return {
    id,
    kind,
    children: [],
    value: null,
    meta: null,
    // new API
    _expandFragment: fragment,
    expand(): void {
      this.children = expand(this._expandFragment, kind)
    }
  }
}

function genID(): string {
  return Math.floor(Math.random() * 1_000_000).toString()
}

function expand(expandFragment: any, kind: string): any {
  console.log('Expanding fragment:', expandFragment)
  if (isGraphApi(expandFragment)) {
    const operations = []
    const queries = expandFragment.queries ?? {}
    for (const [queryId, query] of Object.entries(queries)) {
      operations.push(
        createNode(query, `#/schema/queries/${queryId}`, 'operation'),
      )
    }
    const mutations = expandFragment.mutations ?? {}
    for (const [mutationId, mutation] of Object.entries(mutations)) {
      operations.push(
        createNode(mutation, `#/schema/mutations/${mutationId}`, 'operation'),
      )
    }
    const subscriptions = expandFragment.subscriptions ?? {}
    for (const [subscriptionId, subscription] of Object.entries(subscriptions)) {
      operations.push(
        createNode(subscription, `#/schema/subscriptions/${subscriptionId}`, 'operation'),
      )
    }
    return operations
  }
  if (isGraphApiOperation(expandFragment)) {
    const args = expandFragment.args ? createNode(expandFragment.args, genID(), 'args') : null
    const output = createNode(expandFragment.output, genID(), 'output')
    return args ? [args, output] : [output]
  }
  if (kind === 'args') {
    const args = []
    for (const [argId, arg] of Object.entries(expandFragment)) {
      args.push(createNode(arg, `${genID()}/${argId}`, 'arg'))
    }
    return args
  }
  if (kind === 'arg') {
    const children = []
    if (isGraphApiInputObjectDefinition(expandFragment.typeDef)) {
      const props = expandFragment.typeDef.properties ?? {}
      for (const [fieldId, field] of Object.entries(props)) {
        children.push(createNode(field, `${genID()}/${fieldId}`, 'property'))
      }
    }
    return children
  }
  if (kind === 'output') {
    const children = []
    if (
      isGraphApiObjectDefinition(expandFragment.typeDef) ||
      isGraphApiInterfaceDefinition(expandFragment.typeDef)
    ) {
      const methods = expandFragment.typeDef.type.methods ?? {}
      for (const [methodId, method] of Object.entries(methods)) {
        children.push(createNode(method, `${genID()}/${methodId}`, 'method'))
      }
    }
    if (isGraphApiInputObjectDefinition(expandFragment.typeDef)) {
      const props = expandFragment.typeDef.type.properties ?? {}
      for (const [fieldId, field] of Object.entries(props)) {
        children.push(createNode(field, `${genID()}/${fieldId}`, 'property'))
      }
    }
    return children
  }
  return []
}

export function buildTree(source: any): any {
  const tree = {
    root: createNode(source, '#', 'schema'),
  }

  return tree
}
