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

import type { OperationsWithDeprecations } from '../../entities/operations'

export const restDeprecatedOperations: OperationsWithDeprecations = [
  {
    'packageRef': {
      'key': 'TESTPKG',
      'refId': 'TESTPKG',
      'version': '2002.1@1',
      'status': 'release',
      'name': 'APIHUB backend',
      'parentPackages': [
        'Primary',
        'Secondary',
        'APIHUB',
      ],
      'latestRevision': true,
    },
    'apiAudience': 'unknown',
    'title': '[Deprecated] Get list of changes in branch',
    'dataHash': 'bc2a54ac13185c9adb6c494dc691793fd0fb1322',
    'deprecated': true,
    'apiKind': 'bwc',
    'apiType': 'rest',
    'deprecatedCount': '4',
    'path': '/api/v1/projects/*/branches/*/changes',
    'method': 'get',
    'tags': [
      'Branch',
    ],
    'operationKey': 'api-v1-projects-projectid-branches-branch-changes-get',
  },
  {
    'packageRef': {
      'key': 'TESTPKG',
      'refId': 'TESTPKG',
      'version': '2002.1@1',
      'status': 'release',
      'name': 'APIHUB backend',
      'parentPackages': [
        'Primary',
        'Secondary',
        'APIHUB',
      ],
      'latestRevision': true,
    },
    'apiAudience': 'unknown',
    'title': 'Get project branch files by commit Id',
    'dataHash': 'f8fc078bf2730287acb648c7045139c40f2a045b',
    'deprecated': true,
    'apiKind': 'bwc',
    'apiType': 'rest',
    'deprecatedCount': '1',
    'path': '/api/v1/projects/*/branches/*/history/*',
    'method': 'get',
    'tags': [
      'History',
      'Branch',
    ],
    'operationKey': 'api-v1-projects-projectid-branches-branch-history-commitid-get',
  },
  {
    'packageRef': {
      'key': 'TESTPKG',
      'refId': 'TESTPKG',
      'version': '2002.1@1',
      'status': 'release',
      'name': 'APIHUB backend',
      'parentPackages': [
        'Primary',
        'Secondary',
        'APIHUB',
      ],
      'latestRevision': true,
    },
    'apiAudience': 'unknown',
    'title': 'Publish project branch',
    'dataHash': '3cfe640496a9e342bfd857938481c1c09a212735',
    'deprecated': true,
    'apiKind': 'bwc',
    'apiType': 'rest',
    'deprecatedCount': '2',
    'path': '/api/v1/projects/*/branches/*/publish',
    'method': 'post',
    'tags': [
      'Branch',
      'Publish',
    ],
    'operationKey': 'api-v1-projects-projectid-branches-branch-publish-post',
  },
  {
    'packageRef': {
      'key': 'TESTPKG',
      'refId': 'TESTPKG',
      'version': '2002.1@1',
      'status': 'release',
      'name': 'APIHUB backend',
      'parentPackages': [
        'Primary',
        'Secondary',
        'APIHUB',
      ],
      'latestRevision': true,
    },
    'apiAudience': 'unknown',
    'title': '[Draft] Get project version dependents',
    'dataHash': '43d0187d1ed8d7654e3deb35afd243dcd4638f72',
    'deprecated': true,
    'apiKind': 'bwc',
    'apiType': 'rest',
    'deprecatedCount': '3',
    'path': '/api/v1/projects/*/versions/*/dependents',
    'method': 'get',
    'tags': [
      '[Draft]',
      'Versions',
    ],
    'operationKey': 'api-v1-projects-projectid-versions-version-dependents-get',
  },
]
