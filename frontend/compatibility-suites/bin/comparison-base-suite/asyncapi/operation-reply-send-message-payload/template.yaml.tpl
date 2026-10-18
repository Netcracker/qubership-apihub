asyncapi: 3.0.0
info:
  title: asyncapi schema case (generated)
  version: 1.0.0
channels:
  requestChannel:
    address: test/request
    messages:
      requestMessage:
        payload:
          type: object
  replyChannel:
    address: test/reply
    messages:
      replyMessage:
        payload:
          __SCHEMA__
operations:
  operation1:
    action: send
    channel:
      $ref: "#/channels/requestChannel"
    messages:
      - $ref: "#/channels/requestChannel/messages/requestMessage"
    reply:
      channel:
        $ref: "#/channels/replyChannel"
      messages:
        - $ref: "#/channels/replyChannel/messages/replyMessage"
