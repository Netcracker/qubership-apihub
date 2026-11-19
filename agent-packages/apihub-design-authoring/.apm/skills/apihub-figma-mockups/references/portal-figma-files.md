# Portal Figma files and catalog

Update this file when Portal (Copy) or Tasks (Copy) are refreshed for a new release (new `fileKey` values or page
IDs). Do not edit the original team files; use editable **Copy** files only.

## Files

| Role | File | fileKey | Access |
|------|------|---------|--------|
| Working file: task pages and reference frames | [APIHUB Portal (Copy)](https://www.figma.com/design/sliEUyrX1kCNP5QzUYAWIp/-APIHUB--Portal--Copy-) | `sliEUyrX1kCNP5QzUYAWIp` | edit |
| Mockups of earlier tasks, for reference | [APIHUB Tasks (Copy)](https://www.figma.com/design/ORQINIaU2lmPJVwieW6NvO/-APIHUB--Tasks--Copy-) | `ORQINIaU2lmPJVwieW6NvO` | edit |
| Component source, never edited or copied | [APIHUB Library](https://www.figma.com/design/QxYOovrBZ8clgDrqI1jjsY/-APIHUB--Library) | `QxYOovrBZ8clgDrqI1jjsY` | view |

Copies may lag behind team files. After a refresh, update `fileKey`, the frame link pattern below, and the page
catalog in this file.

**Frame link pattern (Portal Copy):**

`https://www.figma.com/design/sliEUyrX1kCNP5QzUYAWIp/?node-id=<node id with ":" replaced by "-">`

## Libraries

Portal frames use three published libraries. No library is enabled in the copies, so import components by key
(`$fig.instance(componentSetKey, props)`) and restrict every `search_design_system` call with `includeLibraryKeys` to
these keys:

| Library | Used for | libraryKey |
|---------|----------|------------|
| [APIHUB] Library | layout (Body, Content, Header), popups, rows, chips, product widgets | `lk-e6e298bcaff394f30b07a2a7bd65a5a9edecc5f27a4051949911d88fdbd70e7e23bdfca4977672d2780ca220fbc1bf5cb8102e1f7bcebb84e57e70bacb271966` |
| Netcracker X. Release 2.0 | `1. Button` and other base controls | `lk-634fd5b29a36820b30b472b74a8c8e019c0c87c8bfb44ef9366e5cf1f239c7fff84fc90a48d74618bccbce6ac912675098f1668f5f626eb3a2969851c58c70af` |
| Netcracker X. Icons | icons (`chevron down`, `copy`, `edit`, `settings`, ...) | `lk-8d8e4246f9499797c708e497419e3d20dc14c4cdfb8b90b43f183fc989dfa6a57f2fb016eb8c01c876ec8d9d5ab2e8f95814fb70b74b6b9b64079f93007cba9a` |

## Page catalog of Portal (Copy)

| Area | Pages (page ID) |
|------|-----------------|
| Log in | Log In `72794:135609` |
| Portal tab | Favorite `72875:255876`, Shared `72875:255877`, Private `72875:255878`, Workspaces `72875:255879`, Activity History `72936:88935`, Favorite Workspaces `72875:255880` |
| Workspace | Create `73121:31111`, Manage `73087:28426` |
| Package | Create `73646:151466`, Create Version `73739:54521`, Adding and Removing versions `73738:82440`, Overview Tab `73308:21422`, API Contracts Tab `73499:51737`, API Changes Tab `73499:70986`, API Deprecated Tab `73499:74225`, API Quality Tab `73365:40670`, Documents Tab `73499:80420`, Manage `73087:23692`, Versions/Revisions Comparison `73323:28685` |
| Dashboard | Create `73135:12119`, Create Version `73924:152310`, Copy and Edit Version `73940:240675`, Overview Tab `73646:116304`, API Contracts Tab `73646:116305`, API Changes Tab `73646:140123`, API Deprecated Tab `73646:131732`, Documents Tab `73646:149356`, Manage `73087:28418` |
| Group | Create `73732:43901`, Manage `73087:28422` |
| Other tabs | Agent Tab `72875:255875`, Global Search Tab `72875:255881`, System Information Tab `72875:255884`, My Profile Tab `72875:255883` |
| Settings tab | User Roles `72900:216568`, Roles Hierarchy `72900:218810`, System Administrators `72900:220773`, System Tokens `72900:220801`, API Quality Ruleset Management `74105:63000` |
| Task pages | 13547 - JavaAPI `76407:237`, Operation Migration Tracking `76420:237` |

Frames are 1440 × 780. A page holds the states of one screen, numbered like `1.0 Summary`, `4.1 Popup: Transfer`.
