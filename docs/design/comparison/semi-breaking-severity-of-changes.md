**Design Item ID**: DI-Portal-COMP-001      
**Design Item Name**: Semi-breaking severity of changes    
**Related Design Items**:   

- API Kind
- DI-Portal-COMP-002: Severity of Changes

**Related API**: -   
**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

A semi-breaking change is one of the severity of changes (see other severities in DI-Portal-COMP-002: Severity of Changes). A semi-breaking change is a change that breaks backward compatibility, but the change was made according to certain rules, which avoids breaking changes when comparing package versions.

There are the following rules:

1. change in no-BWC operation:

- If operation has no-BWC kind and operation has change that breaks backward compatibility comparing with previous version, then this change shall be classified as semi-breaking.
  - In case of changing operation, current (right) operation must have no-BWC kind. If previous (left) operation has no-BWC kind, but the right one has BWC kind, then change that breaks backward compatibility shall be classified as breaking.
  - If operation was deleted, then previous (left) operation must have no-BWC kind (since current (right) operation no longer exists, so it cannot have no-BWC kind).

2. implementation of deprecation policy:
   - if entity was deprecated in at least two previous consecutive release versions and then it was deleted and if this deletion breaks backward compatibility, then this change will be classified semi-breaking. This is general rule, but scope of entities that can be deprecated depends in API type. Also, additional conditions can be applied to specific API type or specific entity. See sections below for the list of entities that can be deprecated and additional rules for them.

# OpenAPI 3.0

According to OpenAPI 3.0 only the entities listed below can be deprecated. Deprecation of any other entities will not be treated as implementation of deprecated policy, so calculation of semi-breaking severity will not be applicable to such entity.

- operation

```yaml
/pet/findByTags:
  get:
    deprecated: true
```

- parameter object

```yaml
/pet/findByTags:
  get:
    parameters:
      - name: token
        in: header
        description: token to be passed as a header
        required: true
        deprecated: true
        schema:
          type: integer
```

- header object (as special case of parameters object)

```yaml
/user/login:
  get:
    responses:
      "200":
        description: successful operation
        headers:
          X-Rate-Limit:
            required: true
            deprecated: true
            allowEmptyValue: true
            description: calls per hour allowed by the user
            schema:
              type: integer
```

- schema ( + property)

```yaml
# example 1:
/pet:
  put:
    requestBody:
      content:
        application/json:
          schema:
            deprecated: true
            type: object
            properties:
              id:
                type: integer
              name:
                type: string
     responses:
      '200':
        description: successful operation

# example 2:
/pet:
  put:
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required:
              - id
            properties:
              id:
                type: integer
                deprecated: true
              name:
                type: string
     responses:
      '200':
        description: successful operation
```

> ⚠ Deletion of required status of the property shall be classified as semi-breaking change if all of the following conditions are met:
>
> - If required status of the property was deleted simultaneously (in the same version revision) with the property itself
> - deletion of the required status breaks backward compatibility
> - the property is deleted according to deprecation policy (i.e. property deletion classified as semi-breaking change)
>   Note: this addition requirement is needed since deletion of required property generates two separate changes: deletion of property itself and removing the appropriate value from "required" array of parent object.

# GraphQL

Calculation of semi-breaking changes is not supported for GraphQL operations at all. It means number of semi-breaking changes in GraphQL operations is always zero.
