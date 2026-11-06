# OpenAPI cases review checklist

Tick a case once reviewed. Sources: `packages/samples/openapi/` and `packages/samples/openapi-diffs/`.

## `openapi/` (287)

### `oas30/e2e` (168)

- [x] `001-pair--summary--operation-id`
- [x] `002-pair--summary--address`
- [x] `003-pair--summary--description`
- [x] `004-pair--summary--security`
- [x] `005-pair--summary--operation-extensions`
- [x] `006-pair--summary--path-parameters`
- [x] `007-pair--summary--query-parameters`
- [x] `008-pair--summary--headers`
- [x] `009-pair--summary--cookies`
- [x] `010-pair--summary--body`
- [x] `011-pair--summary--responses-1-code-headers`
- [x] `012-pair--summary--responses-1-code-body`
- [x] `013-pair--summary--responses-2-codes-headers`
- [x] `014-pair--summary--responses-2-codes-body`
- [x] `015-pair--operation-id--address`
- [x] `016-pair--operation-id--description`
- [x] `017-pair--operation-id--security`
- [x] `018-pair--operation-id--operation-extensions`
- [x] `019-pair--operation-id--path-parameters`
- [x] `020-pair--operation-id--query-parameters`
- [x] `021-pair--operation-id--headers`
- [x] `022-pair--operation-id--cookies`
- [x] `023-pair--operation-id--body`
- [x] `024-pair--operation-id--responses-1-code-headers`
- [x] `025-pair--operation-id--responses-1-code-body`
- [x] `026-pair--operation-id--responses-2-codes-headers`
- [x] `027-pair--operation-id--responses-2-codes-body`
- [x] `028-pair--address--description`
- [x] `029-pair--address--security`
- [x] `030-pair--address--operation-extensions`
- [x] `031-pair--address--path-parameters`
- [x] `032-pair--address--query-parameters`
- [x] `033-pair--address--headers`
- [x] `034-pair--address--cookies`
- [x] `035-pair--address--body`
- [x] `036-pair--address--responses-1-code-headers`
- [x] `037-pair--address--responses-1-code-body`
- [x] `038-pair--address--responses-2-codes-headers`
- [x] `039-pair--address--responses-2-codes-body`
- [x] `040-pair--description--security`
- [x] `041-pair--description--operation-extensions`
- [x] `042-pair--description--path-parameters`
- [x] `043-pair--description--query-parameters`
- [x] `044-pair--description--headers`
- [x] `045-pair--description--cookies`
- [x] `046-pair--description--body`
- [x] `047-pair--description--responses-1-code-headers`
- [x] `048-pair--description--responses-1-code-body`
- [x] `049-pair--description--responses-2-codes-headers`
- [x] `050-pair--description--responses-2-codes-body`
- [x] `051-pair--security--operation-extensions`
- [x] `052-pair--security--path-parameters`
- [x] `053-pair--security--query-parameters`
- [x] `054-pair--security--headers`
- [x] `055-pair--security--cookies`
- [x] `056-pair--security--body`
- [x] `057-pair--security--responses-1-code-headers`
- [x] `058-pair--security--responses-1-code-body`
- [x] `059-pair--security--responses-2-codes-headers`
- [x] `060-pair--security--responses-2-codes-body`
- [x] `061-pair--operation-extensions--path-parameters`
- [x] `062-pair--operation-extensions--query-parameters`
- [x] `063-pair--operation-extensions--headers`
- [x] `064-pair--operation-extensions--cookies`
- [x] `065-pair--operation-extensions--body`
- [x] `066-pair--operation-extensions--responses-1-code-headers`
- [x] `067-pair--operation-extensions--responses-1-code-body`
- [x] `068-pair--operation-extensions--responses-2-codes-headers`
- [x] `069-pair--operation-extensions--responses-2-codes-body`
- [x] `070-pair--path-parameters--query-parameters`
- [x] `071-pair--path-parameters--headers`
- [x] `072-pair--path-parameters--cookies`
- [x] `073-pair--path-parameters--body`
- [x] `074-pair--path-parameters--responses-1-code-headers`
- [x] `075-pair--path-parameters--responses-1-code-body`
- [x] `076-pair--path-parameters--responses-2-codes-headers`
- [x] `077-pair--path-parameters--responses-2-codes-body`
- [x] `078-pair--query-parameters--headers`
- [x] `079-pair--query-parameters--cookies`
- [x] `080-pair--query-parameters--body`
- [x] `081-pair--query-parameters--responses-1-code-headers`
- [x] `082-pair--query-parameters--responses-1-code-body`
- [x] `083-pair--query-parameters--responses-2-codes-headers`
- [x] `084-pair--query-parameters--responses-2-codes-body`
- [x] `085-pair--headers--cookies`
- [x] `086-pair--headers--body`
- [x] `087-pair--headers--responses-1-code-headers`
- [x] `088-pair--headers--responses-1-code-body`
- [x] `089-pair--headers--responses-2-codes-headers`
- [x] `090-pair--headers--responses-2-codes-body`
- [x] `091-pair--cookies--body`
- [x] `092-pair--cookies--responses-1-code-headers`
- [x] `093-pair--cookies--responses-1-code-body`
- [x] `094-pair--cookies--responses-2-codes-headers`
- [x] `095-pair--cookies--responses-2-codes-body`
- [x] `096-pair--body--responses-1-code-headers`
- [x] `097-pair--body--responses-1-code-body`
- [x] `098-pair--body--responses-2-codes-headers`
- [x] `099-pair--body--responses-2-codes-body`
- [x] `100-pair--responses-1-code-headers--responses-1-code-body`
- [x] `101-pair--responses-2-codes-headers--responses-2-codes-body`
- [x] `102-window-3--summary--to--address`
- [x] `103-window-3--operation-id--to--description`
- [x] `104-window-3--address--to--security`
- [x] `105-window-3--description--to--operation-extensions`
- [x] `106-window-3--security--to--path-parameters`
- [x] `107-window-3--operation-extensions--to--query-parameters`
- [x] `108-window-3--path-parameters--to--headers`
- [x] `109-window-3--query-parameters--to--cookies`
- [x] `110-window-3--headers--to--body`
- [x] `111-window-3--cookies--to--responses-1-code-headers`
- [x] `112-window-3--body--to--responses-1-code-body`
- [x] `113-window-4--summary--to--description`
- [x] `114-window-4--operation-id--to--security`
- [x] `115-window-4--address--to--operation-extensions`
- [x] `116-window-4--description--to--path-parameters`
- [x] `117-window-4--security--to--query-parameters`
- [x] `118-window-4--operation-extensions--to--headers`
- [x] `119-window-4--path-parameters--to--cookies`
- [x] `120-window-4--query-parameters--to--body`
- [x] `121-window-4--headers--to--responses-1-code-headers`
- [x] `122-window-4--cookies--to--responses-1-code-body`
- [x] `123-window-5--summary--to--security`
- [x] `124-window-5--operation-id--to--operation-extensions`
- [x] `125-window-5--address--to--path-parameters`
- [x] `126-window-5--description--to--query-parameters`
- [x] `127-window-5--security--to--headers`
- [x] `128-window-5--operation-extensions--to--cookies`
- [x] `129-window-5--path-parameters--to--body`
- [x] `130-window-5--query-parameters--to--responses-1-code-headers`
- [x] `131-window-5--headers--to--responses-1-code-body`
- [x] `132-window-6--summary--to--operation-extensions`
- [x] `133-window-6--operation-id--to--path-parameters`
- [x] `134-window-6--address--to--query-parameters`
- [x] `135-window-6--description--to--headers`
- [x] `136-window-6--security--to--cookies`
- [x] `137-window-6--operation-extensions--to--body`
- [x] `138-window-6--path-parameters--to--responses-1-code-headers`
- [x] `139-window-6--query-parameters--to--responses-1-code-body`
- [x] `140-window-7--summary--to--path-parameters`
- [x] `141-window-7--operation-id--to--query-parameters`
- [x] `142-window-7--address--to--headers`
- [x] `143-window-7--description--to--cookies`
- [x] `144-window-7--security--to--body`
- [x] `145-window-7--operation-extensions--to--responses-1-code-headers`
- [x] `146-window-7--path-parameters--to--responses-1-code-body`
- [x] `147-window-8--summary--to--query-parameters`
- [x] `148-window-8--operation-id--to--headers`
- [x] `149-window-8--address--to--cookies`
- [x] `150-window-8--description--to--body`
- [x] `151-window-8--security--to--responses-1-code-headers`
- [x] `152-window-8--operation-extensions--to--responses-1-code-body`
- [x] `153-window-9--summary--to--headers`
- [x] `154-window-9--operation-id--to--cookies`
- [x] `155-window-9--address--to--body`
- [x] `156-window-9--description--to--responses-1-code-headers`
- [x] `157-window-9--security--to--responses-1-code-body`
- [x] `158-window-10--summary--to--cookies`
- [x] `159-window-10--operation-id--to--body`
- [x] `160-window-10--address--to--responses-1-code-headers`
- [x] `161-window-10--description--to--responses-1-code-body`
- [x] `162-window-11--summary--to--body`
- [x] `163-window-11--operation-id--to--responses-1-code-headers`
- [x] `164-window-11--address--to--responses-1-code-body`
- [x] `165-window-12--summary--to--responses-1-code-headers`
- [x] `166-window-12--operation-id--to--responses-1-code-body`
- [x] `167-window-13--summary--to--responses-1-code-body`
- [x] `168-all-sections`

