import { AddNewPetToPetstore } from '@netcracker/qubership-apihub-apispec-view-samples/operations-new-samples/addNewPetToPetstore'
import { AddNewPetToPetstoreCircular } from '@netcracker/qubership-apihub-apispec-view-samples/operations-new-samples/addNewPetToPetstoreCircular'
import {
  AddNewPetToPetstoreNullableProp
} from '@netcracker/qubership-apihub-apispec-view-samples/operations-new-samples/addNewPetToPetstoreNullableProp'
import { ChangedParametersDeprecated } from '@netcracker/qubership-apihub-apispec-view-samples/operations-new-samples/changedParametersDeprecated'
import { ChangedParametersRequired, } from '@netcracker/qubership-apihub-apispec-view-samples/operations-new-samples/changedParametersRequired'
import { DeprecatedOperations } from '@netcracker/qubership-apihub-apispec-view-samples/operations-new-samples/deprecatedOperations'
import {
  WhollyChangedRequestBodyOrResponse,
} from '@netcracker/qubership-apihub-apispec-view-samples/operations-new-samples/operationsForWhollyChangedRequestBodyOrResponse'
import renameMediaTypeAndADeeperChangeInResponseBefore from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-response/before.yaml'
import renameMediaTypeAndADeeperChangeInResponseAfter from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-response/after.yaml'
import renameMediaTypeInResponseBefore from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-in-response/before.yaml'
import renameMediaTypeInResponseAfter from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-in-response/after.yaml'
import renameMediaTypeAndADeeperChangeInRequestBodyBefore from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-request-body/before.yaml'
import renameMediaTypeAndADeeperChangeInRequestBodyAfter from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-request-body/after.yaml'
import renameMediaTypeInRequestBodyBefore from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-in-request-body/before.yaml'
import renameMediaTypeInRequestBodyAfter from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-in-request-body/after.yaml'
import renameMediaTypeAndADeeperChangeInPathItemParameterBefore from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-path-item-parameter/before.yaml'
import renameMediaTypeAndADeeperChangeInPathItemParameterAfter from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-path-item-parameter/after.yaml'
import renameMediaTypeAndADeeperChangeInOperationParameterBefore from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-operation-parameter/before.yaml'
import renameMediaTypeAndADeeperChangeInOperationParameterAfter from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-operation-parameter/after.yaml'
import renameMediaTypeAndADeeperChangeInResponseHeaderBefore from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-response-header/before.yaml'
import renameMediaTypeAndADeeperChangeInResponseHeaderAfter from '@netcracker/qubership-apihub-apispec-view-samples/media-type-samples/rename-media-type-and-a-deeper-change-in-response-header/after.yaml'

import { COMPARE_DISPLAY_MODE } from '@stoplight/elements'
import { DiffOperationAPI } from '@stoplight/elements/containers/DiffOperationAPI'
import {
  getCompareResult,
  getMergedDocument,
} from '@stoplight/elements/web-components/__stories__/helpers/getMergedDocument'
import { aggregatedDiffMetaKey, diffMetaKey } from 'diff-block'
import React from 'react'
import '../index'
import { Meta, StoryObj } from '@storybook/react/*'
import { stringifyDiffs } from '@stoplight/elements/web-components/__stories__/helpers/stringifyDiffs'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'diff-operation-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export default {
  title: 'web-components/DiffOperationAPI',
  component: DiffOperationAPI,
  argTypes: {
    layout: {
      control: { type: 'inline-radio', options: ['sidebar', 'stacked', 'partial'] },
      defaultValue: 'sidebar',
    },
    router: {
      control: { type: 'inline-radio', options: ['history', 'memory', 'hash', 'static'] },
      defaultValue: 'history',
    },
    selectedNodeUri: { control: 'text', defaultValue: '/' },
    searchPhrase: { control: 'text' },
    schemaViewMode: {
      control: { type: 'inline-radio', options: ['simple', 'detailed'] },
      defaultValue: undefined,
    },
    filters: {
      options: ['breaking', 'non-breaking', 'annotation', 'unclassified', 'deprecate'],
      control: { type: 'inline-check' },
    },
    mergedDocument: { type: 'object' },
  },
}

