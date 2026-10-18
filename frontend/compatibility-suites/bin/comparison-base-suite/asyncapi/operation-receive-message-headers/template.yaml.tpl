asyncapi: 3.0.0
info:
  title: asyncapi schema case (generated)
  version: 1.0.0
channels:
  requestChannel:
    address: test/request
    messages:
      requestMessage:
        headers:
          type: object
          properties:
            header1:
              __SCHEMA__
        payload:
          type: object
operations:
  operation1:
    action: receive
    channel:
      $ref: "#/channels/requestChannel"
    messages:
      - $ref: "#/channels/requestChannel/messages/requestMessage"