### `oas30/minimal` (1)

- [x] `01-default-response-only`

### `oas30/http-methods` (8)

- [ ] `01-get`
- [ ] `02-put`
- [ ] `03-post`
- [ ] `04-delete`
- [ ] `05-options`
- [ ] `06-head`
- [ ] `07-patch`
- [ ] `08-trace`

### `oas30/fields/operation` (5)

- [x] `01-summary`
- [x] `02-operation-id`
- [x] `03-description`
- [x] `04-external-docs`
- [x] `05-extensions`

### `oas30/fields/security` (17)

- [x] `01-api-key-header`
- [x] `02-api-key-query`
- [x] `03-api-key-cookie`
- [x] `04-http-basic`
- [x] `05-http-bearer`
- [x] `06-http-bearer-format`
- [x] `07-oauth2-implicit-required-scope`
- [x] `08-oauth2-implicit-optional-scope`
- [x] `09-oauth2-password-required-scope`
- [x] `10-oauth2-password-optional-scope`
- [x] `11-oauth2-client-credentials-required-scope`
- [x] `12-oauth2-client-credentials-optional-scope`
- [x] `13-oauth2-authorization-code-required-scope`
- [x] `14-oauth2-authorization-code-optional-scope`
- [x] `15-openid-connect-required-scope`
- [x] `16-openid-connect-no-required-scopes`
- [x] `17-scheme-description`

