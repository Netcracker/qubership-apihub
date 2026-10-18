import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder";

/** In-page anchor for FK target links in DDL stories (hosts navigate to their own routes). */
export const ddlStoryNavigationLinkBuilder: NavigationLinkBuilder = (schema, table, column) =>
  `#${schema}.${table}.${column}`;
