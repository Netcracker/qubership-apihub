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

// import { DIFF_OPERATION_ACTION } from '../../consts'
//
// const actions: Record<string, '[Added]' | '[Deleted]' | '[Changed]'> = {
//   [DIFF_OPERATION_ACTION.ADD]: '[Added]',
//   [DIFF_OPERATION_ACTION.REPLACE]: '[Changed]',
//   [DIFF_OPERATION_ACTION.REMOVE]: '[Deleted]',
// }
//
// const targetProperty = (path: any, from: number, prefix = ''): string => {
//   if (from >= path.length) {
//     return prefix
//   }
//
//   if (path[from] === 'properties' && from < path.length) {
//     prefix += prefix ? `.${String(path[from + 1])}` : String(path[from + 1])
//     return targetProperty(path, from + 2, prefix)
//   } else if (path[from] === 'items') {
//     prefix += '[]'
//   }
//   return targetProperty(path, from + 1, prefix)
// }
//
// const mark = (text: string | number): string => `\`${text}\``
//
// const validatorRule = (index: number): any => ({ action, key, path }) => {
//   const target = targetProperty(path, index)
//
//   return `${actions[action]} ${key} validator ${target ? `for ${target}` : ''}`
// }
//
// const propertyList = (node: any, path: any, index: number): string => {
//   return Object.keys(node || {})
//     .map((prop) => mark(targetProperty([...path, prop], index)))
//     .join(', ')
// }
//
// const requiredList = (required: string[], path: any, index: number): string => {
//   return (required.length > 1 ? 'properties ' : 'property ') +
//     required
//       .map((prop) => mark(targetProperty([...path, 'properties', prop], index)))
//       .join(', ')
// }
//
// const requiredProperty = (name: string, path: any, index: number): string => {
//   const target = targetProperty(path, index)
//
//   return mark(target ? `${target}.${name}` : name)
// }
//
// const propertyRule = (target: string, index: number): any => ({ action, path }) => {
//   const property = targetProperty(path, index)
//   const propertyLocation = property && property !== '[]' ? `property ${mark(property)}` : ''
//
//   if (!propertyLocation) {
//     return `${actions[action]} ${target}`
//   }
//
//   return `${actions[action]} ${target ? `${target} ${dir(action)} ` : ''}${propertyLocation}`
// }
//
// const argumentRule = (target: string, index: number): any => ({ action, path }) => {
//   const argument = targetProperty(path, index)
//   const argumentLocation = argument && argument !== '[]' ? `argument ${mark(argument)}` : ''
//
//   return `${actions[action]} ${target ? `${target} ${dir(action)} ` : ''}${argumentLocation}`
// }
//
// const dir = (action: string): string => {
//   if (action === DIFF_OPERATION_ACTION.ADD) {
//     return 'to'
//   } else if (action === DIFF_OPERATION_ACTION.REMOVE) {
//     return 'from'
//   } else {
//     return 'of'
//   }
// }
//
// const changeSchemaRules = (index: number = 0, isArgument?: boolean): ChangeDocRules => ({
//   // property
//   '/': isArgument ? argumentRule('', index) : propertyRule('', index),
//   // validators
//   '/multipleOf': validatorRule(index),
//   '/maximum': validatorRule(index),
//   '/exclusiveMaximum': validatorRule(index),
//   '/minimum': validatorRule(index),
//   '/exclusiveMinimum': validatorRule(index),
//   '/maxLength': validatorRule(index),
//   '/minLength': validatorRule(index),
//   '/pattern': validatorRule(index),
//   '/maxItems': validatorRule(index),
//   '/minItems': validatorRule(index),
//   '/uniqueItems': validatorRule(index),
//   '/maxProperties': validatorRule(index),
//   '/minProperties': validatorRule(index),
//   // items
//   '/items': () => changeSchemaRules(index, isArgument),
//   '/args': {
//     '/': ({
//       action,
//     }) => `${actions[action]} arguments`,
//     '/*': () => changeSchemaRules(index, true),
//   },
//   // properties
//   '/properties': {
//     '/': ({ action, path, node }) => `${actions[action]} properties ${propertyList(node, path, index)}`,
//     '/*': () => changeSchemaRules(index, isArgument),
//   },
//   // type
//   '/type': propertyRule('Type', index),
//   // required
//   '/required': {
//     '/': ({
//       action,
//       node,
//       path,
//     }) => `${actions[action]} Required status ${dir(action)} ${requiredList(node, path, index)}`,
//     '/*': ({
//       action,
//       parent,
//       key,
//       path,
//     }) => `${actions[action]} Required status ${dir(action)} property ${requiredProperty(parent[key], path, index)}`,
//   },
//   // value
//   '/format': propertyRule('Value format', index),
//   '/default': propertyRule('Default value', index),
//   '/nullable': propertyRule('Possible nullable value', index),
//   '/enum': propertyRule('Possible values', index),
//   // status
//   '/readOnly': propertyRule('Read-only status', index),
//   '/writeOnly': propertyRule('Write-only status', index),
//   '/deprecated': propertyRule('Deprecated status', index),
//   // polymorph
//   '/allOf': () => changeSchemaRules(index, isArgument),
//   '/oneOf': { '/*': () => changeSchemaRules(index, isArgument) },
//   '/anyOf': { '/*': () => changeSchemaRules(index, isArgument) },
//   '/not': () => changeSchemaRules(index, isArgument),
// })
//
// export const changeDocGraphQLRules: any = {
//   '/queries': {
//     '/': ({ action }) => `${actions[action]} Query`,
//     '/*': () => changeSchemaRules(),
//   },
//   '/mutations': {
//     '/': ({ action }) => `${actions[action]} Mutation`,
//     '/*': () => changeSchemaRules(),
//   },
//   '/subscriptions': {
//     '/': ({ action }) => `${actions[action]} Subscription`,
//     '/*': () => changeSchemaRules(),
//   },
//
//   '/components': {
//     '/scalars': {
//       '/*': changeSchemaRules(),
//     },
//     '/objects': {
//       '/*': changeSchemaRules(),
//     },
//     '/interfaces': {
//       '/*': changeSchemaRules(),
//     },
//     '/unions': {
//       '/*': changeSchemaRules(),
//     },
//     '/enums': {
//       '/*': changeSchemaRules(),
//     },
//     '/inputObjects': {
//       '/*': changeSchemaRules(),
//     },
//     '/directives': {
//       '/*': changeSchemaRules(),
//     },
//   },
// }