### `oas30/fields/parameters` (4)

- [x] `01-path-parameters`
- [x] `02-query-parameters`
- [x] `03-request-headers`
- [x] `04-cookies`

### `oas30/fields/request-body` (7)

- [x] `01-required-1-media-type`
- [x] `02-optional-1-media-type`
- [x] `03-deprecated-1-media-type`
- [x] `04-required-2-media-types`
- [x] `05-optional-2-media-types`
- [x] `06-deprecated-2-media-types`
- [x] `07-body-and-schema-descriptions`

### `oas30/fields/request-combinations` (10)

- [x] `01-path-parameters--query-parameters`
- [x] `02-path-parameters--request-headers`
- [x] `03-path-parameters--cookies`
- [x] `04-path-parameters--request-body`
- [x] `05-query-parameters--request-headers`
- [x] `06-query-parameters--cookies`
- [x] `07-query-parameters--request-body`
- [x] `08-request-headers--cookies`
- [x] `09-request-headers--request-body`
- [x] `10-cookies--request-body`

### `oas30/fields/responses/2xx` (11)

- [x] `01-status-only`
- [x] `02-description-only`
- [x] `03-headers-only`
- [x] `04-body-1-media-type`
- [x] `05-body-2-media-types`
- [x] `06-body-deprecated-1-media-type`
- [x] `07-body-deprecated-2-media-types`
- [x] `08-description-and-headers`
- [x] `09-description-and-body`
- [x] `10-headers-and-body`
- [x] `11-description-and-body-schema-description`

### `oas30/fields/responses/3xx` (11)

- [x] `01-status-only`
- [x] `02-description-only`
- [x] `03-headers-only`
- [x] `04-body-1-media-type`
- [x] `05-body-2-media-types`
- [x] `06-body-deprecated-1-media-type`
- [x] `07-body-deprecated-2-media-types`
- [x] `08-description-and-headers`
- [x] `09-description-and-body`
- [x] `10-headers-and-body`
- [x] `11-description-and-body-schema-description`

