# qubership-apihub-api-visitor

Visitor util for type-safe OpenAPI specification crawling

# Self loops

If schema object creates a loop, it's being marked with a special unique symbol `isSelfLoop`
You can stop the branch from visiting further relying on if `isSelfLoop` is truthy or not