declare global {
  interface HTMLElementTagNameMap {
    'apispec-view': ApispecView;
  }
}

export class ApispecView extends HTMLElement {
  set apiDescriptionDocument(value: string);

  set apiDescriptionUrl(value: string);

  set router(value: string);

  set layout(value: string);

  set hideTryIt(value: boolean);

  set hideExport(value: boolean);

  set selectedNodeUri(value: string);

  set schemaViewMode(value: string);

  set searchPhrase(value: string);

  set proxyServer(value: string);
}
