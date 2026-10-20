**Design Item ID**: DI‐Portal‐OPVIEW‐001  
**Design Item Name**: REST Operation Schema Rendering in Doc View  
**Related Design Items**:  
**Related API**: -  
**Revision History:**

| Date | Description |
| ---- | ----------- |
|      |             |

---

APIHUB doc view allows a user with the ability to view content of REST operation in user friendly and interactive way. Current page dedicated to the schema rendering of REST operations for OAS 3.0.

# property name, title, type, format

## name
The property name is displayed in bold, followed by the type.

## type and format of scalar
- If property is reference to components.schemas, it will be displayed in the same way as if it were inline.
If the referenced schema has title it is displayed in angle brackets.
  ```yaml
  properties:
    inHouseManufacturer:
      type: object
      title: InHouse Manufacturer
      properties:
        id:
          type: string
        name:
          type: string
  ```
   <img width="625" alt="image-2025-1-28_16-43-30" src="https://github.com/user-attachments/assets/916e96c4-4439-4880-98a8-326e3e06500f" />

- If the referenced schema does not have title, then referenced schema key is displayed in angle brackets.
  ```yaml
  properties:
    price:
      $ref: "#/components/schemas/Price"
  components:
    schemas:
      Price:
        type: number
  ```
  <img width="625" alt="image-2025-1-28_16-43-58" src="https://github.com/user-attachments/assets/9a7d6e44-5762-4029-932b-21004f9aecdf" />

- If a scalar property has defined format, it is displayed in angle brackets next to the type. In this case neither schema title nor schema key is displayed if property is reference to components.schemas
  ```yaml
  properties:
    price:
      $ref: "#/components/schemas/Price"
  components:
    schemas:
      Price:
        type: number
      format: float
  ```
  <img width="625" alt="image-2025-1-28_16-43-2" src="https://github.com/user-attachments/assets/dd5c327a-e8d9-46e2-b819-165e6a87e4aa" />  

  ===

  ```yaml
  properties:
    price:
      type: number
      format: float
  ```
  <img width="625" alt="image-2025-1-28_16-43-2" src="https://github.com/user-attachments/assets/d2f020b3-87c5-4a4a-bf76-f50ecf995d83" />

---

## object type

If property with object type has title, it will be displayed in angle brackets. If object property contains nested properties, a chevron icon appears before the property name to collapse or expand (collapsed by default) the section with child properties.

```yaml
properties:
  inHouseManufacturer:
    type: object
    title: InHouse Manufacturer
    properties:
      id:
        type: string
      name:
        type: string
```
<img width="625" alt="object1" src="https://github.com/user-attachments/assets/da663059-40eb-4e7f-a552-b407ee33dc26" />


If property is reference to components.schemas, it will be displayed in the same way as if it were inline. If the referenced schema has title it will be displayed in angle brackets.

```yaml
properties:
  referencedManufacturer:
    $ref: "#/components/schemas/Manufacturer"
components:
  schemas:
    Manufacturer:
      type: object
      title: Manufacturer22
      properties:
        name:
          type: string
        address:
          type: object
          title: Address33
          properties:
            street:
              type: string
```

<img width="625" alt="object2" src="https://github.com/user-attachments/assets/7d105487-e4fe-460b-8247-dbd684d27a55" />

However, If the referenced schema does not have title, then referenced schema key will be displayed in angle brackets.

```yaml
properties:
  referencedManufacturer:
    $ref: "#/components/schemas/Manufacturer"
components:
  schemas:
    Manufacturer:
      type: object
      properties:
        name:
          type: string
        address:
          type: object
          properties:
            street:
              type: string
```

<img width="625" alt="object3" src="https://github.com/user-attachments/assets/11c1e1b9-8ce5-43b6-8b2c-73b62f2df96c" />

---

## array

Property with array type has chevron before the property name to collapse or expand (collapsed by default) the section with array items (for information about items, see "items" section)

```yaml
properties:
  tags:
    type: array
    items:
      type: string
```

<img width="625" alt="array1" src="https://github.com/user-attachments/assets/69167ad4-ddd1-40ea-b9d7-e01460b45c3e" />

---

# scalar's specific attributes

## minimum/maximum and exclusiveMinimum/exclusiveMaximum

Minimum and maximum values are displayed as "Value range" under property name. Each value (minimum/maximum) and its corresponding condition represented in separate chips.

```yaml
properties:
  price:
    type: integer
    format: int32
    minimum: 1
    exclusiveMinimum: true
    maximum: 100
    exclusiveMaximum: true
```