### `oas30/fields/responses/4xx` (11)

- [x] `01-status-only`
- [x] `02-description-only`
- [x] `03-headers-only`
- [x] `04-body-1-media-type`
- [x] `05-body-2-media-types`
- [x] `06-body-deprecated-1-media-type`
- [x] `07-body-deprecated-2-media-types`
- [x] `08-description-and-headers`
- [x] `09-description-and-body`
- [x] `10-headers-and-body`
- [x] `11-description-and-body-schema-description`

### `oas30/fields/responses/5xx` (11)

- [x] `01-status-only`
- [x] `02-description-only`
- [x] `03-headers-only`
- [x] `04-body-1-media-type`
- [x] `05-body-2-media-types`
- [x] `06-body-deprecated-1-media-type`
- [x] `07-body-deprecated-2-media-types`
- [x] `08-description-and-headers`
- [x] `09-description-and-body`
- [x] `10-headers-and-body`
- [x] `11-description-and-body-schema-description`

### `oas30/structure` (9)

- [x] `01-path-item-parameters-with-override`
- [x] `02-ref-parameter-body-response`
- [x] `03-ignored-headers-shown`
- [x] `04-response-code-order`
- [x] `05-security-inherited-from-document`
- [x] `06-security-disabled`
- [x] `07-security-anonymous-alternative`
- [x] `08-deprecated-operation`
- [x] `09-deprecated-operation-without-summary`

### `oas31/fields/security` (3)

- [x] `01-mutual-tls`
- [x] `02-roles-on-api-key`
- [x] `03-roles-on-http-bearer`

### `oas31/fields/responses` (1)

- [x] `01-no-responses`

### `oas31/fields/schemas` (8)

- [x] `01-nullable-type-array-parameter`
- [x] `02-nullable-type-array-body`
- [x] `03-numeric-exclusive-bounds`
- [x] `04-examples-array`
- [ ] ~~`05-const`~~
- [x] `06-enum-without-type`
- [x] `07-boolean-schema`
- [ ] ~~`08-content-media-type-encoding`~~

### `oas31/structure` (2)

- [x] `01-reference-description-overrides`
- [x] `02-components-path-items`

## `openapi-diffs/` (252)

### `cookies` (26)

- [x] `01-entry-added`
- [x] `02-entry-removed`
- [x] `03-entry-renamed`
- [x] `04-required-added`
- [x] `05-required-removed`
- [x] `06-description-added`
- [x] `07-description-removed`
- [x] `08-description-changed`
- [x] `09-deprecated-added`
- [x] `10-deprecated-removed`
- [x] `11-schema-to-content`
- [x] `12-content-to-schema`
- [x] `13-content-media-type-renamed`
- [x] `14-extension-added`
- [x] `15-extension-removed`
- [x] `16-extension-changed`
- [ ] ~~`17-extension-moved-to-schema`~~
- [ ] ~~`18-extension-moved-to-entry`~~
- [x] `19-all-added`
- [x] `20-all-removed`
- [x] `21-description-moved-entry-to-schema`
- [x] `22-description-moved-schema-to-entry`
- [x] `23-description-entry-removed-schema-added`
- [x] `24-description-schema-removed-entry-added`
- [x] `25-description-both-places-changed`
- [x] `26-description-schema-changed-under-entry`

### `oas31` (7)

- [x] `01-nullable-via-type-array`
- [x] `02-mutual-tls-alternative-added`
- [x] `03-mutual-tls-alternative-removed`
- [ ] `04-role-scopes-added`
- [ ] `05-role-scopes-removed`
- [x] `06-responses-added`
- [x] `07-responses-removed`

### `operation` (24)

- [x] `01-summary-added`
- [x] `02-summary-removed`
- [x] `03-summary-changed`
- [x] `04-operation-id-added`
- [x] `05-operation-id-removed`
- [x] `06-operation-id-changed`
- [x] `07-description-added`
- [x] `08-description-removed`
- [x] `09-description-changed`
- [x] `10-external-docs-added`
- [x] `11-external-docs-removed`
- [x] `12-external-docs-url-changed`
- [x] `13-external-docs-description-changed`
- [x] `14-deprecated-added`
- [x] `15-deprecated-removed`
- [x] `16-deprecated-added-without-summary`
- [x] `17-deprecated-removed-without-summary`
- [x] `18-extension-added`
- [x] `19-extension-removed`
- [x] `20-extension-changed`
- [x] `21-extensions-added`
- [x] `22-extensions-removed`
- [x] `23-operation-added`
- [x] `24-operation-removed`

