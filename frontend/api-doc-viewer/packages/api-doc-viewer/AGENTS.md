<agents-context>
  <components>
    <old-components>
      <JsonSchemaViewer>
        <path>./src/components/JsonSchemaViewer</path>
      </JsonSchemaViewer>
      <GraphSchemaViewer>
        <path>./src/components/GraphSchemaViewer</path>
      </GraphSchemaViewer>
      <GraphQLOperationViewer>
        <path>./src/components/GraphQLOperationViewer</path>
      </GraphQLOperationViewer>
    </old-components>
    <new-components>
      <AsyncApiOperationViewer>
        <path>./src/components/AsyncApiOperationViewer</path>
      </AsyncApiOperationViewer>
      <JsoViewer>
        <path>./src/components/JsoViewer</path>
      </JsoViewer>
    </new-components>
  </components>

  <terms>
    <layout-mode>
      Way how we render our layout in components. There are 2 ways: one-sided layout and two-sided layout (splitted screen).
      <one-sided-layout>
        Used for rendering document without displaying <diff>.
      </one-sided-layout>
      <two-sided-layout>
        <synonym>side-by-side-diffs</synonym>
        Used for rendering document with displaying <diff> and related markers, badges and other elements.
      <two-sided-layout>
    </layout-mode>
    <display-mode>
      <simple>Only the most important information as titles and headers, without annotations like description, deprecation reason and so on.</simple>
      <detailed>All information is visible</detailed>
    </display-mode>
  </terms>

  <development-rules>
    <critical-constraints>
      1. Never modify components from list <old-components> without my approval.
      2. Try to apply new changes in <new-components> without modifying <old-components>.
      3. If you stuck during point 2, request the approval.
    </critical-constraints>
  </development-rules>
</agents-context>