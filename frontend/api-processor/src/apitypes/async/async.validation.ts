import type { Parser, ParseOutput, Diagnostic } from '@asyncapi/parser'
import { RulesetOptions } from '@asyncapi/parser/esm/ruleset'

export interface ValidationError {
  message: string
  path?: string
  severity?: number
}

class AsyncApiValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AsyncApiValidationError'
  }
}

let cachedParserClass: typeof Parser | undefined

async function getParserClass(): Promise<typeof Parser> {
  if (cachedParserClass) {
    return cachedParserClass
  }

  // Dynamic import — bundler will use appropriate version based on environment.
  // Browser builds will use @asyncapi/parser/browser automatically via vite alias.
  const parserModule = await import('@asyncapi/parser')

  // Handle different export formats (ESM named export vs default export)
  const ParserClass = (parserModule as { Parser?: typeof Parser; default?: typeof Parser }).Parser ||
    parserModule.default as typeof Parser

  if (!ParserClass) {
    throw new Error('AsyncAPI Parser class not found in module exports')
  }

  cachedParserClass = ParserClass
  return ParserClass
}

/**
 * Parser ruleset options with intentionally suppressed rules.
 *
 * asyncapi-latest-version: fires when the document uses AsyncAPI 3.0.0 instead of the newest
 * version known to the parser. We support 3.0.0 documents and do not want to treat
 * "not the latest version" as an error or warning.
 */
const ASYNCAPI_PARSER_RULESET: RulesetOptions = {
  extends: [],
  rules: {
    'asyncapi-latest-version': 'off',
  },
}

/**
 * Validates AsyncAPI document using official parser.
 * This provides spec validation while avoiding circular reference issues
 * by using the parser only for validation, not for the actual parsing.
 *
 * @throws AsyncApiValidationError when critical validation errors (severity 0) are found
 * @returns Non-critical diagnostics (warnings, info) to be collected as notifications
 */
export async function validateAsyncApiDocument(sourceString: string): Promise<ValidationError[] | undefined> {
  try {
    const ParserClass = await getParserClass()
    const parser: Parser = new ParserClass({ ruleset: ASYNCAPI_PARSER_RULESET })
    const { diagnostics }: ParseOutput = await parser.parse(sourceString)

    const criticalErrors: Diagnostic[] = diagnostics.filter(diagnostic => diagnostic.severity === 0)
    const nonCriticalDiagnostics: Diagnostic[] = diagnostics.filter(diagnostic => diagnostic.severity > 0)

    if (criticalErrors.length > 0) {
      const errorMessages = criticalErrors.map(err => {
        const location = err.range ? ` at line ${err.range.start.line}` : ''
        return `${err.message}${location}`
      }).join('; ')

      throw new AsyncApiValidationError(`AsyncAPI validation failed: ${errorMessages}`)
    }

    if (nonCriticalDiagnostics.length > 0) {
      return nonCriticalDiagnostics.map(diagnostic => ({
        message: diagnostic.message,
        path: diagnostic.range ? `Line ${diagnostic.range.start.line}` : undefined,
        severity: diagnostic.severity,
      }))
    }

    return undefined
  } catch (error) {
    if (error instanceof AsyncApiValidationError) {
      throw error
    }

    throw new Error(`AsyncAPI validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
