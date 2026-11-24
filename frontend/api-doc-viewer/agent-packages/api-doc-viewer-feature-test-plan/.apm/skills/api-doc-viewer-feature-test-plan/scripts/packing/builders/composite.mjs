// Composite cases: many OpenAPI fixture cases merged into a few big operations, for a compact plan in which one
// manual case opens one operation and checks one of its sections. Each member case must have exactly one operation,
// with the same path and method on every side.
//
//   compositeCases({ code: 'cpar', layout: 'diffs', sources: [{ dir: 'openapi-diffs/query-parameters', code: 'dqp' }] })
//   compositeCases({ code: 'cjs', layout: 'plain', mode: 'schema-properties', sources: [{ build: () => … }] })
//
// Mode "operation" (default) merges the operations section by section:
// - lists and maps merge: parameters, security alternatives, response headers and links, media types, extensions,
//   and components. An entry whose name another member already uses with a different value is renamed with the
//   member's case ID: `status_dqp-07`, `X-Rate-Limit_drh-03`, `application/vnd.drb-02+json`, `Order_dsec-11`;
// - every other field (summary, deprecated, a response's description, a request body that is added or removed) has
//   one owner. Two members that both need the same field with different values go into different operations;
// - in diffs, a member needs only what it changes, and what refers to a component it changes; the rest of it is
//   context, kept where it does not collide with another member and dropped where it does.
// Mode "schema-properties" merges JSON Schema cases made by `wrapSchema` (json-schema.mjs): each member's request
// body schema becomes the property `<case ID>` of one object schema.
//
// Every diffs composite is checked with apiDiff: its diffs, with the renaming undone, must be exactly the diffs of
// its members. A member whose diffs are lost or changed by the merge is left out and returned as a case of its own.
// The returned cases carry `members` (id, fixture, baselineHint) for the package README and the results sheet.
import { HTTP_METHODS, diffsOf, isObject, sourceCases, stableStringify } from '../lib.mjs'

const same = (a, b) => stableStringify(a) === stableStringify(b)
const union = lists => [...new Set(lists.flat())]
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const MERGED_ROOT_KEYS = new Set(['openapi', 'info', 'paths', 'components'])

// ----- Members -----

// The single operation of every side, or undefined when a side has none, several, or another path or method.
function memberShape(item) {
  const operations = item.sides.map(document => Object.entries(document.paths ?? {}).flatMap(([p, pathItem]) =>
    Object.keys(pathItem ?? {}).filter(key => HTTP_METHODS.has(key)).map(method => ({ path: p, method }))))
  if (operations.some(list => list.length !== 1)) return undefined
  const [{ path: first, method }] = operations[0]
  if (operations.some(([o]) => o.path !== first || o.method !== method)) return undefined
  return {
    path: first,
    method,
    staticPath: first.split('/').filter(segment => segment && !segment.startsWith('{')).join('/'),
    signature: stableStringify(item.sides.map(document => Object.fromEntries(
      Object.entries(document).filter(([key]) => !MERGED_ROOT_KEYS.has(key) || key === 'openapi')))),
  }
}

// Component keys ("schemas/Order") that a value defines or refers to; security requirements name schemes too.
function usedComponents(value, keys = new Set(), parentKey) {
  if (Array.isArray(value)) {
    if (parentKey === 'security') {
      for (const requirement of value) for (const name of Object.keys(requirement ?? {})) keys.add(`securitySchemes/${name}`)
    }
    value.forEach(item => usedComponents(item, keys))
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string' && child.startsWith('#/components/')) {
        const [section, name] = child.slice('#/components/'.length).split('/')
        keys.add(`${section}/${name.replace(/~1/g, '/').replace(/~0/g, '~')}`)
      } else {
        usedComponents(child, keys, key)
      }
    }
  }
  return keys
}

const componentValue = (document, key) => {
  const slash = key.indexOf('/')
  return document.components?.[key.slice(0, slash)]?.[key.slice(slash + 1)]
}

