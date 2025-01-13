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

export const TOOLTIP_SEVERITY_MSG = {
  breaking: 'Breaking change is a change that breaks backward compatibility with the previous version of API. For example, deleting an operation, adding a required parameter or changing type of a parameter are breaking changes.',
  nonBreaking: 'Non-breaking change is change that does not break backward compatibility with the previous version of API. For example, adding new operation or optional parameter is non-breaking change.',
  semiBreaking: [
    'Semi-breaking change is a change that breaks backward compatibility according to the rules:',
    'operation was annotated as deprecated in at least two previous consecutive releases and then it was deleted',
    'operation is marked as no-BWC',
  ],
  deprecated: 'Deprecating change is a change that annotates an operation, parameter or schema as deprecated. Removing a "deprecated" annotation is also considered a deprecating change.',
  annotation: 'An annotation change is a change to enrich the API documentation with information that does not affect the functionality of the API. For example, adding/changing/deleting descriptions or examples is annotation change.',
  unclassified: 'An unclassified change is a change that cannot be classified as any of the other types.',
}

export const PUBLISH_ALLOWED_CHARACTERS_MSG = 'Only \'A-Za-z0-9_.~-\' characters are allowed'

export const PUBLISH_SAME_CURRENT_AND_PREV_MSG = 'The version must not be the same as the previous one'
