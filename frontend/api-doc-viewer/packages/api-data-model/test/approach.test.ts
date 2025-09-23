import { GraphApiSchema } from "@netcracker/qubership-apihub-graphapi"
import { buildTree } from "../src/approach"

const SOURCE: GraphApiSchema = {
  "graphapi": "1.0.0",
  "queries": {
    "todo": {
      "output": {
        "typeDef": {
          "title": "MyType",
          "type": {
            "kind": "object",
            "methods": {
              "id": {
                "output": {
                  "typeDef": {
                    "type": {
                      "kind": "ID"
                    }
                  },
                  "nullable": false
                }
              },
              "name": {
                "output": {
                  "typeDef": {
                    "type": {
                      "kind": "string"
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
  "components": {
    "objects": {
      "MyType": {
        "title": "MyType",
        "type": {
          "kind": "object",
          "methods": {
            "id": {
              "output": {
                "typeDef": {
                  "type": {
                    "kind": "ID"
                  }
                },
                "nullable": false
              }
            },
            "name": {
              "output": {
                "typeDef": {
                  "type": {
                    "kind": "string"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

describe('approach', () => {
  it('should build tree (schema)', () => {
    const tree = buildTree(SOURCE)
    expect(tree).toBeDefined()
  })

  it('should build tree (schema, query)', () => {
    const tree = buildTree(SOURCE)
    tree.root.expand()
    expect(tree).toBeDefined()
  })

  it('should build tree (schema, query, output)', () => {
    const tree = buildTree(SOURCE)
    tree.root.expand()
    tree.root.children[0].expand()
    expect(tree).toBeDefined()
  })

  it('should build tree (schema, query, output, method "id" && method "name")', () => {
    const tree = buildTree(SOURCE)
    tree.root.expand()
    tree.root.children[0].expand()
    tree.root.children[0].children[0].expand()
    expect(tree).toBeDefined()
  })
})