// Renames components ("schemas/Order" -> "Order_<id>") in a document: definitions, $refs, discriminator mappings,
// and the scheme names of security requirements.
function renameComponents(document, renames) {
  if (!renames.size) return document
  const refOf = key => `#/components/${key.slice(0, key.indexOf('/'))}/${key.slice(key.indexOf('/') + 1)}`
  const refs = new Map([...renames].map(([key, name]) => [refOf(key), refOf(`${key.slice(0, key.indexOf('/'))}/${name}`)]))
  const visit = (value, parentKey) => {
    if (Array.isArray(value)) {
      return value.map(item => (parentKey === 'security' && isObject(item)
        ? Object.fromEntries(Object.entries(item).map(([name, scopes]) =>
          [renames.get(`securitySchemes/${name}`) ?? name, scopes]))
        : visit(item)))
    }
    if (!isObject(value)) return typeof value === 'string' && refs.has(value) ? refs.get(value) : value
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child, key)]))
  }
  const copy = visit(document)
  for (const [key, name] of renames) {
    const section = key.slice(0, key.indexOf('/'))
    const old = key.slice(key.indexOf('/') + 1)
    const entries = copy.components?.[section]
    if (entries && old in entries) {
      copy.components[section] = Object.fromEntries(Object.entries(entries).map(([k, v]) => [k === old ? name : k, v]))
    }
  }
  return copy
}

// Components that change between the sides, and the components that refer to them, transitively.
function affectedComponents(sides) {
  const keys = union(sides.map(document => Object.entries(document.components ?? {})
    .flatMap(([section, entries]) => Object.keys(entries ?? {}).map(name => `${section}/${name}`))))
  const affected = new Set(keys.filter(key => !same(...sides.map(document => componentValue(document, key)))))
  for (let grown = true; grown;) {
    grown = false
    for (const key of keys) {
      if (affected.has(key)) continue
      if (sides.some(document => [...usedComponents(componentValue(document, key))].some(k => affected.has(k)))) {
        affected.add(key)
        grown = true
      }
    }
  }
  return affected
}

// ----- Units: the pieces of an operation that merge one by one -----

const get = (tree, loc) => loc.reduce((value, token) => (value === undefined ? undefined : value[token]), tree)

// Units of the path item ("item") and the operation ("op") of each side. A unit is
// { kind, loc, values }: kind "owner" (one member owns it), "entry" (a map entry, renamed on collision), "param"
// (a parameter, renamed on collision), or "list" (security alternatives, concatenated).
function unitsOf(trees) {
  const units = []
  const add = (kind, loc, extra = {}) => units.push({ kind, loc, values: trees.map(t => get(t, loc)), ...extra })
  const keysAt = loc => union(trees.map(t => Object.keys(get(t, loc) ?? {})))
  const entries = (loc, rename) => keysAt(loc).forEach(key => add('entry', [...loc, key], { rename }))
  for (const scope of ['item', 'op']) {
    for (const key of keysAt([scope])) {
      if (key === 'parameters') {
        const ids = trees.map(t => (get(t, [scope, key]) ?? []).map(p => (p.$ref ? `ref:${p.$ref}` : `${p.in}:${p.name}`)))
        for (const id of union(ids)) {
          units.push({
            kind: 'param',
            loc: [scope, key, id],
            values: trees.map((t, side) => (get(t, [scope, key]) ?? [])[ids[side].indexOf(id)]),
          })
        }
      } else if (scope === 'op' && key === 'requestBody') {
        const bodies = trees.map(t => t.op.requestBody)
        if (bodies.some(body => body === undefined || body.$ref)) {
          add('owner', ['op', key])
        } else {
          for (const field of keysAt(['op', key])) {
            if (field === 'content') entries(['op', key, 'content'], 'media')
            else add(field.startsWith('x-') ? 'entry' : 'owner', ['op', key, field], { rename: 'key' })
          }
        }
      } else if (scope === 'op' && key === 'responses') {
        for (const code of keysAt(['op', key])) {
          const responses = trees.map(t => t.op.responses?.[code])
          if (code.startsWith('x-')) add('entry', ['op', key, code], { rename: 'key' })
          else if (responses.some(response => response === undefined || response.$ref)) add('owner', ['op', key, code])
          else {
            for (const field of keysAt(['op', key, code])) {
              const loc = ['op', key, code, field]
              if (field === 'content') entries(loc, 'media')
              else if (field === 'headers' || field === 'links') entries(loc, 'key')
              else add(field.startsWith('x-') ? 'entry' : 'owner', loc, { rename: 'key' })
            }
          }
        }
      } else if (scope === 'op' && key === 'security') {
        add('list', ['op', key])
      } else {
        add(key.startsWith('x-') ? 'entry' : 'owner', [scope, key], { rename: 'key' })
      }
    }
  }
  return units
}

