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

import { EventType as ActivityType } from '../entities/activity-enums'
import { GENERAL_PAGE, PACKAGE_SETTINGS_PAGE, SUMMARY_ROUTE } from '../routes'
import type {
  Activity,
  CreateOrDeleteManualGroupEventDetails,
  GrantOrDeleteRoleActivityDetails,
  GroupParameter,
  PatchPackageMetaActivityDetails,
  PatchVersionMetaActivityDetails,
  PublishNewRevisionActivityDetails,
  PublishOrDeleteVersionActivityDetails,
  Role,
  UpdateOperationsGroupParametersEventDetails,
  UpdateRoleActivityDetails,
} from '@apihub/entities/activities'
import {
  GROUP_PARAMETER_DESCRIPTION,
  GROUP_PARAMETER_NAME,
  GROUP_PARAMETER_OPERATIONS,
  GROUP_PARAMETER_TEMPLATE,
} from '@apihub/entities/activities'
import { format } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { GROUP_TYPE_MANUAL, GROUP_TYPE_REST_PATH_PREFIX } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const EMPTY_ACTIVITY_MESSAGE: ActivityMessage = {
  messageTemplate: '',
}

export const LINK_PLACEHOLDER = '{link}'

type LinkData = {
  path: string
  displayName: string
}

export type ActivityMessage = {
  messageTemplate: string
  links?: LinkData[]
}

export interface ActivityMessageService {
  mapActivityToMessage(): ActivityMessage
}

class BasicActivityMessageService implements ActivityMessageService {
  private readonly _activity: Activity

  constructor(activity: Activity) {
    this._activity = activity
  }

  mapActivityToMessage(): ActivityMessage {
    return {
      messageTemplate: 'Unknown activity',
    }
  }

  protected get activity(): Activity {
    return this._activity
  }

  protected getPackageVersionLink(packageId: string, displayName: string, version?: string): LinkData {
    const commonPackagePath = `/portal/packages/${packageId}`
    return {
      path: version
        ? format(
          '{}/{}/{}',
          commonPackagePath,
          encodeURIComponent(version),
          SUMMARY_ROUTE,
        )
        : commonPackagePath,
      displayName: displayName,
    }
  }

  protected getPackageSettingsLink(packageId: string, packageName: string): LinkData {
    return {
      path: `/portal/packages/${packageId}/${SPECIAL_VERSION_KEY}/${PACKAGE_SETTINGS_PAGE}/${GENERAL_PAGE}`,
      displayName: packageName,
    }
  }

  protected mapRoleToString(role: Role): string {
    return role.role
  }

  protected bold(string: string): string {
    return `<b>${string}</b>`
  }

  protected italic(string: string): string {
    return `<i>${string}</i>`
  }

  protected underlined(string: string): string {
    return `<u>${string}</u>`
  }

  protected link(href: string, target: string = '_blank', displayedValue?: string): string {
    return `<a href='${href}' target='${target}'>${displayedValue ?? href}</a>`
  }

}

class GenerateAndRevokeApiKeysActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity

    switch (activityType) {
      case ActivityType.GENERATE_API_KEY_EVENT:
        return {
          messageTemplate: `Generated access token in the ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageSettingsLink(packageId, packageName)],
        }
      case ActivityType.REVOKE_API_KEY_EVENT:
        return {
          messageTemplate: `Revoked access token in the ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageSettingsLink(packageId, packageName)],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class CreateAndDeletePackageActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity

    switch (activityType) {
      case ActivityType.CREATE_PACKAGE_EVENT:
        return {
          messageTemplate: `Created ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageVersionLink(packageId, packageName)],
        }
      case ActivityType.DELETE_PACKAGE_EVENT:
        return {
          messageTemplate: `Deleted ${packageName} ${kind}`,
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class GrantAndDeleteRoleActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const { memberName, roles = [] } = this.activity.details as GrantOrDeleteRoleActivityDetails

    const rolesString = roles.map(this.mapRoleToString).join(', ')

    switch (activityType) {
      case ActivityType.GRANT_ROLE_EVENT:
        return {
          messageTemplate: `Added ${memberName} with ${rolesString} role(s) to the ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageSettingsLink(packageId, packageName)],
        }
      case ActivityType.DELETE_ROLE_EVENT:
        return {
          messageTemplate: `Deleted ${memberName} with ${rolesString} role(s) from the ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageSettingsLink(packageId, packageName)],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class UpdateRoleActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const { memberName } = this.activity.details as UpdateRoleActivityDetails

    switch (activityType) {
      case ActivityType.UPDATE_ROLE_EVENT:
        return {
          messageTemplate: `Updated role(s) of ${memberName} in the ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageSettingsLink(packageId, packageName)],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class PublishAndDeleteVersionActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const { version, status } = this.activity.details as PublishOrDeleteVersionActivityDetails
    const { versionKey } = getSplittedVersionKey(version)

    switch (activityType) {
      case ActivityType.PUBLISH_NEW_VERSION_EVENT:
        return {
          messageTemplate: `Published ${LINK_PLACEHOLDER} version in ${status} status in the ${packageName} ${kind}`,
          links: [this.getPackageVersionLink(packageId, versionKey, versionKey)],
        }
      case ActivityType.DELETE_VERSION_EVENT:
        return {
          messageTemplate: `Deleted ${versionKey} version in ${status} status in the ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageVersionLink(packageId, packageName)],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class PublishNewRevisionActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const { version, status, notLatestRevision } = this.activity.details as PublishNewRevisionActivityDetails
    const { versionKey, revisionKey } = getSplittedVersionKey(version)

    switch (activityType) {
      case ActivityType.PUBLISH_NEW_REVISION_EVENT:
        return {
          messageTemplate: `Published ${LINK_PLACEHOLDER} revision of ${versionKey} version in ${status} status in the ${packageName} ${kind}`,
          links: [this.getPackageVersionLink(packageId, `@${revisionKey}`, notLatestRevision ? version : versionKey)],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class PatchVersionMetaActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const { version, versionMeta = [] } = this.activity.details as PatchVersionMetaActivityDetails
    const { versionKey } = getSplittedVersionKey(version)

    switch (activityType) {
      case ActivityType.PATCH_VERSION_META_EVENT:
        return {
          messageTemplate: `Changed ${versionMeta.join(', ')} for ${LINK_PLACEHOLDER} version of ${packageName} ${kind}`,
          links: [this.getPackageVersionLink(packageId, versionKey, versionKey)],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class PatchPackageMetaActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const { packageMeta = [] } = this.activity.details as PatchPackageMetaActivityDetails

    switch (activityType) {
      case ActivityType.PATCH_PACKAGE_META_EVENT:
        return {
          messageTemplate: `Updated ${packageMeta.join(', ')} of ${LINK_PLACEHOLDER} ${kind}`,
          links: [this.getPackageSettingsLink(packageId, packageName)],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

class CreateAndDeleteManualGroupActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const {
      groupName,
      version,
      notLatestRevision,
      apiType,
    } = this.activity.details as CreateOrDeleteManualGroupEventDetails
    const { versionKey } = getSplittedVersionKey(version, !notLatestRevision)
    const packageVersionLink = this.getPackageVersionLink(packageId, versionKey, versionKey)

    switch (activityType) {
      case ActivityType.CREATE_MANUAL_GROUP_EVENT:
        return {
          messageTemplate: `Created ${groupName} ${GROUP_TYPE_MANUAL} group (of ${API_TYPE_TITLE_MAP[apiType]} type) in ${LINK_PLACEHOLDER} version of ${packageName} ${kind}`,
          links: [packageVersionLink],
        }
      case ActivityType.DELETE_MANUAL_GROUP_EVENT:
        return {
          messageTemplate: `Deleted ${groupName} ${GROUP_TYPE_MANUAL} group (of ${API_TYPE_TITLE_MAP[apiType]} type) in ${LINK_PLACEHOLDER} version of ${packageName} ${kind}`,
          links: [packageVersionLink],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

export const GROUP_PARAMETERS: Record<GroupParameter, string> = {
  [GROUP_PARAMETER_NAME]: 'name',
  [GROUP_PARAMETER_DESCRIPTION]: 'description',
  [GROUP_PARAMETER_TEMPLATE]: 'OAS export template',
  [GROUP_PARAMETER_OPERATIONS]: 'operations list',
}

class UpdateOperationsGroupParametersActivityMessageService extends BasicActivityMessageService {
  mapActivityToMessage(): ActivityMessage {
    const { activityType, packageId, packageName, kind } = this.activity
    const {
      version,
      groupName,
      groupParameters,
      notLatestRevision,
      isPrefixGroup,
      apiType,
    } = this.activity.details as UpdateOperationsGroupParametersEventDetails
    const { versionKey } = getSplittedVersionKey(version, !notLatestRevision)
    const packageVersionLink = this.getPackageVersionLink(packageId, versionKey, versionKey)

    const groupParametersString = groupParameters.map(groupParameter => GROUP_PARAMETERS[groupParameter]).join(', ')
    const groupType = isPrefixGroup ? GROUP_TYPE_REST_PATH_PREFIX : GROUP_TYPE_MANUAL
    const apiTypeMessage = isPrefixGroup ? '' : ` (of ${API_TYPE_TITLE_MAP[apiType]} type)`

    switch (activityType) {
      case ActivityType.UPDATE_OPERATIONS_GROUP_PARAMETERS_EVENT:
        return {
          messageTemplate: `Changed ${groupParametersString} of ${groupName} ${groupType} group${apiTypeMessage} in ${LINK_PLACEHOLDER} version of ${packageName} ${kind}`,
          links: [packageVersionLink],
        }
    }

    return EMPTY_ACTIVITY_MESSAGE
  }
}

export function getActivityMessageServiceInstance(activity: Activity): ActivityMessageService | never {
  switch (activity.activityType) {
    case ActivityType.GENERATE_API_KEY_EVENT:
    case ActivityType.REVOKE_API_KEY_EVENT:
      return new GenerateAndRevokeApiKeysActivityMessageService(activity)
    case ActivityType.CREATE_PACKAGE_EVENT:
    case ActivityType.DELETE_PACKAGE_EVENT:
      return new CreateAndDeletePackageActivityMessageService(activity)
    case ActivityType.GRANT_ROLE_EVENT:
    case ActivityType.DELETE_ROLE_EVENT:
      return new GrantAndDeleteRoleActivityMessageService(activity)
    case ActivityType.UPDATE_ROLE_EVENT:
      return new UpdateRoleActivityMessageService(activity)
    case ActivityType.PUBLISH_NEW_VERSION_EVENT:
    case ActivityType.DELETE_VERSION_EVENT:
      return new PublishAndDeleteVersionActivityMessageService(activity)
    case ActivityType.PUBLISH_NEW_REVISION_EVENT:
      return new PublishNewRevisionActivityMessageService(activity)
    case ActivityType.PATCH_VERSION_META_EVENT:
      return new PatchVersionMetaActivityMessageService(activity)
    case ActivityType.PATCH_PACKAGE_META_EVENT:
      return new PatchPackageMetaActivityMessageService(activity)
    case ActivityType.CREATE_MANUAL_GROUP_EVENT:
    case ActivityType.DELETE_MANUAL_GROUP_EVENT:
      return new CreateAndDeleteManualGroupActivityMessageService(activity)
    case ActivityType.UPDATE_OPERATIONS_GROUP_PARAMETERS_EVENT:
      return new UpdateOperationsGroupParametersActivityMessageService(activity)
  }
  throw new Error(`Unknown activity type = ${activity.activityType}`)
}
