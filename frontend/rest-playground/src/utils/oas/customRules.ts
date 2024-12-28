import { breaking, matchRule, openapi3MethodRules, openapi3Rules, Rules } from 'api-smart-diff'

const anyMethodMatchRules = (rules: Rules): Rules => matchRule(rules, () => true)
const anyArrayMatchRules = (rules: unknown): Rules => anyMethodMatchRules(rules as Rules)

export const customRules = {
  ...openapi3Rules,
  '/paths': anyArrayMatchRules({
    '/': [breaking, breaking, breaking],
    '/*': anyMethodMatchRules({
      ...openapi3MethodRules,
      '/': [breaking, breaking, breaking],
    }),
  }),
}