### `path-parameters` (20)

- [x] `03-entry-renamed`
- [x] `06-description-added`
- [x] `07-description-removed`
- [x] `08-description-changed`
- [x] `09-deprecated-added`
- [x] `10-deprecated-removed`
- [x] `11-schema-to-content`
- [x] `12-content-to-schema`
- [x] `13-content-media-type-renamed`
- [x] `14-extension-added`
- [x] `15-extension-removed`
- [x] `16-extension-changed`
- [ ] ~~`17-extension-moved-to-schema`~~
- [ ] ~~`18-extension-moved-to-entry`~~
- [x] `21-description-moved-entry-to-schema`
- [x] `22-description-moved-schema-to-entry`
- [x] `23-description-entry-removed-schema-added`
- [x] `24-description-schema-removed-entry-added`
- [x] `25-description-both-places-changed`
- [x] `26-description-schema-changed-under-entry`

### `query-parameters` (28)

- [x] `01-entry-added`
- [x] `02-entry-removed`
- [x] `03-entry-renamed`
- [x] `04-required-added`
- [x] `05-required-removed`
- [x] `06-description-added`
- [x] `07-description-removed`
- [x] `08-description-changed`
- [x] `09-deprecated-added`
- [x] `10-deprecated-removed`
- [x] `11-schema-to-content`
- [x] `12-content-to-schema`
- [x] `13-content-media-type-renamed`
- [x] `14-extension-added`
- [x] `15-extension-removed`
- [x] `16-extension-changed`
- [ ] ~~`17-extension-moved-to-schema`~~
- [ ] ~~`18-extension-moved-to-entry`~~
- [x] `19-all-added`
- [x] `20-all-removed`
- [x] `21-description-moved-entry-to-schema`
- [x] `22-description-moved-schema-to-entry`
- [x] `23-description-entry-removed-schema-added`
- [x] `24-description-schema-removed-entry-added`
- [x] `25-description-both-places-changed`
- [x] `26-description-schema-changed-under-entry`
- [x] `27-moved-query-to-header`
- [x] `28-moved-header-to-query`

### `request-body` (25)

- [x] `01-body-added`
- [x] `02-body-removed`
- [x] `03-required-added`
- [x] `04-required-removed`
- [x] `05-description-added`
- [x] `06-description-removed`
- [x] `07-description-changed`
- [x] `08-media-type-added`
- [x] `09-media-type-removed`
- [x] `10-media-type-renamed`
- [x] `11-only-media-type-added`
- [x] `12-only-media-type-removed`
- [x] `13-media-type-added-description-kept`
- [x] `14-media-type-removed-description-kept`
- [x] `15-schema-added`
- [x] `16-schema-removed`
- [x] `17-schema-property-added`
- [x] `18-schema-property-removed`
- [x] `19-schema-type-changed`
- [ ] ~~`20-body-extension-added`~~
- [ ] ~~`21-body-extension-removed`~~
- [ ] ~~`22-media-type-extension-added`~~
- [ ] ~~`23-media-type-extension-removed`~~
- [ ] ~~`24-extensions-changed`~~
- [ ] ~~`25-media-type-extension-shadows-schema-root`~~

### `request-headers` (26)

- [x] `01-entry-added`
- [x] `02-entry-removed`
- [x] `03-entry-renamed`
- [x] `04-required-added`
- [x] `05-required-removed`
- [x] `06-description-added`
- [x] `07-description-removed`
- [x] `08-description-changed`
- [x] `09-deprecated-added`
- [x] `10-deprecated-removed`
- [x] `11-schema-to-content`
- [x] `12-content-to-schema`
- [x] `13-content-media-type-renamed`
- [x] `14-extension-added`
- [x] `15-extension-removed`
- [x] `16-extension-changed`
- [ ] ~~`17-extension-moved-to-schema`~~
- [ ] ~~`18-extension-moved-to-entry`~~
- [x] `19-all-added`
- [x] `20-all-removed`
- [x] `21-description-moved-entry-to-schema`
- [x] `22-description-moved-schema-to-entry`
- [x] `23-description-entry-removed-schema-added`
- [x] `24-description-schema-removed-entry-added`
- [x] `25-description-both-places-changed`
- [x] `26-description-schema-changed-under-entry`

