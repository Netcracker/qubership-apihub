import { expect, test } from '@playwright/test'
import type { LintRulesetApiType, RulesetWithFile } from '@portal/entities'
import { LintRulesetLinters, LintRulesetStatuses } from '@portal/entities'
import { getAuthDataFromApi } from '@services/auth'
import {
  type CreateLintRulesetRestParams,
  createRestWithToken,
  type LintRulesetRestDto,
  rActivateRuleset,
  rClearLinterTestData,
  rCreateRuleset,
  rDeleteRuleset,
  type Rest,
  rGetRuleset,
  rGetRulesets,
  rGetValidationStatus,
  rRunValidation,
  type RunValidationRestParams,
  type ValidationStatusRestDto,
} from '@services/rest'
import type { IdRestParams } from '@services/rest/rest.types'
import type { IdNameTdmParams } from '@services/test-data-manager/tdm.entities'
import { asyncTimeout, getRestFailMsg, getTestIdFromName } from '@services/utils'
import type { Credentials } from '@shared/entities'
import { ALIAS_PREFIX } from '@test-data'
import { BASE_URL } from '@test-setup'

export type LintRulesetNameTdmParams = Readonly<{ rulesetName: string; apiType: LintRulesetApiType }>

export const createRulesetsTDM = async (
  credentials: Credentials,
  requestTimeout?: number,
): Promise<LintRulesetsTestDataManager> => {
  const { token } = await getAuthDataFromApi(BASE_URL, credentials)
  const rest = await createRestWithToken(BASE_URL, token, requestTimeout)
  return new LintRulesetsTestDataManager(rest)
}

export class LintRulesetsTestDataManager {
  private readonly rest: Rest

  constructor(rest: Rest) {
    this.rest = rest
  }

  async createRuleset({
    name,
    apiType,
    linter = LintRulesetLinters.SPECTRAL,
    file,
  }: CreateLintRulesetRestParams): Promise<RulesetWithFile> {
    const message = `"${name}" ruleset of ${apiType} API type creation`

    const existingRuleset = await this.getRulesetByName({ rulesetName: name, apiType: apiType })
    if (existingRuleset) {
      await test.step(`${message} (skipped: already exists)`, async () => {
        expect(existingRuleset.name).toBe(name)
        expect(existingRuleset.apiType).toBe(apiType)
        expect(existingRuleset.linter).toBe(linter)
        expect(existingRuleset.fileName).toBe(file.name)
      }, { box: true })

      return {
        id: existingRuleset.id,
        name: existingRuleset.name,
        apiType: apiType,
        file: file,
      }
    }

    let createdRulesetDto!: LintRulesetRestDto

    await test.step(message, async () => {
      const response = await this.rest.send(rCreateRuleset, [201], {
        name,
        apiType,
        linter,
        file,
      })

      if (response.status() !== 201) {
        throw Error(await getRestFailMsg(message, response))
      }

      createdRulesetDto = await response.json()
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      if (!createdRulesetDto) {
        throw Error(await getRestFailMsg(`Checking ${message}`))
      }

      const ruleset = await this.getRulesetById(createdRulesetDto)
      expect(ruleset).toBeDefined()
      expect(ruleset?.name).toBe(name)
      expect(ruleset?.apiType).toBe(apiType)
      expect(ruleset?.linter).toBe(linter)
    }, { box: true })

    return {
      id: createdRulesetDto.id,
      name: createdRulesetDto.name,
      apiType: apiType,
      file: file,
    }
  }

  async activateRuleset({ id, name }: IdNameTdmParams): Promise<void> {
    const message = `"${name || id}" ruleset activation`

    await test.step(message, async () => {
      const response = await this.rest.send(rActivateRuleset, [204], { id })

      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const ruleset = await this.getRulesetById({ id })
      expect(ruleset).toBeDefined()
      expect(ruleset?.status.toLowerCase()).toBe(LintRulesetStatuses.ACTIVE.toLowerCase())
    }, { box: true })
  }

  async deleteRuleset({ id, name }: IdNameTdmParams): Promise<void> {
    const message = `"${name || id}" ruleset deletion`

    await test.step(message, async () => {
      const response = await this.rest.send(rDeleteRuleset, [204], { id })

      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const ruleset = await this.getRulesetById({ id })
      expect(ruleset).toBeUndefined()
    }, { box: true })
  }

