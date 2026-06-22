<agents-context>
  <entities>
    <property-name>
      - String value used as a key in tree node value.
    </property-name>
    <NodeDiffsSeverityPlacemennt>
      <description>
        - Predefined list of places which may be colorized/highlighted during rendering of <diff> in tree nodes.
        - Usually place describes 1 component which renders 1 part of tree node in <view-layer>.
      </description>
      <examples>
        - title-row
        - description-row
      </examples>
    </NodeDiffsSeverityPlacemennt>
    <NodeDiffsSeverity>
      - Contains field `type` from <diff> and path where <diff> occurred in original document.
    </NodeDiffsSeverity>
    <descendant-key>
      - Key of tree node which current tree node considers as a descendant
      - Matches with field `key` in an instance of tree node
    </descendant-key>
    <related-to-diff>
      <ChangedPropertyMetaData>
        - Special entity containing both <diff> and precalculated data about styles for rendering in <view-layer>.
      </ChangedPropertyMetaData>
      <node-diffs>
        - <diff> special record containing all <diff> related to current tree node.
        - Key of the record is <property-name>.
        - Value of the record is <diff>.
        - Exceptional reserved key `""` (empty string) is used for <diff> which describes <description>this node or its parent node or container node was wholly changed (added, removed, replaced)</description>.
        - May be an empty record.
      </node-diffs>
      <node-descendants-diffs>
        - Special record containing summarized bunch of <diff> from direct descendants of current tree node.
        - Descendants of current tree node are placed in its properties `childrenNodes` and `nestedNodes`.
        - Key of the record is <descendant-key>
        - Value of the record is <ChangedPropertyMetaData>
      </node-descendants-diffs>
      <node-descendants-diffs-summary>
        - Just a unique set of values of field `type` from <diff>
        - Collected from <node-diffs> and <node-descendants-diffs>
      </node-descendants-diffs-summary>
      <node-diffs-severities>
        - Key of the record is <NodeDiffsSeverityPlacemennt>
        - Value of the record is entity <NodeDiffsSeverity> 
      </node-diffs-severities>
    </related-to-diff>
  </entities>

  <development-rules>
    <architecture>
      <pattern>
        We strive to have multi-layer architecture of the data layer.
      </pattern>
      <layers>
        <model>
          <path>./src/model</path>
          <description>
            Describes types to define tree-like data model with properties and methods.
          </description>
          <sub-layers>
            <abstract-sub-layer>
              <tree>
                <path>./src/model/abstract/tree</path>
                <description>
                  - Describes types to define abstract tree-like data model (contract, API).
                  - Must be used only for interpreting <normalized-document>.
                </description>
              </tree>
              <tree-with-diffs>
                <path>./src/model/abstract/tree-with-diffs</path>
                <description>
                  - Describes types to define abstract tree-like data model (contract, API) with extended API to additional support of <diff> and related entities.
                  - Must be used only for interpreting <merged-document>.
                </description>
              </tree-with-diffs>
            </abstract-sub-layer>
            <async-api-sub-layer>
              <tree>
                <path>./src/model/async-api/tree</path>
                <description>
                  - Implementing <abstract-sub-layer>.<tree> with AsyncAPI API Type specific.
                </description>
              </tree>
              <tree-with-diffs>
                <path>./src/model/async-api/tree-with-diffs</path>
                <description>
                  - Implementing <abstract-sub-layer>.<tree-with-diffs> with AsyncAPI API Type specific.
                </description>
              </tree-with-diffs>
            </async-api-sub-layer>
            <jso-sub-layer>
              <tree>
                <path>./src/model/jso/tree</path>
                <description>
                  - Implementing <abstract-sub-layer>.<tree> with JavaScript Object (JSO) API Type specific.
                </description>
              </tree>
              <tree-with-diffs>
                <path>./src/model/jso/tree-with-diffs</path>
                <description>
                  - Implementing <abstract-sub-layer>.<tree-with-diffs> with  JavaScript Object (JSO) API Type specific.
                </description>
              </tree-with-diffs>
            </jso-sub-layer>
          </sub-layers>
        </model>
        <building-service>
          <path>./src/building-service</path>
          <description>
            Must encapsulate all logic of building <model>
          </description>
          <sub-layers>
            <abstract-sub-layer>
              <tree>
                <path>./src/building-service/abstract/tree</path>
                <node-data>
                  <builder>
                    <path>./builder.ts</path>
                    <description>
                      - Contract of types, properties and methods to build abstract tree node value and abstract tree node meta.
                      - Abstract tree node value contains the most of valuable information related to tree node.
                      - Abstract tree node value and tree node meta are build from original document fragment by picking necessary and allowed props.
                      - Allowance of picked props list is constrainted by types.
                    </description>
                  </builder>
                </node-data>
                <builder>
                  <path>./builder.ts</path>
                  <description>
                    - Contract of types, properties and methods to build abstract tree.
                  </description>
                </builder>
              </tree>
              <tree-with-diffs>
                <path>./src/building-service/abstract/tree-with-diffs</path>
                <node-diffs-data>
                  <path>./node-diffs-data</path>
                  <description>
                    - Set of abstract classes (contracts for auxilliary classes) called "aggregators" in our project.
                    - Each abstract class defines contract which will be used to aggregate specific data about <diff>.
                    - Each abstract related to corresponding entity described in <entities> here.
                  </description>
                </node-diffs-data>
                <builder>
                  <path>./builder.ts</path>
                  <description>
                    - Contract of types, properties and methods to build abstract tree.
                  </description>
                </builder>
              </tree-with-diffs>
            </abstract-sub-layer>
            <async-api-sub-layer>
              <tree>
                <path>./src/building-service/async-api/tree</path>
                <description>
                  Implementation of <abstract-sub-layer>.<tree> with AsyncAPI specific
                </description>
              </tree>
              <tree-with-diffs>
                <path>./src/building-service/async-api/tree-with-diffs</path>
                <description>
                  Implementation of <abstract-sub-layer>.<tree-with-diffs> with AsyncAPI specific
                </description>
              </tree-with-diffs>
            </async-api-sub-layer>
            <jso-sub-layer>
              <tree>
                <path>./src/building-service/jso/tree</path>
                <description>
                  Implementation of <abstract-sub-layer>.<tree> with JavaScript Object (JSO) specific
                </description>
              </tree>
              <tree-with-diffs>
                <path>./src/building-service/jso/tree-with-diffs</path>
                <description>
                  Implementation of <abstract-sub-layer>.<tree-with-diffs> with JavaScript Object (JSO) specific
                </description>
              </tree-with-diffs>
            </jso-sub-layer>
          </sub-layers>
        </building-service>
      </layers>
    </architecture>
  </development-rules>
</agents-context>