### `response-body` (13)

- [x] `01-body-added`
- [x] `02-body-removed`
- [x] `08-media-type-added`
- [x] `09-media-type-removed`
- [x] `10-media-type-renamed`
- [x] `15-schema-added`
- [x] `16-schema-removed`
- [x] `17-schema-property-added`
- [x] `18-schema-property-removed`
- [x] `19-schema-type-changed`
- [ ] ~~`22-media-type-extension-added`~~
- [ ] ~~`23-media-type-extension-removed`~~
- [ ] ~~`25-media-type-extension-shadows-schema-root`~~

### `response-headers` (26)

- [x] `01-entry-added`
- [x] `02-entry-removed`
- [x] `03-entry-renamed`
- [x] `04-required-added`
- [x] `05-required-removed`
- [x] `06-description-added`
- [x] `07-description-removed`
- [x] `08-description-changed`
- [x] `09-deprecated-added`
- [x] `10-deprecated-removed`
- [x] `11-schema-to-content`
- [x] `12-content-to-schema`
- [x] `13-content-media-type-renamed`
- [x] `14-extension-added`
- [x] `15-extension-removed`
- [x] `16-extension-changed`
- [ ] ~~`17-extension-moved-to-schema`~~
- [ ] ~~`18-extension-moved-to-entry`~~
- [x] `19-all-added`
- [x] `20-all-removed`
- [x] `21-description-moved-entry-to-schema`
- [x] `22-description-moved-schema-to-entry`
- [x] `23-description-entry-removed-schema-added`
- [x] `24-description-schema-removed-entry-added`
- [x] `25-description-both-places-changed`
- [x] `26-description-schema-changed-under-entry`

### `responses` (25)

- [x] `01-response-1xx-added`
- [x] `02-response-1xx-removed`
- [x] `03-response-2xx-added`
- [x] `04-response-2xx-removed`
- [x] `05-response-3xx-added`
- [x] `06-response-3xx-removed`
- [x] `07-response-4xx-added`
- [x] `08-response-4xx-removed`
- [x] `09-response-5xx-added`
- [x] `10-response-5xx-removed`
- [x] `11-response-range-added`
- [x] `12-response-range-removed`
- [x] `13-response-default-added`
- [x] `14-response-default-removed`
- [x] `15-code-case-renamed`
- [x] `16-code-renamed-and-description-changed`
- [x] `17-description-changed`
- [x] `18-description-changed-non-initial-code`
- [x] `19-response-extension-added`
- [x] `20-response-extension-removed`
- [x] `21-response-extension-changed`
- [x] `22-responses-extension-added`
- [x] `23-responses-extension-removed`
- [ ] ~~`24-responses-and-response-extensions-changed`~~
- [x] `25-changes-of-different-severity`

### `security` (32)

- [x] `01-security-added`
- [x] `02-security-removed`
- [x] `03-document-security-overridden`
- [x] `04-document-security-override-removed`
- [x] `05-alternative-added`
- [x] `06-alternative-removed`
- [ ] `07-anonymous-alternative-added`
- [ ] `08-anonymous-alternative-removed`
- [x] `09-scheme-added-to-alternative`
- [x] `10-scheme-removed-from-alternative`
- [x] `11-required-scope-added`
- [x] `12-required-scope-removed`
- [x] `13-scheme-description-added`
- [x] `14-scheme-description-removed`
- [ ] `15-scheme-description-changed`
- [x] `16-scheme-type-changed`
- [x] `17-scheme-definition-added`
- [x] `18-scheme-definition-removed`
- [x] `19-api-key-location-changed`
- [x] `20-api-key-name-changed`
- [x] `21-http-scheme-changed`
- [x] `22-bearer-format-added`
- [x] `23-bearer-format-removed`
- [x] `24-openid-connect-url-changed`
- [x] `25-oauth-flow-added`
- [x] `26-oauth-flow-removed`
- [x] `27-token-url-changed`
- [x] `28-refresh-url-added`
- [x] `29-refresh-url-removed`
- [x] `30-flow-scope-added`
- [x] `31-flow-scope-removed`
- [x] `32-flow-scope-description-changed`