  async getRulesetById({ id }: IdRestParams): Promise<LintRulesetRestDto | undefined> {
    let ruleset: LintRulesetRestDto | undefined
    const message = `"${id}" ruleset getting`

    await test.step(message, async () => {
      const response = await this.rest.send(rGetRuleset, [200, 404], { id })

      if (response.status() !== 200 && response.status() !== 404) {
        throw Error(await getRestFailMsg(message, response))
      }

      if (response.status() === 200) {
        ruleset = await response.json()
      }
    }, { box: true })

    return ruleset
  }

  private async getRulesets(): Promise<LintRulesetRestDto[]> {
    const message = 'Getting rulesets list'

    let rulesets: LintRulesetRestDto[] = []

    await test.step(message, async () => {
      const response = await this.rest.send(rGetRulesets, [200])

      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }

      rulesets = await response.json()
    }, { box: true })

    return rulesets
  }

  async getRulesetByName(
    { rulesetName, apiType }: LintRulesetNameTdmParams,
  ): Promise<LintRulesetRestDto | undefined> {
    const message = `"${rulesetName}" ruleset of ${apiType} API type getting`

    let ruleset: LintRulesetRestDto | undefined

    await test.step(message, async () => {
      const rulesets = await this.getRulesets()
      ruleset = rulesets.find((r) => r.name === rulesetName && r.apiType === apiType)
    }, { box: true })

    return ruleset
  }

  async deleteTestRulesets(testId: string | string[]): Promise<void> {
    const testIds = Array.isArray(testId) ? testId : [testId]
    const testIdsStr = testIds.join(', ')
    const message = `"${testIdsStr}" test ruleset deletion`

    await test.step(message, async () => {
      for (const id of testIds) {
        const response = await this.rest.send(rClearLinterTestData, [204], { testId: id })
        if (response.status() !== 204) {
          throw Error(await getRestFailMsg(message, response))
        }
        console.log(`Rulesets with "${id}" test ID deleted`)
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const response = await this.rest.send(rGetRulesets, [200])

      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }

      const rulesets: LintRulesetRestDto[] = await response.json()

      // Verify that no ruleset names contain any of the test IDs after deletion.
      expect(rulesets.every((r) => !testIds.some((id) => r.name.includes(id)))).toBeTruthy()
    }, { box: true })
  }

  async deleteAllTestRulesets(options?: { exclude: string[] }): Promise<void> {
    const exclude: string[] = []
    if (options) {
      exclude.push(...options.exclude)
    }
    console.log('Ruleset IDs for exclude: ', exclude)
    const message = 'Deleting all test rulesets'

    await test.step(message, async () => {
      const rulesets = await this.getRulesets()

      const testIds: string[] = []
      for (const ruleset of rulesets) {
        const testId = getTestIdFromName(ruleset.name, `${ALIAS_PREFIX}-`)
        if (testId && !exclude.includes(testId) && !testIds.includes(testId)) {
          testIds.push(testId)
        }
      }

      console.log('Ruleset IDs for deletion: ', testIds)
      if (testIds.length === 0) return

      await this.deleteTestRulesets(testIds)
    }, { box: true })
  }

  async waitForValidationToComplete({ packageId, version }: RunValidationRestParams): Promise<void> {
    await test.step(`Waiting for validation to complete for "${packageId}" package version "${version}"`, async () => {
      const maxAttempts = 30
      const pollInterval = 2000

      for (let i = 0; i < maxAttempts; i++) {
        const statusResponse = await this.rest.send(rGetValidationStatus, [200, 404], { packageId, version })

        if (statusResponse.status() === 200) {
          const statusData: ValidationStatusRestDto = await statusResponse.json()
          if (statusData.status === 'success' || statusData.status === 'error') {
            return
          }
        }

        await asyncTimeout(pollInterval)
      }

      throw Error(`Validation did not complete within ${maxAttempts * pollInterval / 1000} seconds`)
    }, { box: true })
  }

  async runValidation({ packageId, version }: RunValidationRestParams): Promise<void> {
    const message = `Running validation for "${packageId}" package version "${version}"`

    await test.step(message, async () => {
      const response = await this.rest.send(rRunValidation, [202], { packageId, version })

      if (response.status() !== 202) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await this.waitForValidationToComplete({ packageId, version })
  }
}
