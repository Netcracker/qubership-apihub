/**
 * Hand-crafted Realm fixtures for fixed viewer/transformer regressions.
 * Each story models a bug shape (e.g. single-table partial realm) — not SQL samples.
 */
import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import type { Meta, StoryObj } from "@storybook/react";
import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder";
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";

const navigationLinkBuilder: NavigationLinkBuilder = (schema, table, column) => {
  console.log(`Navigating to ${schema}.${table}.${column}`);
  return `#${schema}.${table}.${column}`;
};

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: "ddlapi-suite-bugs",
  title: "DDL API Suite/Bugs",
  component: DdlTableViewer,
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof DdlTableViewer>;

export default meta;

type Story = StoryObj<typeof DdlTableViewer>;

const BUG_FOREIGN_KEY_REALM: Realm = {
  "ddlapi": "1.0.0",
  "schemas": [
    {
      "name": "public",
      "tables": [
        {
          "kind": "Table",
          "name": "ai_chat",
          "columns": [
            {
              "name": "id",
              "type": {
                "type": {
                  "kind": "UUIDType",
                  "type": "uuid"
                }
              }
            },
            {
              "name": "user_id",
              "type": {
                "type": {
                  "kind": "StringType",
                  "type": "varchar"
                },
                "null": false
              }
            },
            {
              "name": "title",
              "type": {
                "type": {
                  "kind": "StringType",
                  "type": "text"
                },
                "null": false
              },
              "default": {
                "kind": "RawExpr",
                "expr": "''::text"
              }
            },
            {
              "name": "pinned",
              "type": {
                "type": {
                  "kind": "BoolType",
                  "type": "boolean"
                },
                "null": false
              },
              "default": {
                "kind": "Literal",
                "value": "false"
              }
            },
            {
              "name": "created_at",
              "type": {
                "type": {
                  "kind": "TimeType",
                  "type": "timestamp"
                },
                "null": false
              }
            },
            {
              "name": "last_message_at",
              "type": {
                "type": {
                  "kind": "TimeType",
                  "type": "timestamp"
                },
                "null": false
              }
            },
            {
              "name": "messages_count",
              "type": {
                "type": {
                  "kind": "IntegerType",
                  "type": "integer"
                },
                "null": false
              },
              "default": {
                "kind": "Literal",
                "value": "0"
              }
            },
            {
              "name": "compacted_up_to_created_at",
              "type": {
                "type": {
                  "kind": "TimeType",
                  "type": "timestamp"
                }
              }
            },
            {
              "name": "compaction_summary",
              "type": {
                "type": {
                  "kind": "StringType",
                  "type": "text"
                }
              }
            },
            {
              "name": "last_turn_tokens",
              "type": {
                "type": {
                  "kind": "IntegerType",
                  "type": "integer"
                }
              }
            }
          ],
          "primaryKey": {
            "kind": "Index",
            "parts": [
              {
                "seqNo": 0,
                "column": "id"
              }
            ],
            "name": "ai_chat_pkey"
          },
          "foreignKeys": [
            {
              "kind": "ForeignKey",
              "symbol": "ai_chat_user_fk",
              "columns": [
                "user_id"
              ],
              "onDelete": "CASCADE",
              "refTable": {
                "schema": "public",
                "name": "user_data"
              },
              "refColumns": [
                "user_id"
              ]
            }
          ],
          "indexes": [
            {
              "kind": "Index",
              "name": "ai_chat_retention_idx",
              "parts": [
                {
                  "seqNo": 0,
                  "column": "user_id"
                },
                {
                  "seqNo": 1,
                  "column": "pinned"
                },
                {
                  "seqNo": 2,
                  "column": "last_message_at"
                }
              ]
            },
            {
              "kind": "Index",
              "name": "ai_chat_user_sort_idx",
              "parts": [
                {
                  "seqNo": 0,
                  "column": "user_id"
                },
                {
                  "seqNo": 1,
                  "desc": true,
                  "column": "pinned"
                },
                {
                  "seqNo": 2,
                  "desc": true,
                  "column": "last_message_at"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

const BUG_FOREIGN_KEY_TABLE_KEY: TableKey = { schemaName: "public", name: "ai_chat" };

export const BugForeignKey: Story = {
  render: () => (
    <DdlTableViewer
      source={BUG_FOREIGN_KEY_REALM}
      tableKey={BUG_FOREIGN_KEY_TABLE_KEY}
      navigationLinkBuilder={navigationLinkBuilder}
      devMode
    />
  ),
};