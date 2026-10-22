# Integration Design Specification (IDS)

**Document ID:** <generate_document_id>  
**Version:** <current_version>  
**Document Date:** <current_date>  
**System ID:** <system_id>  
**Owner:** —  
**Approval Status:** —  
**Jira Link:** —

---

## Document Metadata

| Field | Value |
|-------|-------|
| Integration ID | <generate_document_id> |
| System | <3rdPartySystemName> |
| Domain | — |
| Functional Capabilities | — |
| Design Items | — |
| Comments | — |

---

## Version History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| <current_version> | <current_date> | <user_name> | <comment> |

---

## Document References

| # | Name | Description |
|---|------|-------------|
| 1 | <IA_id> | Reference to <3rdPartySystemName> IA |

---

## Glossary of Terms

| Acronym | Interpretation |
|---------|----------------|
| QS | Qubership |
| QIP | Qubership Integration Platform |
| API | Application Programming Interface |
| CIM | Customer Information System |
| SOAP | Simple Object Access Protocol |
| HTTP | Hypertext Transfer Protocol |
| <3rdPartySystemAbbreviation> | <3rdPartySystemName> |

---

## Introduction

### Document Purpose

This document is intended to define and describe integrations and interfaces design as supported by Netcracker in order to communicate with <3rdPartySystemName> in scope of the <project_name> project.

### Document Objectives

The objectives of the document to provide a high level understanding of:

- Integration process describing interaction between Netcracker functional modules and Integration layer.
- Process of calling third-party APIs and methods.
- Data mapping between functional model and integration methods/APIs.
- Integration interface configuration.
- Response handling rules.
- Error handling process.

### Intended Audience

This document is intended for nominated business, third-party vendors and IT representatives to verify alignment of the proposed solution with the requirements of Trappist program as well as for further use by system developers and by test teams.

### Assumptions

| # | Description | Status |
|---|-------------|--------|
| 1 | As part of this solution, QS will use either <3rdPartySystemName> ID or CPR no. as an identifier to read the customer consent from <3rdPartySystemName> if present. | Proposed |

### Out of Scope

| # | Description |
|---|-------------|
| 1 | Interface contract and integration scenarios between Netcracker and <project_name>. Same as described in IA, refer at [1]. |
| 2 | Physical structure and payload of the messages between the Netcracker and <project_name>. Same as described in IA, refer at [1]. |
| 3 | Error codes and scenarios. Same is described in IA, refer at [1]. |

---

## Technical Design

This design document describes the interface for the integration scenarios between Netcracker and <3rdPartySystemName> system.

### Authentication & Authorization

<authentification>

### Integration Scenarios

Integration Scenarios will be same as defined in IA: <3rdPartySystemName> Scenarios

---

## Integration Process

### Integration flow for QIP Chain - <Process Name>

<description_of_the_process>

Process flow is demonstrated in the form of interaction diagram as follows:
- *<place_for_mermaid>*

#### Process Steps

| Process Step | Description |
|--------------|-------------|
| 1 | <step_name and description> |

---

## Data Mapping

### Operation: <Operation Name>

This covers the mapping of <System Name> interface attributes with upstream or internal system.

**Path:** `<method> <path>`

This covers the mapping of Operation Name interface exposed by <System Name> for <description_of_operation>

#### Request Mapping

| Request Parameter | Description | Type | Mandatory | Provided By |
|-------------------|-------------|------|-----------|-------------|
| <field> | <field_description> | <field_type> | <field_mandatoriness> | TBD |

<request_sample>

#### Response Mapping

**Success Response**

| Name | Description | Length | Type | Occurrence | Mandatory | Transformation Logic |
|------|-------------|--------|------|------------|-----------|----------------------|
| <field> | <field_description> | <field_length> | <field_type> | <field_occurencee> | <field_mandatoriness> | TBD |

<success_response_sample>

**Error Response**

| Response Parameter | Description | Type | Mandatory | Provided By |
|--------------------|-------------|------|-----------|-------------|
| errorCode | The attribute contains fault code coming from <3rdPartySystemName> | String | M | QIP |
| errorMessage | The attribute contains internal error message. | String | M | QIP |

<error_response_sample>

---

## Error Handling

Error handling will be done in two ways by Integration Adapter. Based on the error type, retry the failed request (based on predefined config) or direct forwarding of error to the caller module which will in turn manage or resolve the error.

### Error Codes - <3rdPartySystemName> (<Operation Name>)

| Operation | Error from <3rdPartySystemName> | Error Description | Error Type | Occurred When | Technical Resolution | Ownership | Frequency | Notes |
|-----------|----------------------|-------------------|------------|---------------|------------------------|-----------|-----------|-------|


---

## Logging

This section describes the logging considerations to be taken care for various outbound and internal APIs.

**Objective:** Request/response body having PII data should not be logged in full

| Attribute Name | API name | Masked | Example |
|----------------|----------|--------|---------|
| <pii_field> | <Operation Name> | Y (<Show only last 2 digits and mask the remaining by using x>) | — |

---

## Integration Configuration

Following parameters will be part of <3rdPartySystemName> Integration configuration:

| Sl.Num. | Parameter Name | Default Value | Notes |
|---------|----------------|---------------|-------|
| 1 | URL | Example: `https://server:port/` | — |
| 2 | Number of Retries | 3 | In case of connection error/timeout |
| 3 | Delay between retries (in sec) | 10 secs | Delay between each command retry |

---

## Appendix

| # | Description | Status |
|---|-------------|--------|
| — | — | — |

---

## Questions

Following are the open questions applicable for this design:

| # | Description | Author | Date | Owner | Jira Ticket | Status |
|---|-------------|--------|------|-------|-------------|--------|
| <question_id> | <description> | <author> | <date> | <owner> | <jira_ticket> | <status> |
