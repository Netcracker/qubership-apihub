1. `PortalPage` directory should stay in `@netcracker/qubership-apihub-ui-portal` package
2. `EditorPage` directory should move to `@netcracker/qubership-apihub-ui-editor` package
3. `shared` directory inside `routes` should disappear
4. `hooks` & `workers` should disappear (now there is build problem when we move them to `ProjectEditorPage` component. It should be fixed after full migration to `@netcracker/qubership-apihub-api-processor`)
5. `entities` must be separated for 'portal' & 'editor' when `EditorPage` will be moved to `@netcracker/qubership-apihub-ui-editor`
6. `utils` should be moved to `@netcracker/qubership-apihub-ui-shared`
7. `components` at all (or mb part of them) should be moved to `@netcracker/qubership-apihub-ui-shared`
