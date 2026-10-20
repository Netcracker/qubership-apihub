**Design Item ID**: DI-Portal-PKGVER-022  
**Design Item Name**: OpenAPI Document Overview  
**Related Design Items**:
  - [List of Documents](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90016-List-of-Documents)

**Related API**: 
  - Get document details (GET /api/v3/packages/{packageId}/versions/{version}/documents/{slug})

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description
The functionality allows the user to see an overview information of OpenAPI specification.

# Start Point
1. User navigates to APIHUB Portal → workspace → group → package version -> documents tab.

# Execution
1. User selects OpenAPI document.
2. The system shows the following information:
   - title from info.title field of specification
   - version from info.version field of specification
   - document labels
   - contact information from info.contact object of specification
   - license information from info.license object of specification
   - term of service information from info.termsOfService field of specification
   - info about external documentation from externalDocs object of specification
   - description (rendered markdown) from info.description field of specification
   - ===
   - API to show document overview:
     - GET /api/v3/packages/{packageId}/versions/{version}/documents/{slug}

**Contact object**
  1. if all 3 fields 'name', 'url' and 'email' are specified, then display: 
    - \<name field value>: \<url field value> | Email: \<email field value>  
      ![1](https://github.com/user-attachments/assets/ac584015-9242-463c-a8b8-c322a6c082c6)
  2. if only 'name' field is specified, then display nothing.
  3. if only 'url' field is specified, then display:
    - URL: \<url field value>   
      ![2](https://github.com/user-attachments/assets/de50103e-4c57-4cb2-9cfc-0fbd47f9775a)
  4. if only 'email' field is specified, then display:
    - Email: \<email field value>   
      ![3](https://github.com/user-attachments/assets/535b5bf4-8cf4-46c9-99f6-ceee38fb89a1)

  5. if 'name' and 'url' fields are specified, then display:
    - <name field value>: \<url field value>  
      ![4](https://github.com/user-attachments/assets/d8a1123b-682d-4be7-9073-5f4015cb2e3e)

  6. if 'name' and 'email' fields are specified, then display:
    - \<name field value>: \<email field value>  
      ![5](https://github.com/user-attachments/assets/637c49c0-dccb-4bed-b112-95e1887e8fdb)

  7. if 'url' and 'email' fields are specified, then display:
    - URL: \<url field value> | \<Email>: \<email field value>  
      ![6](https://github.com/user-attachments/assets/e51486e9-6e97-44be-ac91-440290577ff1)

**License object**
1. if 'name' and 'url' fields are specified, then display
   - License: \<name field value> with link to url field value  
     ![l1](https://github.com/user-attachments/assets/c3438cf6-941f-41d7-a25a-40e45d491c05)
2. if only 'name' field is specified then display: 
   - License: \<name field value>  
     ![l2](https://github.com/user-attachments/assets/235968f8-95f4-44f0-9dea-7b28eb67ad23)
3. if only 'url' field is specified - incorrect case, since name is required field in openapi. Ignore license object in this case.

**termsOfService field**
1. if termsOfService field is specified, then display:
   - Term of service (with link to termsOfService field value)  
     ![t1](https://github.com/user-attachments/assets/7d917157-b93f-483d-a148-0c3aaf2d36fe)

**externalDocs**
1. if 'name' and 'url' fields are specified, then display:
   - \<name field value> (with link to url field value)  
     ![e1](https://github.com/user-attachments/assets/2c6aaf83-75c8-4f04-934b-e13816f3a45e)
2. if only 'url' field is specified, then display: 
   - \<url field value> (with link to url field value)
     ![e2](https://github.com/user-attachments/assets/efe069eb-a2dd-41a7-a2f8-5dd5fcdde19f)
3. if only 'name' field is specified - incorrect case, since url is required field in openapi. Ignore externalDocs object in this case.

# Security
OpenAPI document overview is available for all users, which have "read" permission for the appropriate package.

# Screen View
![overview](https://github.com/user-attachments/assets/2fa6186d-6555-40f6-8cf3-0ba2a7d3c4f9)