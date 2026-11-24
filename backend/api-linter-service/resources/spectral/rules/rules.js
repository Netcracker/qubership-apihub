import { truthy, undefined as pattern, schema } from "@stoplight/spectral-functions";
import { oas3 } from "@stoplight/spectral-formats";

export default {
  rules: {
    "no-example-com-in-url": {
      description: "Url must not use example.com based domain inside",
      message: "Otherwise people won't know how to get it.",
      given: "$..*",
      severity: "warn",
      then: {
        field: "url",
        function: truthy,
        functionOptions: {
            notMatch: "example\.com",
        },
      },
    },
  },
};