<img width="625" alt="minmax" src="https://github.com/user-attachments/assets/050bdded-05ba-4007-8ef6-5ea967a42999" />

If exclusiveMinimum/exclusiveMaximum is true, appropriate chips with minimum/maximum values will show "<" or ">" signs.

If exclusiveMinimum/exclusiveMaximum is not specified in specification or specified with "false" value, appropriate chips with minimum/maximum values will show "<=" or ">=" signs.

```yaml
properties:
  price:
    type: integer
    format: int32
    minimum: 1
    exclusiveMinimum: true
    maximum: 100
    exclusiveMaximum: true
```

<img width="625" alt="exclusiveminmax" src="https://github.com/user-attachments/assets/5df0d78e-9b3c-43b3-97f9-fbb5a5c8ef65" />

---

## multipleOf

The multipleOf value is displayed as "Value multipleOf," with the specific value shown in a separate chip.

```yaml
properties:
  price:
    type: number
    multipleOf: 2
```

<img width="625" alt="multipleof" src="https://github.com/user-attachments/assets/cb4917fe-edcd-4a45-83f0-6982b905636b" />

---

## pattern

The pattern value is displayed as "Value pattern," with the regular expression shown in a separate chip.

```yaml
properties:
  text:
    type: number
    pattern: ^[A-Za-z0-9_]+$
```

<img width="625" alt="pattern" src="https://github.com/user-attachments/assets/b76719a7-5b40-44b3-944a-6cb97e4be330" />

---

## minLength/maxLength

The minLength and maxLength values are displayed next to the "Value Length" label, with each value is shown with its respective condition in separate chips.

```yaml
properties:
  text:
    type: string
    minLength: 5
    maxLength: 20
```

<img width="625" alt="minlength" src="https://github.com/user-attachments/assets/a3627df4-c819-4389-9c36-4b0eb30bd667" />

---

# nullable

By default, nullable is false and doc view does not display default value of this attribute even if it is explicitly specified.

if "nullable: true" is specified, then null value is displayed next to schema/property type.

```yaml
properties:
  money:
    type: object
    nullable: true
    properties:
      value:
        type: string
        description: A value of money in selected currency (unit).
        nullable: true
```

<img width="625" alt="nullable" src="https://github.com/user-attachments/assets/4a9d36b8-cc0d-4458-ac54-ce16041ffb92" />

If there is oneOf/anyOf combiner and one of the subschema is nullable, then only when selecting such subschema "or null will be displayed"

```yaml
properties:
  paymentMethod:
    oneOf:
      - $ref: "#/components/schemas/Card"
      - $ref: "#/components/schemas/PayPal"

components:
schemas:
  PayPal:
    type: object
    nullable: true
    properties:
      payAccount:
        type: string
  Card:
    type: object
    properties:
      cardNumber:
        type: string
```

<img width="625" alt="oneof1" src="https://github.com/user-attachments/assets/7ac9a009-42c8-4069-b728-b962b56952bf" />
<img width="625" alt="oneof2" src="https://github.com/user-attachments/assets/ac678f2e-5658-4bf8-8e76-c02c55899954" />


---

# description

Description of the property is displayed below the property name and type.

```yaml
properties:
  id:
    type: number
    format: float
    description: The unique identifier of the user.
```

<img width="625" alt="description" src="https://github.com/user-attachments/assets/d0ab7452-e8a5-4089-83bf-3e71c81a1023" />

---

# enums

List of enums values is displayed as "Allowed values". Each enum value is displayed in separate chip.

**Example 1:**

```yaml
properties:
  color:
    type: string
    enum:
      - black
      - white
      - red
```

<img width="625" alt="enum" src="https://github.com/user-attachments/assets/caffc186-5025-4070-801c-70e8074df581" />

---

# default

The default value is displayed with the label "Default" followed by the value in a chip format.

```yaml
properties:
  color:
    type: string
    enum:
      - black
      - white
      - red
```

<img width="625" alt="default" src="https://github.com/user-attachments/assets/19ebd8b1-6700-4db1-bb8f-b9a7502468c6" />

# example

The keyword Examples is displayed in new line, and its value is shown in separate chip next to it.

**Example 1:**

```yaml
properties:
  userId:
    type: string
    example: abc123
```

<img width="625" alt="example1" src="https://github.com/user-attachments/assets/ae82e49e-301e-4b4d-9c0c-74481d2f69e0" />

**Example 2:**

```yaml
properties:
  tags:
    type: array
    items:
      type: string
      example: ["tag1", "tag2", "tag3"]
```