const Template = (props: any) => {
  return (
    <DiffOperationAPI
      {...props}
      metaKeys={{
        diffsMetaKey: diffMetaKey,
        aggregatedDiffsMetaKey: aggregatedDiffMetaKey
      }}
      filters={JSON.stringify(props.filters)}
    />
  )
}

export const AddNewPetToPetstoreStory: any = Template.bind({})
AddNewPetToPetstoreStory.args = {
  mergedDocument: getMergedDocument(AddNewPetToPetstore.BEFORE, AddNewPetToPetstore.AFTER),
  displayMode: COMPARE_DISPLAY_MODE,
}
AddNewPetToPetstoreStory.storyName = '[post] Add new pet to Petstore'

export const AddNewPetToPetstoreStoryCircular: any = Template.bind({})
AddNewPetToPetstoreStoryCircular.args = {
  mergedDocument: getMergedDocument(AddNewPetToPetstoreCircular.BEFORE, AddNewPetToPetstoreCircular.AFTER),
  displayMode: COMPARE_DISPLAY_MODE,
}
AddNewPetToPetstoreStoryCircular.storyName = '[post] Add new pet to Petstore (Circular)'

// Uncomment when logic for wholly added/removed will be ready
// export const AddNewPetToPetstoreStoryWhollyAdded: any = Template.bind({});
// AddNewPetToPetstoreStoryWhollyAdded.args = {
//   mergedDocument: getMergedDocument(AddNewPetToPetstoreWhollyMoved.BEFORE, AddNewPetToPetstoreWhollyMoved.AFTER),
//   displayMode: COMPARE_DISPLAY_MODE,
// };
// AddNewPetToPetstoreStoryWhollyAdded.storyName = '[post] Add new pet to Petstore (Wholly ADDED)';
//
// export const AddNewPetToPetstoreStoryWhollyRemoved: any = Template.bind({});
// AddNewPetToPetstoreStoryWhollyRemoved.args = {
//   mergedDocument: getMergedDocument(AddNewPetToPetstoreWhollyMoved.AFTER, AddNewPetToPetstoreWhollyMoved.BEFORE),
//   displayMode: COMPARE_DISPLAY_MODE,
// };
// AddNewPetToPetstoreStoryWhollyRemoved.storyName = '[post] Add new pet to Petstore (Wholly REMOVED)';

export const AddNewPetToPetstoreNullablePropStory: any = Template.bind({})
AddNewPetToPetstoreNullablePropStory.args = {
  mergedDocument: getMergedDocument(AddNewPetToPetstoreNullableProp.BEFORE, AddNewPetToPetstoreNullableProp.AFTER),
}
AddNewPetToPetstoreNullablePropStory.storyName = '[post] Add new pet to Petstore (Nullable Prop)'

export const RemoveWholeResponseCode: any = Template.bind({})
RemoveWholeResponseCode.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_XML,
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON
  )
}
RemoveWholeResponseCode.storyName = '[Response] Removed whole RESPONSE code'

export const RemoveWholeResponseMediaType: any = Template.bind({})
RemoveWholeResponseMediaType.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_XML_JSON,
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_XML,
  )
}
RemoveWholeResponseMediaType.storyName = '[Response] Removed whole RESPONSE media type'

export const RemoveSchemaFromResponseMediaType: any = Template.bind({})
RemoveSchemaFromResponseMediaType.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_XML_JSON,
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_XML_EMPTY_JSON,
  )
}
RemoveSchemaFromResponseMediaType.storyName = '[Response] Removed schema from RESPONSE media type'

export const RemoveResponseHeaders: any = Template.bind({})
RemoveResponseHeaders.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_2_HEADERS,
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON
  )
}
RemoveResponseHeaders.storyName = '[Response] Removed ALL response HEADERS'

