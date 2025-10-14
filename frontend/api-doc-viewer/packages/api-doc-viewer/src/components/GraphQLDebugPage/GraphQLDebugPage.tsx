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

import type { FC } from 'react'
import { useState, useMemo, useCallback } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { 
  createGraphApiTree,
  GraphApiNodeData,
  GraphApiNodeKind,
  GraphApiNodeMeta,
  ModelTree
} from '@netcracker/qubership-apihub-api-data-model'
import { GraphApiState } from '@netcracker/qubership-apihub-api-state-model'
import { buildGraphApi } from '../../stories/utils/helpers'
import { prepareGraphApiSchema } from '../../stories/preprocess'
import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'
import { GraphQLOperationViewer } from '../GraphQLOperationViewer/GraphQLOperationViewer'
import './GraphQLDebugPage.css'

type OutputFormat = 'graphapi-schema' | 'tree-model' | 'state-model'

const DEFAULT_BEFORE_SCHEMA = `type Query {
  user(id: ID!): User  
}

type User {
  id: ID!
  name: String!
  email: String!
}`

const DEFAULT_AFTER_SCHEMA = `type Query {
  user(id: ID!): User  
}

type User {
  id: ID!
  name: String!
  email: String!
  peer: User @deprecated
}`

export const GraphQLDebugPage: FC = () => {
  const [beforeSchema, setBeforeSchema] = useState(DEFAULT_BEFORE_SCHEMA)
  const [afterSchema, setAfterSchema] = useState(DEFAULT_AFTER_SCHEMA)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('tree-model')
  const [isTransforming, setIsTransforming] = useState(false)
  const [outputViewMode, setOutputViewMode] = useState<'diff' | 'inline'>('diff')
  const [previewExpandedDepth, setPreviewExpandedDepth] = useState(2)

  // Debug state changes
  const handleBeforeSchemaChange = useCallback((value: string) => {
    console.log('Before schema changed:', value.length, 'characters')
    setBeforeSchema(value)
  }, [])

  const handleAfterSchemaChange = useCallback((value: string) => {
    console.log('After schema changed:', value.length, 'characters')
    setAfterSchema(value)
  }, [])

  // Transform GraphQL schemas to different formats using the same logic as GraphQLOperationViewer
  const transformedData = useMemo(() => {
    setIsTransforming(true)
    console.log('🔄 Starting transformation...')
    const transforms: {
      before: { graphapiSchema: any, tree: any, state: any },
      after: { graphapiSchema: any, tree: any, state: any }
    } = {
      before: { graphapiSchema: null, tree: null, state: null },
      after: { graphapiSchema: null, tree: null, state: null }
    }

    try {
      // Process Before schema - mimic GraphQLOperationViewer logic
      if (beforeSchema.trim()) {
        const graphapiSource = buildGraphApi(beforeSchema)
        if (graphapiSource) {
          transforms.before.graphapiSchema = prepareGraphApiSchema({
            source: graphapiSource,
            circular: true
          })
          
          // Create tree model exactly as GraphQLOperationViewer does
          if (transforms.before.graphapiSchema) {
            const tree: ModelTree<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta> = createGraphApiTree(transforms.before.graphapiSchema)
            transforms.before.tree = tree
            
            // Create state model exactly as GraphQLOperationViewer does  
            if (tree) {
              const state = new GraphApiState(tree, 3) // default expanded depth
              transforms.before.state = state
              
              // Console debug output like GraphQLOperationViewer for debugging
              console.debug('Before - GraphAPI Schema:', transforms.before.graphapiSchema)
              console.debug('Before - Tree Model:', tree)
              console.debug('Before - State Model:', state)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing before schema:', error)
      transforms.before = { graphapiSchema: null, tree: null, state: null }
    }

    try {
      // Process After schema - mimic GraphQLOperationViewer logic
      if (afterSchema.trim()) {
        const graphapiSource = buildGraphApi(afterSchema)
        if (graphapiSource) {
          transforms.after.graphapiSchema = prepareGraphApiSchema({
            source: graphapiSource,
            circular: true
          })
          
          // Create tree model exactly as GraphQLOperationViewer does
          if (transforms.after.graphapiSchema) {
            const tree: ModelTree<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta> = createGraphApiTree(transforms.after.graphapiSchema)
            transforms.after.tree = tree
            
            // Create state model exactly as GraphQLOperationViewer does
            if (tree) {
              const state = new GraphApiState(tree, 3) // default expanded depth
              transforms.after.state = state
              
              // Console debug output like GraphQLOperationViewer for debugging
              console.debug('After - GraphAPI Schema:', transforms.after.graphapiSchema)
              console.debug('After - Tree Model:', tree)
              console.debug('After - State Model:', state)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing after schema:', error)
      transforms.after = { graphapiSchema: null, tree: null, state: null }
    }

    setIsTransforming(false)
    console.log('✅ Transformation complete')
    return transforms
  }, [beforeSchema, afterSchema])

  const getDisplayValue = (data: any, format: OutputFormat): string => {
    if (!data) return ''
    
    try {
      switch (format) {
        case 'graphapi-schema':
          if (!data.graphapiSchema) return ''
          return JSON.stringify(data.graphapiSchema, null, 2)
        case 'tree-model':
          if (!data.tree) return ''
          // Use a safer serialization approach for tree model
          try {
            return stringifyCyclicJso(data.tree)
          } catch (stringifyError) {
            // Fallback to a simpler representation if stringifyCyclicJso fails
            return JSON.stringify({
              root: data.tree.root ? 'ModelTreeNode (see console for details)' : null,
              nodes: `Map with ${data.tree.nodes?.size || 0} entries`,
              type: 'ModelTree',
              error: 'Complex object - check browser console for full details'
            }, null, 2)
          }
        case 'state-model':
          if (!data.state) return ''
          // Use a safer serialization approach for state model
          try {
            return stringifyCyclicJso(data.state)
          } catch (stringifyError) {
            // Fallback to a simpler representation if stringifyCyclicJso fails
            return JSON.stringify({
              root: data.state.root ? 'GraphApiNodeState (see console for details)' : null,
              expandedDepth: data.state.expandedDepth,
              operationPath: data.state.operationPath,
              type: 'GraphApiState',
              error: 'Complex object - check browser console for full details'
            }, null, 2)
          }
        default:
          return ''
      }
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  const beforeOutput = getDisplayValue(transformedData.before, outputFormat)
  const afterOutput = getDisplayValue(transformedData.after, outputFormat)


  return (
    <div className="graphql-debug-page">
      <div className="debug-page-header">
        <h1>GraphQL Debug Page</h1>
      </div>

      <div className="debug-page-content">
         <div className="input-section">
           <h2>GraphQL Specifications (Before/After)</h2>
           <div className="diff-editor-container">
            <DiffEditor
              height="400px"
              language="graphql"
              original={beforeSchema}
              modified={afterSchema}
              onMount={(editor, monaco) => {
                // Configure GraphQL language support
                monaco.languages.setLanguageConfiguration('graphql', {
                  comments: {
                    lineComment: '#',
                  },
                  brackets: [
                    ['{', '}'],
                    ['[', ']'],
                    ['(', ')']
                  ],
                  autoClosingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"' }
                  ]
                })

                // Set up change listeners for both editors
                const originalModel = editor.getOriginalEditor().getModel()
                const modifiedModel = editor.getModifiedEditor().getModel()
                
                if (originalModel) {
                  originalModel.onDidChangeContent(() => {
                    handleBeforeSchemaChange(originalModel.getValue())
                  })
                }
                
                if (modifiedModel) {
                  modifiedModel.onDidChangeContent(() => {
                    handleAfterSchemaChange(modifiedModel.getValue())
                  })
                }
              }}
              options={{
                renderSideBySide: true,
                readOnly: false,
                originalEditable: true, // Enable editing on the "Before" (original) side
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineHeight: 18,
                wordWrap: 'on'
              }}
            />
          </div>
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <h2>GraphQL Schema Preview (Rendered with api-doc-viewer)</h2>
            <div className="preview-controls">
              <div className="expand-depth-control">
                <label htmlFor="preview-depth">Expand Depth:</label>
                <select 
                  id="preview-depth"
                  value={previewExpandedDepth} 
                  onChange={(e) => setPreviewExpandedDepth(Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={100}>All</option>
                </select>
              </div>
            </div>
          </div>
          <div className="preview-panels">
            <div className="preview-panel">
              <h3>Before Schema</h3>
              <div className="preview-container">
                {transformedData.before.graphapiSchema ? (
                  <GraphQLOperationViewer 
                    source={transformedData.before.graphapiSchema}
                    expandedDepth={previewExpandedDepth}
                  />
                ) : (
                  <div className="preview-placeholder">
                    {beforeSchema.trim() ? 'Error processing schema' : 'No schema provided'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="preview-panel">
              <h3>After Schema</h3>
              <div className="preview-container">
                {transformedData.after.graphapiSchema ? (
                  <GraphQLOperationViewer 
                    source={transformedData.after.graphapiSchema}
                    expandedDepth={previewExpandedDepth}
                  />
                ) : (
                  <div className="preview-placeholder">
                    {afterSchema.trim() ? 'Error processing schema' : 'No schema provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        <div className="output-section">
          <div className="output-header">
            <h2>
              Transformed Output Diff ({outputFormat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())})
              {isTransforming && <span className="transforming-indicator"> 🔄 Transforming...</span>}
            </h2>
            <div className="output-controls">
              <div className="format-selector">
                <label htmlFor="output-format">Output Format:</label>
                <select 
                  id="output-format"
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                >
                  <option value="graphapi-schema">GraphAPI Schema</option>
                  <option value="tree-model">Tree Model</option>
                  <option value="state-model">State Model</option>
                </select>
              </div>
              
              <div className="view-mode-selector">
                <label htmlFor="output-view-mode">Output View:</label>
                <select 
                  id="output-view-mode"
                  value={outputViewMode} 
                  onChange={(e) => setOutputViewMode(e.target.value as 'diff' | 'inline')}
                >
                  <option value="diff">Side-by-Side Diff</option>
                  <option value="inline">Inline Diff</option>
                </select>
              </div>
            </div>
          </div>
          <div className="output-diff-container">
            <DiffEditor
              height="600px"
              language="json"
              original={beforeOutput}
              modified={afterOutput}
              options={{
                renderSideBySide: outputViewMode === 'diff',
                renderIndicators: true,
                readOnly: true,
                originalEditable: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineHeight: 18,
                wordWrap: 'on',
                diffWordWrap: 'on',
                enableSplitViewResizing: outputViewMode === 'diff',
                renderOverviewRuler: true,
                folding: true,
                hideUnchangedRegions: {
                  enabled: true,
                  minimumLineCount: 3,
                  contextLineCount: 3
                }
              }}
              onMount={(editor, monaco) => {
                // Configure JSON language for better diff visualization
                monaco.editor.setTheme('vs')
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