const renamedKey = (key, rename, id) => {
  if (rename !== 'media') return `${key}_${id}`
  const slash = key.indexOf('/')
  return slash < 0 ? `${key}_${id}` : `${key.slice(0, slash)}/vnd.${id}+${key.slice(slash + 1)}`
}

const locKey = loc => loc.join('\u0000')
const isPrefix = (a, b) => a.length < b.length && a.every((token, i) => token === b[i])

// ----- Composites -----

function emptyComposite(shape, item) {
  return {
    method: shape.method,
    staticPath: shape.staticPath,
    // The path of the first member; path parameters of later members are appended to it.
    basePath: shape.path,
    signature: shape.signature,
    roots: item.sides.map(document => Object.fromEntries(
      Object.entries(document).filter(([key]) => !MERGED_ROOT_KEYS.has(key)))),
    openapi: item.sides.map(document => document.openapi),
    pathParams: [],
    units: new Map(),
    components: item.sides.map(() => ({})),
    members: [],
  }
}

function cloneComposite(composite) {
  return { ...structuredClone({ ...composite, units: undefined }), units: new Map(structuredClone([...composite.units])) }
}

// Adds a member to a copy of the composite, or returns undefined when it does not fit.
function withMember(composite, item, shape, layout) {
  if (shape.method !== composite.method || shape.staticPath !== composite.staticPath ||
    shape.signature !== composite.signature) return undefined
  const next = cloneComposite(composite)
  // Components: a key that the composite has with another value on any side is renamed.
  const renames = new Map()
  const rootKeys = new Set(item.sides.flatMap(document => [...usedComponents(Object.fromEntries(
    Object.entries(document).filter(([key]) => !MERGED_ROOT_KEYS.has(key))))]))
  const memberKeys = union(item.sides.map(document => [...usedComponents(document.paths),
    ...Object.entries(document.components ?? {}).flatMap(([s, e]) => Object.keys(e ?? {}).map(n => `${s}/${n}`))]))
  const compositeKeys = new Set(next.components.flatMap(c => Object.entries(c)
    .flatMap(([s, e]) => Object.keys(e).map(n => `${s}/${n}`))))
  for (const key of memberKeys) {
    if (!compositeKeys.has(key)) continue
    const differs = item.sides.some((document, side) =>
      !same(componentValue(document, key), next.components[side][key.slice(0, key.indexOf('/'))]?.[key.slice(key.indexOf('/') + 1)]))
    if (!differs) continue
    if (rootKeys.has(key)) return undefined
    const name = `${key.slice(key.indexOf('/') + 1)}_${item.id}`
    if (compositeKeys.has(`${key.slice(0, key.indexOf('/'))}/${name}`)) return undefined
    renames.set(key, name)
  }
  const sides = item.sides.map(document => renameComponents(document, renames))
  const trees = sides.map(document => {
    const pathItem = document.paths[shape.path]
    const { [shape.method]: op, ...rest } = pathItem
    return { item: Object.fromEntries(Object.entries(rest).filter(([k]) => !HTTP_METHODS.has(k))), op }
  })
  const affected = layout === 'diffs' ? affectedComponents(sides) : new Set()
  const relevantUnit = unit => layout === 'plain' || !same(...unit.values) ||
    unit.values.some(value => [...usedComponents(value, new Set(), unit.loc.at(-1))].some(key => affected.has(key)))

  for (const unit of unitsOf(trees)) {
    unit.changed = layout === 'diffs' && !same(...unit.values)
    unit.relevant = relevantUnit(unit)
    unit.member = item.id
    let key = locKey(unit.loc)
    // An owner of a whole object against parts of it (a response added in one member, a header of the same
    // response changed in another): the relevant one wins; two relevant ones do not fit.
    const related = [...next.units.values()].filter(u => isPrefix(u.loc, unit.loc) || isPrefix(unit.loc, u.loc))
    if (related.length) {
      if (!unit.relevant) continue
      if (related.some(u => u.relevant)) return undefined
      for (const u of related) next.units.delete(locKey(u.loc))
    }
    const existing = next.units.get(key)
    if (existing) {
      if (unit.kind === 'entry' || unit.kind === 'param') {
        if (!unit.changed && same(unit.values, existing.values)) continue
        if (!unit.relevant) continue
        if (unit.kind === 'param') {
          if (unit.loc[2].startsWith('ref:')) return undefined
          unit.values = unit.values.map(p => (p ? { ...p, name: `${p.name}_${item.id}` } : p))
          unit.loc = [...unit.loc.slice(0, 2), `${unit.values.find(Boolean).in}:${unit.values.find(Boolean).name}`]
        } else {
          unit.loc = [...unit.loc.slice(0, -1), renamedKey(unit.loc.at(-1), unit.rename, item.id)]
        }
        key = locKey(unit.loc)
        if (next.units.has(key)) return undefined
      } else if (unit.kind === 'list') {
        if (same(unit.values, existing.values) || !unit.relevant) continue
        existing.values = existing.values.map((list, side) => [...(list ?? []), ...(unit.values[side] ?? [])])
        existing.relevant = true
        continue
      } else {
        if (same(unit.values, existing.values) || !unit.relevant) continue
        if (existing.relevant) return undefined
      }
    }
    next.units.set(key, unit)
    const path = unit.kind === 'param' && unit.values.find(Boolean)
    if (path && path.in === 'path' && !next.pathParams.includes(path.name)) next.pathParams.push(path.name)
  }
  sides.forEach((document, side) => {
    for (const [section, entries] of Object.entries(document.components ?? {})) {
      next.components[side][section] ??= {}
      Object.assign(next.components[side][section], entries)
    }
  })
  next.members.push({ id: item.id, fixture: item.fixture, ...(item.baselineHint ? { baselineHint: item.baselineHint } : {}) })
  return next
}