export const Remove1ResponseHeader: any = Template.bind({})
Remove1ResponseHeader.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_2_HEADERS,
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_1_HEADER,
  )
}
Remove1ResponseHeader.storyName = '[Response] Removed 1 response HEADER'

export const AddResponseHeaders: any = Template.bind({})
AddResponseHeaders.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON,
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_2_HEADERS,
  )
}
AddResponseHeaders.storyName = '[Response] Added ALL response HEADERS'

export const Add1ResponseHeader: any = Template.bind({})
Add1ResponseHeader.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_1_HEADER,
    WhollyChangedRequestBodyOrResponse.HAS_RESPONSE_200_JSON_RESPONSE_301_2_HEADERS,
  )
}
Add1ResponseHeader.storyName = '[Response] Added 1 response HEADER'

export const RemoveWholeRequestBody: any = Template.bind({})
RemoveWholeRequestBody.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_JSON_XML,
    WhollyChangedRequestBodyOrResponse.EMPTY_OPERATION
  )
}
RemoveWholeRequestBody.storyName = '[Request] Removed whole REQUEST BODY'

export const AddWholeRequestBody: any = Template.bind({})
AddWholeRequestBody.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.EMPTY_OPERATION,
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_JSON_XML,
  )
}
AddWholeRequestBody.storyName = '[Request] Added whole REQUEST BODY'

export const RemoveWholeRequestBodyMediaType: any = Template.bind({})
RemoveWholeRequestBodyMediaType.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_JSON_XML,
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_XML,
  )
}
RemoveWholeRequestBodyMediaType.storyName = '[Request] Removed whole REQUEST BODY media type'

export const AddWholeRequestBodyMediaType: any = Template.bind({})
AddWholeRequestBodyMediaType.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_XML,
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_JSON_XML,
  )
}
AddWholeRequestBodyMediaType.storyName = '[Request] Added whole REQUEST BODY media type'

export const RemoveSchemaFromRequestBodyMediaType: any = Template.bind({})
RemoveSchemaFromRequestBodyMediaType.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_JSON_XML,
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_BODY_XML_EMPTY_JSON,
  )
}
RemoveSchemaFromRequestBodyMediaType.storyName = '[Request] Removed schema from REQUEST BODY media type'

export const Removed1RequestHeader: any = Template.bind({})
Removed1RequestHeader.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_3_HEADERS_RESPONSE_200_JSON_RESPONSE_HEADERS,
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_2_HEADERS_RESPONSE_200_JSON_RESPONSE_HEADERS,
  )
}
Removed1RequestHeader.storyName = '[Request] Removed 1 request HEADER'

export const Added1RequestHeader: any = Template.bind({})
Added1RequestHeader.args = {
  mergedDocument: getMergedDocument(
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_2_HEADERS_RESPONSE_200_JSON_RESPONSE_HEADERS,
    WhollyChangedRequestBodyOrResponse.HAS_REQUEST_3_HEADERS_RESPONSE_200_JSON_RESPONSE_HEADERS,
  )
}
Added1RequestHeader.storyName = '[Request] Added 1 request HEADER'

export const DeprecatedOperation: any = Template.bind({})
DeprecatedOperation.args = {
  mergedDocument: getMergedDocument(
    DeprecatedOperations.WITHOUT_DEPRECATION,
    DeprecatedOperations.WITH_DEPRECATION,
  )
}
DeprecatedOperation.storyName = '[Operation] NOT deprecated -> Deprecated'

export const UnDeprecatedOperation: any = Template.bind({})
UnDeprecatedOperation.args = {
  mergedDocument: getMergedDocument(
    DeprecatedOperations.WITH_DEPRECATION,
    DeprecatedOperations.WITHOUT_DEPRECATION,
  )
}
UnDeprecatedOperation.storyName = '[Operation] Deprecated -> NOT deprecated'

export const ChangedParametersRequiredStory: any = Template.bind({})
ChangedParametersRequiredStory.args = {
  mergedDocument: getMergedDocument(
    ChangedParametersRequired.BEFORE,
    ChangedParametersRequired.AFTER,
  )
}
ChangedParametersRequiredStory.storyName = '[Operation] Changed "required" flags in parameters'

