import { DiffType } from '@netcracker/qubership-apihub-api-diff';
import { DiffMetaKeys } from '@netcracker/qubership-apihub-api-doc-viewer';

declare global {
  interface HTMLElementTagNameMap {
    'apispec-view': ApispecView;
    'operation-view': OperationView;
    'diff-operation-view': DiffOperationView;
  }
}

export class ApispecView extends HTMLElement {
  set apiDescriptionDocument(value: string);

  set router(value: string);

  set layout(value: string);

  set hideTryIt(value: boolean);

  set selectedNodeUri(value: string);

  set schemaViewMode(value: string);

  set searchPhrase(value: string);

  set proxyServer(value: string);
}

export class OperationView extends HTMLElement {
  set router(value: string);

  set layout(value: string);

  set hideTryIt(value: boolean);

  set schemaViewMode(value: string);

  set searchPhrase(value: string);

  set hideSchemas(value: boolean);

  set hideInternal(value: boolean);

  set hideExport(value: boolean);

  set hideExamples(value: boolean);

  set noHeading(value: boolean);

  set tryItCredentialsPolicy(value: string | undefined);

  set tryItCorsProxy(value: string | undefined);

  set defaultSchemaDepth(value: number | undefined);

  set proxyServer(value: IServer | undefined);

  set selectedNodeUri(value: string | undefined);

  set mergedDocument(value: unknown | undefined);

  constructor(props) {
    super(props);
  }
}

export class DiffOperationView extends HTMLElement {
  set router(value: string);

  set layout(value: string);

  set hideTryIt(value: boolean);

  set schemaViewMode(value: string);

  set searchPhrase(value: string);

  set hideSchemas(value: boolean);

  set hideInternal(value: boolean);

  set hideExport(value: boolean);

  set hideExamples(value: boolean);

  set noHeading(value: boolean);

  set tryItCredentialsPolicy(value: string | undefined);

  set tryItCorsProxy(value: string | undefined);

  set defaultSchemaDepth(value: number | undefined);

  set proxyServer(value: IServer | undefined);

  set selectedNodeUri(value: string | undefined);

  set mergedDocument(value: unknown | undefined);

  // diff specific

  set filters(value: DiffType[]);

  set diffMetaKeys(value: DiffMetaKeys);

  constructor(props) {
    super(props);
  }
}