function compositeDocuments(composite, title) {
  const path = composite.basePath + composite.pathParams.filter(name => !composite.basePath.includes(`{${name}}`))
    .map(name => `/{${name}}`).join('')
  return composite.openapi.map((openapi, side) => {
    const tree = { item: {}, op: {} }
    for (const unit of composite.units.values()) {
      const value = unit.values[side]
      if (value === undefined) continue
      if (unit.kind === 'param') {
        const parent = get(tree, unit.loc.slice(0, 1))
        parent.parameters ??= []
        parent.parameters.push(value)
        continue
      }
      let target = tree
      for (const token of unit.loc.slice(0, -1)) target = target[token] ??= {}
      target[unit.loc.at(-1)] = value
    }
    const components = Object.fromEntries(Object.entries(composite.components[side]).filter(([, e]) => Object.keys(e).length))
    return {
      openapi,
      info: { title, version: '1.0.0' },
      ...composite.roots[side],
      paths: { [path]: { ...tree.item, [composite.method]: tree.op } },
      ...(Object.keys(components).length ? { components } : {}),
    }
  })
}

// ----- Schema-properties mode -----

const BODY_SCHEMA = ['requestBody', 'content', 'application/json', 'schema']

function withSchemaMember(composite, item, shape) {
  if (shape.method !== composite.method || shape.staticPath !== composite.staticPath ||
    shape.signature !== composite.signature) return undefined
  const operation = document => document.paths[shape.path][shape.method]
  // Only operations as wrapSchema() makes them: a request body schema, responses, and a summary.
  if (item.sides.some(document => get(operation(document), BODY_SCHEMA) === undefined ||
    Object.keys(operation(document)).some(key => !['requestBody', 'responses', 'summary'].includes(key)) ||
    Object.keys(document.paths[shape.path]).length !== 1)) return undefined
  const next = cloneComposite(composite)
  const renames = new Map()
  const compositeKeys = new Set(next.components.flatMap(c => Object.entries(c).flatMap(([s, e]) => Object.keys(e).map(n => `${s}/${n}`))))
  for (const key of union(item.sides.map(document => [...usedComponents(document)]))) {
    if (compositeKeys.has(key) && item.sides.some((document, side) =>
      !same(componentValue(document, key), next.components[side][key.slice(0, key.indexOf('/'))]?.[key.slice(key.indexOf('/') + 1)]))) {
      renames.set(key, `${key.slice(key.indexOf('/') + 1)}_${item.id}`)
    }
  }
  const sides = item.sides.map(document => renameComponents(document, renames))
  next.units.set(item.id, { kind: 'property', loc: [item.id], values: sides.map(d => get(operation(d), BODY_SCHEMA)), member: item.id })
  sides.forEach((document, side) => {
    for (const [section, entries] of Object.entries(document.components ?? {})) {
      next.components[side][section] ??= {}
      Object.assign(next.components[side][section], entries)
    }
  })
  next.base ??= sides.map(document => operation(document))
  next.members.push({ id: item.id, fixture: item.fixture, ...(item.baselineHint ? { baselineHint: item.baselineHint } : {}) })
  return next
}