export const ChangedParametersDeprecatedStory: any = Template.bind({})
ChangedParametersDeprecatedStory.args = {
  mergedDocument: getMergedDocument(
    ChangedParametersDeprecated.BEFORE,
    ChangedParametersDeprecated.AFTER,
  )
}
ChangedParametersDeprecatedStory.storyName = '[Operation] Changed "deprecated" flags in parameters'

export const RequestBodyNoAdditionalPropertiesNotChanged: any = Template.bind({})
RequestBodyNoAdditionalPropertiesNotChanged.args = {
  mergedDocument: getMergedDocument(
    {
      openapi: '3.0.2',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      prop1: { type: 'string' },
                      prop2: { type: 'string' },
                    },
                    additionalProperties: false
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      openapi: '3.0.2',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      prop1: { type: 'string' },
                      prop2: { type: 'string' },
                    },
                    additionalProperties: false
                  }
                }
              }
            }
          }
        }
      }
    },
  )
}

export const OneOfChanges: any = Template.bind({})
OneOfChanges.args = {
  mergedDocument: getMergedDocument(
    {
      openapi: '3.0.0',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      prop1: {
                        description: 'Added oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                        ]
                      },
                      prop2: {
                        description: 'Removed oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                          { type: 'boolean' },
                        ]
                      },
                      prop3: {
                        description: 'Changed primitive type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                        ]
                      },
                      prop4: {
                        description: 'Changed objective type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          {
                            type: 'object',
                            properties: {
                              test: { type: 'boolean' },
                            }
                          },
                        ]
                      },
                      prop5: {
                        description: 'Changed iterable type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                test: { type: 'boolean' },
                              }
                            }
                          },
                        ]
                      },
                      prop6: {
                        description: 'Replaced objective type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          {
                            type: 'object',
                            properties: {
                              test: { type: 'boolean' },
                            }
                          },
                        ]
                      },
                      prop7: {
                        description: 'Replaced iterable type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                test: { type: 'boolean' },
                              }
                            }
                          },
                        ]
                      },
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      openapi: '3.0.0',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      prop1: {
                        description: 'Added oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                          { type: 'boolean' },
                        ]
                      },
                      prop2: {
                        description: 'Removed oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                        ]
                      },
                      prop3: {
                        description: 'Changed primitive type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'integer' },
                        ]
                      },
                      prop4: {
                        description: 'Changed objective type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          {
                            type: 'object',
                            properties: {
                              test: { type: 'boolean' },
                              newProp: { type: 'string' },
                            }
                          },
                        ]
                      },
                      prop5: {
                        description: 'Changed iterable type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                test: { type: 'boolean' },
                                newProp: { type: 'string' },
                              }
                            }
                          },
                        ]
                      },
                      prop6: {
                        description: 'Replaced objective type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                        ]
                      },
                      prop7: {
                        description: 'Replaced iterable type in oneOf item',
                        oneOf: [
                          { type: 'string' },
                          { type: 'number' },
                        ]
                      },
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  )
}
OneOfChanges.storyName = '[oneOf] Changes in oneOf'

const KEEP_PROPS_INTEGER_TYPE = {
  type: 'integer',
  description: 'Integer type',
  minimum: 5,
  exclusiveMinimum: true,
  multipleOf: 5,
}
const KEEP_PROPS_STRING_TYPE = {
  type: 'string',
  description: 'String type',
  minLength: 1,
  maxLength: 150,
  pattern: '^a-zA-Z$'
}

export const IntegerToString: any = Template.bind({})
IntegerToString.args = {
  mergedDocument: getMergedDocument(
    {
      openapi: '3.0.0',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: KEEP_PROPS_INTEGER_TYPE
                }
              }
            }
          }
        }
      }
    },
    {
      openapi: '3.0.0',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: KEEP_PROPS_STRING_TYPE
                }
              }
            }
          }
        }
      }
    }
  )
}

