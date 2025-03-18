This article describes a process of dealing with work items (Epics, User Stories, Bugs, Tasks) in the APIHUB GitHub project.

The goal is to provide rules for issues (tickets) creation and moving them through a workflow.

# Generic notes

All issues must be created in a generic repository: [https://github.com/Netcracker/qubership-apihub](https://github.com/Netcracker/qubership-apihub)

Project board: [https://github.com/orgs/Netcracker/projects/9/views/2?sliceBy%5Bvalue%5D=Iteration+25.1-5](https://github.com/orgs/Netcracker/projects/9/views/2?sliceBy%5Bvalue%5D=Iteration+25.1-5)

The project has a pre-created list of Iterations. Iteration is a Sprint with start date and end date.

# Epic

Epic is a huge umbrella work item describing some e2e functionality area.

Epic has child work items - User Stories

Epic planning horizon is a Release. Release - 3 months long development period

Epic definition of done: completion of all child User Stories

Epics statuses reviewed by TM on regular basis (once per month)

**Mandatory fields:**

- **Assignees: alagishev**
- **Labels: Epic**
- **Type: Feature**
- **Projects: qubership-apihub**
  - **Priority: choose your option**
  - **Status: empty**
  - **Iteration: empty**
- **Milestone: choose corresponding Release**
- **Description: provide as much detailed description as you can**

Example: [https://github.com/Netcracker/qubership-apihub/issues/3](https://github.com/Netcracker/qubership-apihub/issues/3)

# User Story

User Story is an e2e functionality which can be delivered and tested

User Story is assigned to concrete developer and shown on team demo after completion

User Story definition of done: implemented, dev tested, demonstrated, merged to develop, QA tested, all bugs fixed, included in Release

**Mandatory fields:**

- **Assignees: empty**
- **Labels: User Story**
- **Type: Feature**
- **Projects: qubership-apihub**
  - **Priority: Choose your option**
  - **Status: empty**
  - **Iteration: empty** (exception: Lead can create User Story directly to current Iteration)
  - **Team: choose BE or FE**
- **Relationships: choose corresponding Epic issue.**

Example: [https://github.com/Netcracker/qubership-apihub/issues/7](https://github.com/Netcracker/qubership-apihub/issues/7)

# Bug

Bug is a defect in our product which needs to be fixed

Bug can be reported by anyone but typically reported by QA team

Bug definition of done: fixed, dev tested, merged to develop, QA tested, included in Release

**Mandatory fields:**

- **Assignees: empty**
- **Labels: empty**
- **Type: Bug**
- **Projects: qubership-apihub**
  - **Priority: Choose your option**
  - **Status: empty**
  - **Iteration: empty** (exception: Lead can create Bug directly to current Iteration; QA can create Bug directly to current Iteration if the Bug found during testing of a feature from current Iteration)
  - **Team: choose BE or FE**

Example: [https://github.com/Netcracker/qubership-apihub-backend/issues/30](https://github.com/Netcracker/qubership-apihub-backend/issues/30)

# Task

Task is a some job which is not a new feature and not a bug. Technical tasks, one-time activities, configuration, etc

Task definition of done: the task completion

**Mandatory fields:**

- **Assignees: empty/concrete person**
- **Labels: choose your option**
- **Type: Task**
- **Projects: qubership-apihub**
  - **Priority: Choose your option**
  - **Status: empty**
  - **Iteration: empty** (exception: Lead can create Task directly to current Iteration; Developer can create Task for himself directly to current Iteration)
  - **Team: choose BE or FE**

Example: [https://github.com/Netcracker/qubership-apihub/issues/33](https://github.com/Netcracker/qubership-apihub/issues/33)

# Design task

Used for tracking design changes (example: API specification changing), the rules is the same as for User Story (so, must be under Epic).

The difference is:

- **Labels: Design**
- **Type: feature**

Example: [https://github.com/Netcracker/qubership-apihub/issues/28](https://github.com/Netcracker/qubership-apihub/issues/28)

# Issues workflow

1. Issue created
   1. It has empty status, so on the project board it placed it the very left column - it makes it subject for review by Leads on regular Leads sync-up
2. The issue is reviewed by **Lead**, the Lead **set Status=**Backlog/Ready for Dev, **set Iteration**. Also the issue is Transferred to concrete GitHub repository
   1. Issues without Iteration but with not empty status - are in a backlog
3. When time is come, **Lead assign** the issue **to developer**
4. **Developer** start working on the story and **set Status=In Progress**
5. When **Developer** finish implementation and dev testing - he **creates Pull Request** (PR) to develop and **set Status=**In Review
   1. *PR must have a link to the issue in Development field*
   2. *PR must have empty Projects field*
      1. Exception: PRs for small things, tech stuff, typos, etc - can be created without Issue link. Such PRs must be added to qubership-apihub Project and added to current Iteration
   3. PR must have reviewers (team members)
   4. PR must be assigned to Lead
6. Lead reviews PR. When review is done and all comments addressed - PR is accepted. **Lead** updates corresponding Issue and **set Status=**In Test and **ping QA Lead**
   1. PR review process and rules: TBD
7. **QA Lead** validating the issue and after testing **set Status=**Done
   1. If bugfix is not accepted - **set Status=**Empty and **ping Lead**
   2. If bugs found during User Story testing - keep Status=In Test, create new issues, set current User Story issue as a parent for them

# Iteration lifecycle & releases

- Iteration scope (included issues) need to be defined and agreed before iteration start
- If Iteration is over but there are still not completed issues in it - they are manually moved to the next iteration/no iteration by TM
- Release is created right after Iteration completion
- Fast track/blocker issues
  - New short Iteration created in between regular Iterations to track content of fast track issues