function schemaDocuments(composite, title) {
  return composite.openapi.map((openapi, side) => {
    const properties = Object.fromEntries([...composite.units.values()].map(u => [u.loc[0], u.values[side]]))
    const { requestBody, ...operation } = composite.base[side]
    const components = Object.fromEntries(Object.entries(composite.components[side]).filter(([, e]) => Object.keys(e).length))
    return {
      openapi,
      info: { title, version: '1.0.0' },
      ...composite.roots[side],
      paths: {
        [composite.basePath]: {
          [composite.method]: {
            ...operation,
            requestBody: { ...requestBody, content: { 'application/json': { schema: { type: 'object', properties } } } },
          },
        },
      },
      ...(Object.keys(components).length ? { components } : {}),
    }
  })
}

// ----- The apiDiff check -----

const SPLIT_PARENTS = new Set(['parameters', 'headers', 'content', 'links', 'security'])

// Comparable diffs: the path and method left out, list indexes of parameters and security alternatives left out,
// and an add or remove of a whole list or map (all headers of a response) split into its entries, because in a
// composite another member's entries keep the container.
function diffKeys(before, after, members, mode) {
  const ids = members.map(m => m.id).sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')
  const unrename = ids
    ? text => text.replace(new RegExp(`vnd\\.(?:${ids})\\+`, 'g'), '').replace(new RegExp(`_(?:${ids})\\b`, 'g'), '')
    : text => text
  const normalize = declarationPath => {
    let p = declarationPath
    if (p[0] === 'paths') p = p.length > 2 && HTTP_METHODS.has(p[2]) ? ['op', ...p.slice(3)] : ['item', ...p.slice(2)]
    if (mode === 'schema-properties' && members.length && p[0] === 'op' && BODY_SCHEMA.every((t, i) => p[i + 1] === t) &&
      p[5] === 'properties') p = [...p.slice(0, 5), ...p.slice(7)]
    return p.map((token, i) => (typeof token === 'number' && ['parameters', 'security'].includes(p[i - 1]) ? '*' : token))
  }
  const split = d => {
    const key = d.action === 'add' ? 'afterDeclarationPaths' : 'beforeDeclarationPaths'
    const valueKey = d.action === 'add' ? 'afterValue' : 'beforeValue'
    const [first] = d[key] ?? []
    if (!['add', 'remove'].includes(d.action) || !first || (d[key] ?? []).length !== 1 || !isObject(d[valueKey])) return [d]
    const last = first.at(-1)
    const isComponents = first[0] === 'components' && first.length <= 2
    if (!SPLIT_PARENTS.has(last) && !isComponents) return [d]
    const entries = Array.isArray(d[valueKey]) ? d[valueKey].map((v, i) => [i, v]) : Object.entries(d[valueKey])
    return entries.flatMap(([k, v]) => split({ ...d, [valueKey]: v, [key]: [[...first, k]] }))
  }
  return diffsOf(before, after).flatMap(split).map(d => ({
    raw: stableStringify([d.beforeDeclarationPaths, d.afterDeclarationPaths]),
    key: unrename(stableStringify({
      action: d.action,
      type: d.type,
      before: (d.beforeDeclarationPaths ?? []).map(normalize),
      after: (d.afterDeclarationPaths ?? []).map(normalize),
      beforeValue: d.beforeValue,
      afterValue: d.afterValue,
    })),
  }))
}

const count = keys => keys.reduce((map, k) => map.set(k, (map.get(k) ?? 0) + 1), new Map())

