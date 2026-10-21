# APIHUB development process

How the team plans, tracks, and delivers work on **APIHUB** in GitHub: roles, work items and their lifecycle, sprints,
and quarters. For branches, commits, and pull request mechanics, see
[the contributor workflow](../development/workflow.md). For the release itself, see
[the release process](../development/release-process.md).

## Generic notes

All source code, deployment descriptors, and documentation live in one repository,
[`Netcracker/qubership-apihub`](https://github.com/Netcracker/qubership-apihub). It is also the single place for
GitHub issues.

Development tracking is managed in the GitHub Project
[qubership-apihub](https://github.com/orgs/Netcracker/projects/9/views/2) (Project 9).

### Project roles

- Product owner (PO)
- Technical manager (TM)
- Dev Lead
- Developer
- QA
- TA: test automation

### Branching model

The team follows the **Gitflow** approach. Reference:
[A Successful Git Branching Model](https://nvie.com/posts/a-successful-git-branching-model/).

In short:

- `develop` is the top-forward integration branch and the default branch.
- `bugfix/X` and `feature/X` branch from `develop` and merge back after dev testing and review in the branch.
- `develop` must be stable eventually. Stable means all end-to-end tests are green.
- At the end of a sprint, `develop` is stable and the `release` branch is created from it.
- Artifacts built from the `release` branch are release candidates (Docker tag `next`). They can be provided to any
  customer who is ready to onboard release candidates.
- If acceptance finds critical issues, the fix goes into the `release` branch.
- After acceptance, `release` is merged into `develop` and `main`.
- A new tag is set on `main`. The build from this tag is the release.

## Work items

A work item is a GitHub issue, categorized by `type` and `labels`. There are four kinds:

1. Epic
2. User Story
3. Bug
4. Task

- **Creation**: create the issue in `Netcracker/qubership-apihub`.
- **Tracking**: add the issue to the `qubership-apihub` project.

### Work item types

#### Epic

An Epic is a large umbrella work item that describes an end-to-end functionality area. It has child work items, the
User Stories. The planning horizon of an Epic is a Quarter Release, a development period of three months.

Definition of done: all child User Stories are complete. The Technical Manager reviews Epic statuses regularly, once
per month.

Mandatory fields:

- Assignees: `alagishev`
- Labels: `Epic`
- Type: Feature
- Projects: `qubership-apihub`
  - Priority: choose an option
  - Status: empty
  - Sprint: empty
- Milestone: the corresponding Quarter Release
- Description: as detailed as you can make it

Examples: [Epic #3](https://github.com/Netcracker/qubership-apihub/issues/3),
[Epic #116](https://github.com/Netcracker/qubership-apihub/issues/116).

#### User Story

A User Story is end-to-end functionality that can be delivered and tested. It is assigned to a concrete developer and
shown on the team demo after completion.

Definition of done: implemented, dev tested, demonstrated, merged to `develop`, QA tested, all bugs fixed, and
included in a release.

Mandatory fields:

- Assignees: empty
- Labels: `User Story`
- Type: Feature
- Projects: `qubership-apihub`
  - Priority: choose an option
  - Status: empty
  - Sprint: empty (exception: the Dev Lead can create a User Story directly in the current sprint)
  - Team: choose BE or FE
- Relationships: the corresponding Epic

Example: [User Story #7](https://github.com/Netcracker/qubership-apihub/issues/7).

#### Bug

A Bug is a defect in the product that needs a fix. Anyone can report one, but QA typically does.

Definition of done: fixed, dev tested, merged to `develop`, QA tested, and included in a release.

Mandatory fields:

- Assignees: empty
- Labels: empty
- Type: Bug
- Projects: `qubership-apihub`
  - Priority: choose an option
  - Status: empty
  - Sprint: empty (exceptions: the Dev Lead can create a Bug directly in the current sprint, and QA can do so when the
    Bug is found while testing a feature of the current sprint)
  - Team: choose BE or FE
  - REF: `E1234` or `I1234`, the number in the internal ticketing system (`E` for the external queue, `I` for the
    internal queue)

#### Task

A Task is a job that is neither a new feature nor a bug: technical tasks, one-time activities, configuration, and so
on.

Definition of done: the task is complete and accepted by the Dev Lead or the TM.

Mandatory fields:

- Assignees: empty or a concrete person
- Labels: choose an option
- Type: Task
- Projects: `qubership-apihub`
  - Priority: choose an option
  - Status: empty
  - Sprint: empty (exceptions: the Dev Lead can create a Task directly in the current sprint, and a developer can do so
    for a Task assigned to themselves)
  - Team: choose BE or FE

Example: [Task #33](https://github.com/Netcracker/qubership-apihub/issues/33).

#### Design task and documentation task

These track design changes, such as a change of an API specification. The rules are the same as for a User Story, so
they must sit under an Epic. The differences:

- Labels: `Design` or `documentation`
- Type: Feature or Task

Example: [Design Task #28](https://github.com/Netcracker/qubership-apihub/issues/28).

### Work item workflow

#### User Story workflow

1. The issue is created. It has an empty Status, so it sits in the leftmost column of the project board and is
   reviewed by the leads at their regular sync-up.
2. The Dev Lead reviews the issue, sets Status to `Backlog` or `Ready for Dev`, and sets the Sprint. Issues without a
   Sprint but with a non-empty Status are in the backlog.
3. When the time comes, the Dev Lead assigns the issue to a Developer.
4. The Developer starts work and sets Status to `In Progress`.
5. When implementation and dev testing are done, the Developer creates a pull request into `develop` and sets Status to
   `In Review`. The pull request must:
   1. link the issue in the Development field;
   2. have an empty Projects field;
   3. have reviewers from the team;
   4. be assigned to the Dev Lead;
   5. have a green CI run, with no failed end-to-end tests. If your pull request breaks tests, see
      [Special cases](#special-cases).
6. The Dev Lead reviews the pull request. When the review is done and every comment is addressed, the pull request is
   accepted. The Dev Lead sets the issue Status to `In Test` and adds QA to the assignees.
7. QA validates the User Story and, after successful testing, sets Status to `Done`.
   1. If testing finds bugs, QA creates new issues and sets the User Story as their parent.
      1. If every bug has Priority `Major` or lower, QA closes the User Story by setting Status to `Done`.
      2. If a bug has Priority `Critical` or higher, QA sets Status to `In BugFix` and notifies the Dev Lead. QA
         retests the User Story (back to step 7) after all of those bugs are resolved.

#### Bug workflow

Steps 1 to 6 are the same as for a User Story. In step 7, QA validates the fix and, after successful testing, sets
Status to `Done`. If the fix is not accepted, QA sets Status to `In Progress` and notifies the Developer.

#### Pull request review process and rules

Still to be written. Until then, see the reviewer checklist in the
[backend development guide](../../backend/portal-backend/docs/development_guide.md#reviewers-checklist) and
[the contributor workflow](../development/workflow.md).

### Special cases

#### Fast track

A work item can carry the label `fast track` for reasons such as a critical issue in production, a customer escalation,
or an urgent request from sales. Process these items with the highest priority and include them in the nearest release
if possible.

#### Delivery to QA from develop or a feature branch

In most cases User Stories and Bugs reach QA from `develop`, after the pull request is accepted. This is the common
process, and QA knows how to take a `develop` build.

For a complex, risky feature that involves several components, it can make sense to deliver it for testing from the
feature branch. Use common sense to decide.

#### Release delay because of Critical+ issues

When the sprint is over but a User Story already merged to `develop` still has open Critical+ issues, the release can
be delayed by one to three days.

#### My pull request breaks tests

The end-to-end tests live in this repository (`tests/`), so one pull request carries the change and the test fix:

1. Fix the tests in the same pull request (preferred).
2. If you need help, ask the test automation engineers to push the test changes to your branch.

Merge only when CI is green. Do not merge a code change now and a test fix later.

#### Pull request without an issue

A pull request without a corresponding issue (a small technical improvement, a cosmetic change) must still be added to
the project.

## Development process

APIHUB follows the Scrum process. At a high level:

1. The tactical planning horizon is the **Quarter Release**: three months (12 weeks). The scope is planned with the
   Product Owner and defined by business needs and the strategic roadmap. Work items: Epics.
2. The operational iteration is the **Sprint**: two weeks. Work items: User Stories and Bugs.
3. The team creates a deliverable, a **Release**, at the end of each sprint.

### Quarter Release

Before each new Quarter Release, the Product Owner prepares a prioritized list of Epics. The TM and the Dev Leads
review the Epics to decide whether the team has the technical ability and resources to implement them. The finalized
list is the scope for development. The TM and the Dev Leads decompose each Epic into User Stories.

### Sprint

A sprint is a two-week iteration. The TM pre-creates sprints in the project, and each sprint starts and ends
automatically on its start and finish dates.

- The TM and the Dev Leads define and agree on the sprint scope (the included issues) before the sprint starts.
- Keeping the sprint board up to date is the TM's responsibility.
- Implementing the sprint scope in time is the responsibility of the TM and the Dev Leads.
- If the sprint is over and issues remain incomplete, the TM moves them manually to the next sprint or to no sprint
  (the backlog).
- The release is created right after the sprint completes.

## Related pages

- [Contributor workflow](../development/workflow.md)
- [Release process](../development/release-process.md)
