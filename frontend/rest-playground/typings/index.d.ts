declare module '@netcracker/qubership-apihub-rest-playground';

declare global {
  interface HTMLElementTagNameMap {
    'rest-playground': RestPlayground;
    'rest-examples': RestExamples;
  }

  interface RestPlaygroundEventMap extends HTMLElementEventMap {
    createCustomService: CustomEvent<null>;
  }
}

export class RestPlayground extends HTMLElement {
  set document(value: string);

  set customServers(value: string);
}

export class RestExamples extends HTMLElement {
  set document(value: string);
}
