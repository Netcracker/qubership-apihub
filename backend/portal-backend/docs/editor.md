# Apihub editor 

## Overview
User can view git branch content, edit it, then commit and push changes.
Local state is stored on backend and called `draft`.
Apihub editor is based on Monaco editor and custom UI.

**Rigtht now editor doesn't support pull operation as well as merge of any type.**

## Collaborative editing
Apihub editor is designed to be collaborative, i.e. users can work together on local copy of a git branch.
Executed changes will be visible to all users connected to the same branch and file.

### Operational transformation
Collaborative text editing is based on https://en.wikipedia.org/wiki/Operational_transformation

# project
Editor UI have the same grouping as a portal one.
Groups are the same as in portal! I.e. it's the same entity stored in `package_group`.
But empty groups(without **projects**) are hidden from the tree view.

Project is a relation between Apihub and Git integration.
Project is bound to exactly one specific git integration server and repository inside it.

## project vs package
Package is a portal's entity.
Project is an editor's entity.
Package contains versions, while project the project is not.

# Project config
## Files in project's branch
Apihub editor is not intended to work with all files in a repository, but with API specs only.
So user needs to add required files to the editor's config. **The config is generated and commited by Apihub automatically and usually requires no manual editing.**

## Git representation
Project configs are stored in git in the top level folder `apihub-config`(name is a contract).
Each config is stored in a separate json file which is named as a project id.

Example: `apihub-config/QS.CP.AH.RS.json`
https://<git_group_link>/apihub-backend/-/blob/develop/apihub-config/QS.CP.AH.RS.json

Project config contains a list of included documents and folders.

`publish` flag indicated if the file should be included to result published version as a separate (specification) file. Typically it's set to `false` **by user** when a document contains json schema which is required to resolve external reference, but not a complete specification.

Config example:
```
{
 "projectId": "QS.CP.AH.RS",
 "files": [
  {
   "fileId": "docs/api/Public Registry API.yaml",
   "publish": true
  },
  {
   "fileId": "docs/api/APIHUB API.yaml",
   "publish": true
  },
  {
   "fileId": "docs/api/Admin API.yaml",
   "publish": true
  }
 ]
}
```

# Branch draft
Local state for a git repo branch(only project files!) is stored in the BE DB and called "draft".
Draft is created when a user opens any branch in Apihub editor.
All required data(file content) is loaded to the draft on creation. 

If user made no changes and closed the session(websocket), the draft would be deleted.
Draft with changes would be stored for a long time.

tables:
* drafted_branches - list of drafts
* branch_draft_content - list of content for each draft with data
* branch_draft_reference - references

# Communication between FE and BE
FE loads some information via REST, but all interactive actions are performed via websocket.

# Websocket

## Branch websocker
Initial branch state is sent to the clien in the first message from BE.
All evens that modify branch config are sent via the webcket.

Events:
```
	BranchConfigSnapshotType    = "branch:config:snapshot"
	BranchConfigUpdatedType     = "branch:config:updated"
	BranchFilesUpdatedType      = "branch:files:updated"
	BranchFilesResetType        = "branch:files:reset"
	BranchFilesDataModifiedType = "branch:files:data:modified"
	BranchRefsUpdatedType       = "branch:refs:updated"
	BranchSavedType             = "branch:saved"
	BranchResetType             = "branch:reset"
	BranchEditorAddedType       = "branch:editors:added"
	BranchEditorRemovedType     = "branch:editors:removed"
```


## File websocket

Content change events(like typing) are sent via file websocket.

## Scaling
Since BE supports scaling, websocket sessions need to be bound to a specific BE pod to work with local state.
WsLoadBalancer implements this functionality

# E2E sequence
## Initial load
open project -> start editor loading for default branch -> get branch from git and check the permissions -> if user can push to the branch, the UI will allow docs editing -> 
Browser connects to branch websocket -> BE sends branch snapshot message with config(list of files and metadata) -> broser renders data

Branch snapshot example:
```
{"type":"branch:config:snapshot","data":{"projectId":"QS.CP.AH.AHA","editors":[],"configFileId":"apihub-config/QS.CP.AH.AHA.json","changeType":"none","permissions":["all"],"files":[{"fileId":"docs/Agent API.yaml","name":"Agent API.yaml","type":"unknown","path":"docs","publish":true,"status":"unmodified","blobId":"bd7fe81975235979dc2294e4a00e71995b1d72c2","changeType":"none"}],"refs":[]}}
```

## Open file/edit
open file -> Browser connects to file websocket -> BE sends current file state -> BE sends "user joined" event to other users -> user types something/move cursor -> FE send changes event -> changes are applied and BE state is updated -> updates are sent to other clients -> updates are applied to other client's state and re-rendering happens

File state is periodically save to DB (to branch_draft_content table).