<img width="625" alt="example2" src="https://github.com/user-attachments/assets/c2450e3b-5fdb-4bcb-a38d-0f4bd30c3842" />

---

# required

The required properties are marked with an asterisk (\*) next to the property name.

```yaml
properties:
  user:
    type: object
    properties:
      id:
        type: integer
      name:
        type: string
    required:
      - id
```

<img width="625" alt="required" src="https://github.com/user-attachments/assets/8935b661-b336-4a9e-b5d7-4d078db6cb8e" />

---

# deprecated

When property is marked as deprecated, it is indicated with an orange "deprecated" badge next to property type

**Example 1:**

```yaml
properties:
  user:
    type: object
    properties:
      id:
        type: integer
      oldName:
        type: string
        deprecated: true
      name:
        type: string
    required:
      - id
```

<img width="625" alt="deprecated1" src="https://github.com/user-attachments/assets/0fe48ae1-247f-454c-b52c-0a2645faa9d2" />

**Example 2:**

```yaml
properties:
  tags:
    type: array
    deprecated: true
    items:
      type: string
```

<img width="625" alt="deprecated2" src="https://github.com/user-attachments/assets/1105d0c9-0a0e-438f-9839-5fa429477173" />

---

# circular references

The circular references is rendered by recursively displaying the same object structure within itself. In the UI, this results in the object being nested within itself repeatedly; each level of the object is expanded to show the same properties. Property with circular reference has special icon next to it.

```yaml
schema:
  $ref: "#/components/schemas/Category"

components:
  schemas:
    Category:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier for the category
        name:
          type: string
        subcategory:
          $ref: "#/components/schemas/Category"
          description: Subcategory under this category
```

<img width="625" alt="circularref1" src="https://github.com/user-attachments/assets/9911d57b-dee3-4e71-b56f-7eca0a5f0d2a" />
<img width="625" alt="circularref2" src="https://github.com/user-attachments/assets/102f0037-cecb-4063-84f9-136e315caf6d" />


---

# readOnly/writeOnly

Default value of readOnly/writeOnly is "false" and doc view does not display default value of this attribute even if it is explicitly specified for the schema/property.

- when readOnly is "true", it is displayed as "read-only" blue badge next to the property type, indicating that this field is only available in responses and should not be sent in requests.
- when writeOnly is "true", it is displayed as "write-only" blue badge next to the property type, indicating that this field is only available in requests and will not be returned in responses.

```yaml
type: object
properties:
  id:
    type: integer
    readOnly: true
  password:
    type: string
    writeOnly: true
  name:
    type: string
```

---

# descriminator

APIHUB does not support descriminator.

---

# array's specific attributes

---

## items

Array items info is displayed as separate chip with "item" text to denote the element type within the array. Type of the array items is displayed next to the item chip. All other information about items is displayed in the same way as general properties. If items of array is array or object, then chevron will be displayed before the item chip.

**Example 1:**

```yaml
properties:
  tags:
    type: array
    items:
      type: string
```

<img width="625" alt="arrayattr1" src="https://github.com/user-attachments/assets/f866c39a-a44c-442c-956b-7002de965eac" />

**Example 2:**

```yaml
properties:
  pets:
    type: array
    items:
      $ref: "#/components/schemas/Pet"

components:
  schemas:
    Pet:
      name:
        type: string
      color:
        type: string
```

<img width="625" alt="arrayattr2" src="https://github.com/user-attachments/assets/a87c17b4-13a7-4a4e-9464-cac8c92da70e" />

===

---

## minItems/maxItems

The minItems/maxItems values are displayed together as "Items count" with values in separate chips.

```yaml
properties:
  tags:
    type: array
    items:
      type: string
    minItems: 2
    maxItems: 5
```

<img width="625" alt="minitems" src="https://github.com/user-attachments/assets/9cbaca1c-4bb3-4e40-83bb-0803d39131d8" />

---

## uniqueItems

Default value of "uniqueItems" is false and doc view does not display default value of this attribute even if it is explicitly specified for the schema/property.

"uniqueItems: true" for array property is displayed as "Unique items" with "true" value in a chip.

```yaml
properties:
  tags:
    type: array
    items:
      type: string
    uniqueItems: true
```

<img width="625" alt="uniqueitems" src="https://github.com/user-attachments/assets/8c7b92e7-5bed-4646-9f0c-557b4594cb4a" />

---

# objects specific attributes

## allOf

The UI combines schemas with allOf by displaying all the attributes and/or properties from the subschemas together.