// The members whose diffs the composite does not reproduce exactly.
function lostMembers(documents, composite, memberCases, mode) {
  const actual = count(diffKeys(documents[0], documents[1], composite.members, mode).map(d => d.key))
  const perMember = composite.members.map(m => {
    const item = memberCases.get(m.id)
    return { id: m.id, keys: diffKeys(item.sides[0], item.sides[1], [], mode).map(d => d.key) }
  })
  const expected = count(perMember.flatMap(m => m.keys))
  const lost = new Set()
  for (const m of perMember) {
    const missing = m.keys.filter(k => (actual.get(k) ?? 0) < (expected.get(k) ?? 0))
    if (!missing.length) continue
    lost.add(m.id)
    if (process.env.COMPOSITE_DEBUG) console.error(`${m.id} missing:\n  ${missing.join('\n  ')}`)
  }
  const unexpected = [...actual].filter(([k, n]) => n > (expected.get(k) ?? 0)).map(([k]) => k)
  if (process.env.COMPOSITE_DEBUG && unexpected.length) console.error(`unexpected:\n  ${unexpected.join('\n  ')}`)
  if (unexpected.length && !lost.size) {
    // Attribute an unexpected diff to the member whose case ID it carries, or else to the last member.
    const raw = diffKeys(documents[0], documents[1], composite.members, mode)
    for (const k of unexpected) {
      const { raw: text } = raw.find(d => d.key === k)
      const owner = composite.members.find(m => text.includes(`_${m.id}`) || text.includes(`vnd.${m.id}+`) ||
        text.includes(`"${m.id}"`))
      lost.add((owner ?? composite.members.at(-1)).id)
    }
  }
  return lost
}

// ----- The builder -----

export function compositeCases({ code, layout, sources, mode = 'operation', maxMembers = Infinity, title }) {
  const members = sources.flatMap(source => sourceCases(source, layout))
  const memberCases = new Map(members.map(m => [m.id, m]))
  // The case ID tells renamed names apart, so it must name one member only.
  if (memberCases.size !== members.length) {
    const seen = new Set()
    throw new Error(`${code}: duplicate member case IDs ${members.filter(m => seen.has(m.id) || !seen.add(m.id)).map(m => m.id).join(', ')}`)
  }
  const add = mode === 'schema-properties' ? withSchemaMember : (c, item, shape) => withMember(c, item, shape, layout)
  const documentsOf = mode === 'schema-properties' ? schemaDocuments : compositeDocuments
  const evicted = new Map()
  for (let round = 0; ; round++) {
    const composites = []
    const standalone = []
    for (const item of members) {
      const shape = memberShape(item)
      if (!shape || evicted.has(item.id)) {
        standalone.push(item)
        continue
      }
      let placed = false
      for (let i = 0; i < composites.length && !placed; i++) {
        if (composites[i].members.length >= maxMembers) continue
        const next = add(composites[i], item, shape)
        if (next) {
          composites[i] = next
          placed = true
        }
      }
      if (!placed) {
        const next = add(emptyComposite(shape, item), item, shape)
        if (next) composites.push(next)
        else standalone.push(item)
      }
    }
    const cases = composites.map((composite, index) => {
      const id = `${code}-${String(index + 1).padStart(2, '0')}`
      return {
        id,
        fixture: `composite of ${composite.members.length} cases`,
        title: `${title ?? 'Composite'}: ${composite.members.length} cases`,
        members: composite.members,
        sides: documentsOf(composite, `${title ?? 'Composite'} ${id}`),
        composite,
      }
    })
    const lost = new Set()
    if (layout === 'diffs') {
      for (const item of cases) {
        for (const id of lostMembers(item.sides, item.composite, memberCases, mode)) lost.add(id)
      }
    }
    if (!lost.size || round > 20) {
      if (lost.size) throw new Error(`${code}: the composites still lose diffs of ${[...lost].join(', ')}`)
      if (evicted.size || standalone.length) {
        console.error(`${code}: ${members.length - standalone.length} cases in ${cases.length} composites; ` +
          `${standalone.length} on their own${standalone.length ? `: ${standalone.map(s => s.id).join(', ')}` : ''}`)
      }
      return [...cases.map(({ composite, ...rest }) => rest), ...standalone]
    }
    for (const id of lost) evicted.set(id, round)
  }
}
