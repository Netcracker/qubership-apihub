openapi: 3.0.4
info:
  title: openapi schema case (generated)
  version: 1.0.0
paths:
  /path1:
    post:
      parameters:
        - name: param1
          in: query
          schema:
            __SCHEMA__
      responses:
        "200":
          description: OK