```yaml
properties:
  error:
    allOf:
    - type: object
      description: Basic error model
      required:
      - message
      - code
      properties:
        message:
          type: string
        code:
          type: integer
          minimum: 100
          maximum: 600
    - type: object
      required:
      - rootCause
      properties:
        rootCause:
          type: string
```
<img width="625" alt="objectallof1" src="https://github.com/user-attachments/assets/c927746a-defc-4a37-ba05-b445f63d7f42" />

If subschemas contain the same attributes with different values, the resulting (combined) schema will contain the attribute with the value of the schema specified last. In the example below 1st subschema has description with value "descr1" and 2nd subschema - with value "descr2", so the result schema will contain description with value "descr2".

```yaml
properties:
  error:
    allOf:
    - type: object
      description: descr1
      required:
      - message
      - code
      properties:
        message:
          type: string
        code:
          type: integer
          minimum: 100
          maximum: 600
    - type: object
      description: descr2
      required:
      - rootCause
      properties:
        rootCause:
          type: string
```
<img width="625" alt="objectallof2" src="https://github.com/user-attachments/assets/d6bd65d2-c7a6-4fc5-8c53-e69948a46739" />

---

## anyOf, oneOf

- anyOf
  - The anyOf is rendered as multiple schemas, where the UI indicates that one or more of these must apply. In the UI, this is shown under the variant section, with multiple potential objects displayed under "anyOf".
- oneOf
  - The oneOf is rendered similarly to anyOf, but with an indication that exactly one of the options must apply. In the UI, this is labeled as "oneOf" under the variant section, with the possible exclusive attributes shown.

```yaml
type: object
description: An item variant using allOf, anyOf, oneOf, and not
allOf: # AllOf: Combines multiple schemas that must all apply
  - type: object
    properties:
      type:
        type: string
        enum: [simple, complex]
        description: Type of variant
anyOf: # AnyOf: One of the following schemas must apply
  - type: object
    properties:
      simpleAttribute:
        type: string
        description: A simple attribute
  - type: object
    properties:
      complexAttribute:
        type: object
        properties:
          detail:
            type: string
            description: A detailed description
oneOf: # OneOf: Exactly one of the following schemas must apply
  - type: object
    properties:
      exclusiveAttribute:
        type: string
        description: Exclusive attribute
```

---

## not

APIHUB does not support "not" keyword.

---

## minProperties/maxProperties

minProperties/maxProperties are displayed as "Properties count". Value of minProperties and maxProperties are displayed in separate chips.

```yaml
properties:
  entities:
    type: object
    properties:
      id:
        type: integer
      name:
        type: string
      description:
        type: string
    minProperties: 2
    maxProperties: 5
```

<img width="625" alt="minproperties" src="https://github.com/user-attachments/assets/562b20cf-6778-4887-87f8-f4879a2bb4f3" />

---

## additionalProperties

Default value of "additionalProperties" is true and doc view does not display default value of this attribute even if it is explicitly specified for the schema/property.

The following records are equivalent and all of them mean that additionalProperties = true (which is default value, i.e. no information about additionalProperties is displayed in all of the options below)

**Example 1:**

```yaml
properties:
  prop1: # option 1
    type: object
  prop2: # option 2
    type: object
    additionalProperties: true
  prop3: # option 3
    type: object
    additionalProperties: {}
```
<img width="625" alt="additionalproperties1" src="https://github.com/user-attachments/assets/d3d5c747-c507-4e1d-8a44-d63b12e6cc97" />

If additionalProperty is false, then "no additional properties" badge will be displayed after all properties of current object.

**Example 2:**

```yaml
properties:
  customerAccount:
    type: object
    additionalProperties: false
```

<img width="625" alt="additionalproperties2" src="https://github.com/user-attachments/assets/932b9790-9911-4f9f-ab08-5e7631459ad3" />

If additionalProperty is non-boolean schema, then it will be displayed as all other schemas with addition badge "additionalProperty" in the beginning.

**Example 3:**

```yaml
properties:
  customerAccount:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
    additionalProperties:
      type: string
```

<img width="625" alt="additionalproperties3" src="https://github.com/user-attachments/assets/67ba0307-006d-48b6-8a37-3c4ae2e703e0" />

**Example 4:**

```yaml
properties:
  customerAccount:
  type: object
  properties:
    id:
      type: string
   name:
      type: string
  additionalProperties:
    type: object
    title: legalAddress
    properties:
      address:
        type: string
```

<img width="625" alt="additionalproperties4" src="https://github.com/user-attachments/assets/bc7b8184-5433-4cbb-bd20-3dbb30de1711" />