export const StringToInteger: any = Template.bind({})
StringToInteger.args = {
  mergedDocument: getMergedDocument(
    {
      openapi: '3.0.0',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: KEEP_PROPS_STRING_TYPE
                }
              }
            }
          }
        }
      }
    },
    {
      openapi: '3.0.0',
      paths: {
        '/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: KEEP_PROPS_INTEGER_TYPE
                }
              }
            }
          }
        }
      }
    },
  )
}

export const ChangePathParamName: any = Template.bind({})
ChangePathParamName.args = {
  mergedDocument: getMergedDocument(
    {
      openapi: '3.0.0',
      paths: {
        '/test/{id}': {
          get: {
            summary: 'Get test by id',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: {
                  type: 'string',
                  description: 'Id of the test',
                }
              }
            ]
          }
        }
      }
    },
    {
      openapi: '3.0.0',
      paths: {
        '/test/{key}': {
          get: {
            summary: 'Get test by key',
            parameters: [
              {
                name: 'key',
                in: 'path',
                required: true,
                schema: {
                  type: 'string',
                  description: 'Key of the test',
                }
              }
            ]
          }
        }
      }
    }
  )
}
ChangePathParamName.storyName = '[path] Changed path param name'

function StoryComponent({ before, after }: { before: object, after: object }) {
  const { diffs, merged } = getCompareResult(before, after)
  console.log(stringifyDiffs(diffs))
  console.log(diffs)
  return (
    <DiffOperationAPI
      mergedDocument={merged}
      filters={[]}
      metaKeys={{
        diffsMetaKey: diffMetaKey,
        aggregatedDiffsMetaKey: aggregatedDiffMetaKey
      }}
    />
  )
}

const meta: Meta<{ before: object, after: object }> = {
  title: 'web-components/DiffOperationAPI',
}

type Story = StoryObj<typeof meta>

export const RenameMediaTypeAndADeeperChangeInResponse: Story = {
  name: '[Response] Rename media type and a deeper change in response',
  render: StoryComponent,
  args: { before: renameMediaTypeAndADeeperChangeInResponseBefore, after: renameMediaTypeAndADeeperChangeInResponseAfter },
}

// todo should be shown
export const RenameMediaTypeInResponse: Story = {
  name: '[Response] Rename media type in response',
  render: StoryComponent,
  args: { before: renameMediaTypeInResponseBefore, after: renameMediaTypeInResponseAfter },
}

export const RenameMediaTypeAndADeeperChangeInRequestBody: Story = {
  name: '[Request] Rename media type and a deeper change in request body',
  render: StoryComponent,
  args: { before: renameMediaTypeAndADeeperChangeInRequestBodyBefore, after: renameMediaTypeAndADeeperChangeInRequestBodyAfter },
}

// todo should be shown
export const RenameMediaTypeInRequestBody: Story = {
  name: '[Request] Rename media type in request body',
  render: StoryComponent,
  args: { before: renameMediaTypeInRequestBodyBefore, after: renameMediaTypeInRequestBodyAfter },
}

const beforeBugCrashInfiniteAdditionalPropsInDiffs = {
  "openapi": "3.0.1",
  "paths": {
    "/path1": {
      "get": {
        "operationId": "myId",
        "responses": {
          "200": {
            "description": "lorem ipsum",
            "content": {
              "text/plain": {}
            }
          }
        }
      }
    }
  },
  "components": {}
}
const afterBugCrashInfiniteAdditionalPropsInDiffs = {
  "openapi": "3.0.1",
  "paths": {
    "/path1": {
      "get": {
        "operationId": "myId",
        "responses": {
          "200": {
            "description": "lorem ipsum",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {}
}

// Root cause: incorrect behavior of "isDiffMetaRecord" which produces infinite loop in "combineDiffMetas"
export const BugCrashInfiniteAdditionalPropsInDiffs: Story = {
  name: '[Bug] Crash Infinite Additional Props In Diffs',
  render: StoryComponent,
  args: { before: beforeBugCrashInfiniteAdditionalPropsInDiffs, after: afterBugCrashInfiniteAdditionalPropsInDiffs },
}
