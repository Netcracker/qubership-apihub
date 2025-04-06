# APIHUB Development Process in GitHub

This document outlines the development process for the **APIHUB** product in GitHub, covering:
1. **Work items (issues)** and their lifecycle
2. **Iterative development process**
3. **Release process**

---

## Table of Contents
- [Generic Notes](#generic-notes)
  - [Project Roles](#project-roles)
  - [Branching Model](#branching-model)
- [Work Items (Tickets/Issues)](#work-items--aka-tickets--aka-issues-)
  - [Work Item Types](#work-items-types)
    - [Epic](#epic)
    - [User Story](#user-story)
    - [Bug](#bug)
    - [Task](#task)
    - [Design/Documentation Task](#design-task--documentation-task)
  - [Work Item Workflow](#work-items-workflow)
    - [User Story Workflow](#user-story-workflow)
    - [Bug Workflow](#bug-workflow)
    - [PR Review Process and Rules](#pr-review-process-and-rules)
    - [Special Cases](#special-cases)
      - [Fast Track](#fast-track)
      - [Delivery to QA from develop/feature Branch](#delivery-to-qa-from-developfeature-branch)
      - [Release Delay Due to Critical+ Issues](#release-delay-because-of-critical--issues)
      - [My PR Breaks AT](#my-pr-brokes-at)
      - [Pull Request Without an Issue](#pull-request-without-issue)
- [Development Process](#development-process)
  - [Quarter Release](#quarter-release)
  - [Sprint](#sprint)
  - [Release](#release)

---

## Generic Notes

The APIHUB application's source code is distributed across **20+ repositories**:
[View the full list](https://github.com/Netcracker?q=topic%3Aapihub&type=all&language=&sort=).

Each repository represents either:
- A standalone sub-component (microservice, library)
- A utility (autotests, workflow scripts, etc.)

The **umbrella repository** is:
[https://github.com/Netcracker/qubership-apihub](https://github.com/Netcracker/qubership-apihub).

This repository serves as the **entry point** for all GitHub issues and contains:
- Application-level deployment descriptors
- Application-level documentation

**Development tracking** is managed via the **GitHub Project**:
[qubership-apihub](https://github.com/orgs/Netcracker/projects/9/views/2).

### Project Roles
- **Product Owner (PO)**
- **Technical Manager (TM)**
- **Dev Lead**
- **Developer**
- **QA**
- **TA (Test Automation)**

### Branching Model
We follow the **Gitflow** approach.
- Reference: [A Successful Git Branching Model](https://nvie.com/posts/a-successful-git-branching-model/).
- **Note**: The FE team adheres strictly to Gitflow, while the BE team uses a simplified version without a `release` branch.

---

## Work Items (Tickets/Issues)

### Work Item Types
All work items are GitHub issues, categorized by `type` and `labels`.
- **Creation**: Must be created in the umbrella repository (may be transferred later).
- **Tracking**: Must be added to the `qubership-apihub` project.

#### Epic
- **Purpose**: High-level umbrella item for end-to-end functionality (planning horizon: **Quarter Release**).
- **Definition of Done (DoD)**: Completion of all child User Stories.
- **Review**: TM reviews status monthly.

**Mandatory Fields**:
| Field          | Value                                  |
|----------------|----------------------------------------|
| Assignees      | `alagishev`                            |
| Labels         | `Epic`                                 |
| Type           | `Feature`                              |
| Projects       | `qubership-apihub`                     |
| Priority       | Select from options                    |
| Status         | Empty                                  |
| Sprint         | Empty                                  |
| Milestone      | Corresponding Quarter Release          |
| Description    | Detailed description (include context) |

**Examples**:
- [Epic #3](https://github.com/Netcracker/qubership-apihub/issues/3)
- [Epic #116](https://github.com/Netcracker/qubership-apihub/issues/116)

#### User Story
- **Purpose**: Deliverable end-to-end functionality (assigned to a developer, demoed upon completion).
- **DoD**: Implemented, tested, merged to `develop`, QA-validated, and included in a release.

**Mandatory Fields**:
| Field          | Value                                  |
|----------------|----------------------------------------|
| Labels         | `User Story`                           |
| Type           | `Feature`                              |
| Projects       | `qubership-apihub`                     |
| Team           | `BE` or `FE`                           |
| Relationships  | Linked Epic                            |

**Example**: [User Story #7](https://github.com/Netcracker/qubership-apihub/issues/7).

#### Bug
- **Purpose**: Defect requiring resolution (typically reported by QA).
- **DoD**: Fixed, tested, merged to `develop`, and included in a release.

**Mandatory Fields**:
| Field          | Value                                  |
|----------------|----------------------------------------|
| Type           | `Bug`                                  |
| Projects       | `qubership-apihub`                     |
| Team           | `BE` or `FE`                           |

**Example**: [Bug #30](https://github.com/Netcracker/qubership-apihub-backend/issues/30).

#### Task
- **Purpose**: Technical/one-off activities (not features or bugs).
- **DoD**: Completion verified by Dev Lead/TM.

**Mandatory Fields**:
| Field          | Value                                  |
|----------------|----------------------------------------|
| Type           | `Task`                                 |
| Projects       | `qubership-apihub`                     |
| Team           | `BE` or `FE`                           |

**Example**: [Task #33](https://github.com/Netcracker/qubership-apihub/issues/33).

#### Design/Documentation Task
- **Rules**: Same as User Story (must belong to an Epic).
- **Difference**:
  - **Labels**: `Design`/`Documentation`
  - **Type**: `Feature` or `Task`

**Example**: [Design Task #28](https://github.com/Netcracker/qubership-apihub/issues/28).

---

### Work Item Workflow

#### User Story Workflow
1. **Creation**: Issue created (Status = `Empty` → appears in leftmost column for Leads' review).
2. **Review**: Dev Lead sets Status = `Backlog`/`Ready for Dev`, assigns Sprint, and may transfer to a sub-component repo.
3. **Assignment**: Dev Lead assigns to a Developer.
4. **Development**: Developer sets Status = `In Progress`.
5. **PR Submission**:
   - PR must:
     - Link to the issue in the **Development** field.
     - Have reviewers (team members) and be assigned to the Dev Lead.
     - Pass CI checks (failed ATs require resolution; see [Special Cases](#my-pr-brokes-at)).
   - Set Status = `In Review`.
6. **PR Approval**: Dev Lead merges to `develop` and sets Status = `In Test` (adds QA as assignee).
7. **QA Validation**:
   - If **all bugs ≤ Major**: QA sets Status = `Done`.
   - If **Critical+ bugs**: Status = `In BugFix` → notify Dev Lead → retest after fixes.

#### Bug Workflow
- Follows User Story steps 1-6.
- **QA Action**:
  - If fixed: Status = `Done`.
  - If rejected: Status = `In Progress` → notify Developer.

---

### Special Cases

#### Fast Track
- **Label**: `fast track` (e.g., critical production issues, customer escalations).
- **Process**: Highest priority; include in the nearest release.

#### Delivery to QA from `develop`/`feature` Branch
- **Standard**: QA tests from `develop`.
- **Exception**: Complex/risky features may use `feature` branches (case-by-case decision).

#### Release Delay Due to Critical+ Issues
- If Critical+ issues remain at Sprint end, release may be delayed 1-3 days.

#### My PR Breaks AT
- **Options**:
  1. Fix AT yourself (preferred).
  2. Request AT engineers to adapt tests (merge adaptation branch with your PR).

#### Pull Request Without an Issue
- **Requirement**: Add to the project (for tracking).

---

## Development Process
APIHUB follows **Scrum** with three key phases:

1. **Quarter Release** (3 months):
   - PO defines Epic scope → TM/Dev Leads decompose into User Stories.
2. **Sprint** (2 weeks):
   - TM pre-creates Sprints in the project.
   - **Responsibilities**:
     - TM/Dev Leads: Define scope before Sprint start.
     - TM: Keep board updated; move incomplete issues to the next Sprint.
3. **Release**:
   - Created post-Sprint (includes artifacts, descriptors, documentation, release notes).
   - **TM Responsibilities**: Quality assurance and release creation.

**Release Example**: [v1.1.1](https://github.com/Netcracker/qubership-apihub/releases/tag/1.1.1).