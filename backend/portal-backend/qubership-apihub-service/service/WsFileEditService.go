// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/buraksezer/olric"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	ot "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/ot"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/websocket"
	ws "github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
)

type WsFileEditService interface {
	ConnectToFileEditSession(ctx context.SecurityContext, projectId string, branchName string, fileId string, wsId string, connection *ws.Conn) error
	SetFileContent(projectId string, branchName string, fileId string, content []byte)
	HandleCommitAction(projectId string, branchName string, fileId string) error
}

func NewWsFileEditService(userService UserService, draftContentService DraftContentService, branchEditorsService BranchEditorsService, wsLoadBalancer WsLoadBalancer) WsFileEditService {
	service := &WsFileEditServiceImpl{
		fileEditSessions:     make(map[string]*websocket.WsEditSession),
		files:                map[string]*ot.ServerDoc{},
		fileMutex:            map[string]*sync.RWMutex{}, // TODO: replace with channel
		cursors:              map[string]map[string]websocket.CursorValue{},
		wsEventsCh:           map[string]chan websocket.WsEvent{},
		opsStatData:          map[string]websocket.OpsStatData{},
		userService:          userService,
		draftContentService:  draftContentService,
		branchEditorsService: branchEditorsService,
		wsLoadBalancer:       wsLoadBalancer,
		sessionMutex:         sync.RWMutex{}, // TODO: replace with channel
	}

	utils.SafeAsync(func() {
		service.runAsyncSaveJob()
	})
	utils.SafeAsync(func() {
		service.runAsyncFileKeepaliveJob()
	})
	utils.SafeAsync(func() {
		_, err := wsLoadBalancer.GetFileEventTopic().AddListener(service.handleRemoteFileEvent)
		if err != nil {
			log.Errorf("Failed to subscribe to file remote events: %s", err.Error())
		}
	})
	return service
}

type WsFileEditServiceImpl struct {
	fileEditSessions map[string]*websocket.WsEditSession
	files            map[string]*ot.ServerDoc
	fileMutex        map[string]*sync.RWMutex
	cursors          map[string]map[string]websocket.CursorValue
	wsEventsCh       map[string]chan websocket.WsEvent
	opsStatData      map[string]websocket.OpsStatData

	userService          UserService
	draftContentService  DraftContentService
	branchEditorsService BranchEditorsService
	wsLoadBalancer       WsLoadBalancer
	sessionMutex         sync.RWMutex
}

const stringSeparator = "|@@|"

func (w *WsFileEditServiceImpl) HandleCommitAction(projectId string, branchName string, fileId string) error {
	editSessionId := makeFileEditSessionId(projectId, branchName, fileId)
	if editSessionId == "" {
		return fmt.Errorf("unable to make session id from %s %s %s", projectId, branchName, fileId)
	}

	w.sessionMutex.Lock()
	defer w.sessionMutex.Unlock()

	file, exists := w.files[editSessionId]
	if exists {
		log.Infof("Detected non-saved content before commit for %s, going to save data", editSessionId)
		opsStatData := w.opsStatData[editSessionId]
		if opsStatData.LastSavedRev < file.Rev() {
			w.SaveFileContent(editSessionId)
		}
	} else {
		err := w.wsLoadBalancer.GetFileEventTopic().Publish(websocket.FileEventToMap(websocket.FileEvent{ProjectId: projectId, BranchName: branchName, FileId: fileId, Action: "commit"}))
		if err != nil {
			log.Errorf("unable to publish ws file event: %s", err.Error())
		}
		return nil
	}

	return nil
}

func (w *WsFileEditServiceImpl) ConnectToFileEditSession(ctx context.SecurityContext, projectId string, branchName string, fileId string, wsId string, connection *ws.Conn) error {
	user, err := w.userService.GetUserFromDB(ctx.GetUserId()) // TODO: maybe store user object in context?
	if err != nil {
		return err
	}
	if user == nil {
		userId := ctx.GetUserId()
		user = &view.User{Id: userId, Name: userId}
	}

	w.sessionMutex.Lock()
	defer w.sessionMutex.Unlock()

	editSessionId := makeFileEditSessionId(projectId, branchName, fileId)
	if editSessionId == "" {
		return fmt.Errorf("unable to make session id from %s %s %s", projectId, branchName, fileId)
	}

	editSession, exists := w.fileEditSessions[editSessionId]
	if !exists {
		cd, err := w.draftContentService.GetContentFromDraftOrGit(ctx, projectId, branchName, fileId)
		if err != nil {
			return err
		}

		editSession = websocket.NewWsEditSession(editSessionId, w, w, user.Id)
		w.fileEditSessions[editSessionId] = editSession
		metrics.WSFileEditSessionCount.WithLabelValues().Set(float64(len(w.fileEditSessions)))
		w.files[editSessionId] = &ot.ServerDoc{Doc: ot.NewDocFromStr(string(cd.Data)), History: []ot.Ops{}}
		w.fileMutex[editSessionId] = &sync.RWMutex{}
		_, mapExists := w.cursors[editSessionId]
		if !mapExists {
			w.cursors[editSessionId] = make(map[string]websocket.CursorValue)
		}
		_, chExists := w.wsEventsCh[editSessionId]
		if !chExists {
			ch := make(chan websocket.WsEvent)
			w.wsEventsCh[editSessionId] = ch
			utils.SafeAsync(func() {
				w.handleWsEvents(ch)
			})
		}
		w.opsStatData[editSessionId] = websocket.OpsStatData{LastSavedRev: 0, SaveTimestamp: time.Time{}}
	}

	wg := sync.WaitGroup{}
	wg.Add(1)

	editSession.ConnectClient(wsId, connection, *user, &wg)

	wg.Wait() // wait for user:connected messages should be sent first

	// send doc snapshot on connect
	file := w.files[editSessionId]
	snapshotMessage := websocket.DocSnapshotOutputMessage{
		Type:     websocket.DocSnapshotOutputType,
		Revision: file.Rev(),
		Document: []string{file.Doc.String()},
	}

	editSession.NotifyClientSync(wsId, snapshotMessage)

	// send other user cursors on connect
	cursors := w.cursors[editSessionId]
	for cWsId, cursor := range cursors {
		if cWsId == wsId {
			continue
		}
		editSession.NotifyClient(wsId, websocket.UserCursorOutput{
			Type:      websocket.UserCursorOutputType,
			SessionId: cWsId,
			Cursor: websocket.CursorValue{
				Position:     cursor.Position,
				SelectionEnd: cursor.SelectionEnd,
			},
		})
	}

	return nil
}

func (w *WsFileEditServiceImpl) SetFileContent(projectId string, branchName string, fileId string, content []byte) {
	editSessionId := makeFileEditSessionId(projectId, branchName, fileId)
	if editSessionId == "" {
		return
	}
	sess, exists := w.fileEditSessions[editSessionId]
	if !exists {
		err := w.wsLoadBalancer.GetFileEventTopic().Publish(websocket.FileEventToMap(websocket.FileEvent{ProjectId: projectId, BranchName: branchName, FileId: fileId, Action: "set_content", Content: string(content)}))
		if err != nil {
			log.Errorf("unable to publish ws file event: %s", err.Error())
		}
		return
	}

	fMutex, mExists := w.fileMutex[sess.EditSessionId]
	if !mExists {
		log.Errorf("Unable to SetFileContent: file mutex not found for edit session id = %s", sess.EditSessionId)
		return
	}

	fMutex.Lock()
	defer fMutex.Unlock()

	file, fExists := w.files[sess.EditSessionId]
	if !fExists {
		log.Errorf("Unable to SetFileContent: file not found for edit session id = %s", sess.EditSessionId)
		return
	}

	wsId := "system" // TODO: this user doesnt really exists. Probably should be handled separately on frontend

	message := websocket.OperationInputMessage{
		Type:     websocket.OperationOutputType,
		Revision: file.Rev(),
		Operation: []interface{}{
			-file.Doc.Size,
			string(content)},
	}

	utils.SafeAsync(func() {
		w.HandleOperationWsMessage(sess, message, wsId)
	})
}

func (w *WsFileEditServiceImpl) handleWsEvents(ch chan websocket.WsEvent) {
	for {
		event, more := <-ch
		if event.EditSessionId != "" {
			sess, exists := w.fileEditSessions[event.EditSessionId]
			if !exists {
				continue // TODO: error log?
			}

			var typed websocket.TypedWsMessage
			err := json.Unmarshal(event.Data, &typed)
			if err != nil {
				log.Errorf("Unable to unmarshall WS file edit message %s with err %s", string(event.Data), err.Error())
				sess.NotifyClientSync(event.WsId,
					websocket.UnexpectedMessage{
						Type:    websocket.UnexpectedMessageType,
						Message: string(event.Data),
					})
				w.disconnectClient(sess.EditSessionId, event.WsId)
				continue
			}
			log.Debugf("Received from id '%s' message '%s'", event.WsId, string(event.Data))

			switch typed.Type {
			case websocket.UserCursorInputType:
				var message websocket.UserCursorInput
				err := json.Unmarshal(event.Data, &message)
				if err != nil {
					log.Errorf("Unable to unmarshall WS file edit message %s with err %s", string(event.Data), err.Error())
					sess.NotifyClientSync(event.WsId,
						websocket.UnexpectedMessage{
							Type:    websocket.UnexpectedMessageType,
							Message: string(event.Data),
						})
					w.disconnectClient(sess.EditSessionId, event.WsId)
					continue
				}
				cValue := websocket.CursorValue{Position: message.Position, SelectionEnd: message.SelectionEnd}
				w.cursors[event.EditSessionId][event.WsId] = cValue

				outMessage := websocket.UserCursorOutput{
					Type:      websocket.UserCursorOutputType,
					SessionId: event.WsId,
					Cursor:    cValue,
				}

				sess.NotifyOthers(event.WsId, outMessage)

				continue
			case websocket.OperationInputMessageType:
				var message websocket.OperationInputMessage
				err := json.Unmarshal(event.Data, &message)
				if err != nil {
					log.Errorf("Unable to unmarshall WS file edit message %s with err %s", string(event.Data), err.Error())
					sess.NotifyClientSync(event.WsId,
						websocket.UnexpectedMessage{
							Type:    websocket.UnexpectedMessageType,
							Message: string(event.Data),
						})
					w.disconnectClient(sess.EditSessionId, event.WsId)
					continue
				}

				w.HandleOperationWsMessage(sess, message, event.WsId)
				continue
			case websocket.DebugStateInputMessageType:
				w.HandleDebugStateWsMessage(sess, event.WsId)
				continue
			default:
				log.Errorf("unknown message type '%s'", typed.Type)
				sess.NotifyClientSync(event.WsId,
					websocket.UnexpectedMessage{
						Type:    websocket.UnexpectedMessageType,
						Message: string(event.Data),
					})
				w.disconnectClient(sess.EditSessionId, event.WsId)
			}
		}

		if !more {
			return
		}
	}
}

func (w *WsFileEditServiceImpl) HandleOperationWsMessage(sess *websocket.WsEditSession, message websocket.OperationInputMessage, wsId string) {
	ops := makeGoOtOps(message.Operation)

	fMutex, mExists := w.fileMutex[sess.EditSessionId]
	if !mExists {
		log.Errorf("Unable to process operaton: file mutex not found for edit session id = %s", sess.EditSessionId)
		w.disconnectClients(sess.EditSessionId)
		return
	}
	fMutex.Lock()
	defer fMutex.Unlock()

	file, fExists := w.files[sess.EditSessionId]
	if !fExists {
		log.Errorf("Unable to process operaton: file not found for edit session id = %s", sess.EditSessionId)
		w.disconnectClients(sess.EditSessionId)
		return
	}

	resultOtOps, err := file.Recv(message.Revision, ops)
	if err != nil {
		log.Errorf("Unable to process operaton for session %s: ops not applicable: %s", sess.EditSessionId, err.Error())
		sess.NotifyClientSync(wsId,
			websocket.UnexpectedMessage{
				Type:    websocket.UnexpectedMessageType,
				Message: message,
			})
		w.disconnectClient(sess.EditSessionId, wsId)
		return
	}

	opsStatData := w.opsStatData[sess.EditSessionId]
	if file.Rev() == 1 || (file.Rev()-opsStatData.LastSavedRev) > 100 {
		utils.SafeAsync(func() {
			w.SaveFileContent(sess.EditSessionId)
		})
	}
	client := sess.GetClient(wsId)
	if client != nil {
		projectId, branchName, _ := splitFileEditSessionId(sess.EditSessionId)
		err = w.branchEditorsService.AddBranchEditor(projectId, branchName, client.User.Id)
		if err != nil {
			log.Errorf("Unable to add editor for session %s: %s", sess.EditSessionId, err.Error())
			// TODO: close session or not?
		}
	}

	resultJsOps := makeJsOtOps(resultOtOps)

	responseMessage := websocket.OperationOutputMessage{
		Type:      websocket.OperationOutputType,
		SessionId: wsId,
		Revision:  message.Revision,
		Operation: resultJsOps,
	}

	sess.NotifyAll(responseMessage)
}

func (w *WsFileEditServiceImpl) HandleMessage(messageBytes []byte, wsId string, session *websocket.WsEditSession) {
	event := websocket.WsEvent{
		EditSessionId: session.EditSessionId,
		WsId:          wsId,
		Data:          messageBytes,
	}

	ch, exists := w.wsEventsCh[session.EditSessionId]
	if !exists {
		log.Errorf("Unable to handle event since session %s channel not found", session.EditSessionId)
	}
	ch <- event
}

func (w *WsFileEditServiceImpl) runAsyncSaveJob() {
	for range time.Tick(time.Second * 5) {
		for sessId, data := range w.opsStatData {
			file, fExists := w.files[sessId]
			if !fExists {
				continue
			}
			if data.LastSavedRev < file.Rev() {
				sessIdTmp := sessId
				utils.SafeAsync(func() {
					w.SaveFileContent(sessIdTmp)
				})
			}
		}
	}
}

func (w *WsFileEditServiceImpl) HandleSessionClosed(editSessionId string) {
	w.sessionMutex.Lock()
	defer w.sessionMutex.Unlock()

	w.SaveFileContent(editSessionId)

	delete(w.fileEditSessions, editSessionId)
	metrics.WSFileEditSessionCount.WithLabelValues().Set(float64(len(w.fileEditSessions)))
	delete(w.files, editSessionId)
	delete(w.fileMutex, editSessionId)
	delete(w.cursors, editSessionId)

	channel, sessExists := w.wsEventsCh[editSessionId]
	if sessExists {
		close(channel)
	}
	delete(w.wsEventsCh, editSessionId)
	delete(w.opsStatData, editSessionId)
}

func (w *WsFileEditServiceImpl) HandleUserDisconnected(editSessionId string, wsId string) {
	w.sessionMutex.Lock()
	defer w.sessionMutex.Unlock()

	// delete user's cursor value if any
	cursors, sessExists := w.cursors[editSessionId]
	if !sessExists {
		return
	}

	_, userExists := cursors[wsId]
	if !userExists {
		return
	}
	delete(cursors, wsId)
}

func (w *WsFileEditServiceImpl) SaveFileContent(editSessionId string) {
	sess, exists := w.fileEditSessions[editSessionId]
	if !exists {
		log.Errorf("session not found for id = %s", editSessionId)
	}

	fMutex, mExists := w.fileMutex[sess.EditSessionId]
	if !mExists {
		log.Errorf("Unable to process operaton: file mutex not found for edit session id = %s", sess.EditSessionId)
	}
	fMutex.Lock()
	defer fMutex.Unlock()

	file, fExists := w.files[editSessionId]
	if !fExists {
		log.Errorf("file not found for edit session id = %s", editSessionId)
	}

	// avoid empty save
	statData, sdExists := w.opsStatData[editSessionId]
	if sdExists {
		if statData.LastSavedRev == file.Rev() {
			return
		}
	}

	projectId, branchName, fileId := splitFileEditSessionId(sess.EditSessionId)

	err := w.draftContentService.UpdateDraftContentData(context.CreateFromId(sess.OriginatorUserId), projectId, branchName, fileId, []byte(file.Doc.String()))
	if err != nil {
		log.Errorf("failed to save ws file content for session %s: %s", editSessionId, err.Error())
		w.disconnectClients(sess.EditSessionId)
	}

	w.opsStatData[editSessionId] = websocket.OpsStatData{SaveTimestamp: time.Now(), LastSavedRev: file.Rev()}
}

func makeGoOtOps(ops []interface{}) ot.Ops {
	var result ot.Ops
	for _, op := range ops {
		switch op.(type) {
		case int:
			result = append(result, ot.Op{N: op.(int)})
		case float64:
			result = append(result, ot.Op{N: int(op.(float64))})
		case string:
			result = append(result, ot.Op{S: op.(string)})
		default:
			log.Errorf("unknown op type: '%+v'", op)
			continue
		}
	}
	return result
}

func makeJsOtOps(ops ot.Ops) []interface{} {
	var result []interface{}
	for _, op := range ops {
		if op.S != "" {
			result = append(result, op.S)
		} else {
			result = append(result, op.N)
		}
	}
	return result
}

func makeFileEditSessionId(projectId string, branchName string, fileId string) string {
	id := projectId + stringSeparator + branchName + stringSeparator + fileId
	if strings.Count(id, stringSeparator) > 2 {
		log.Errorf("Unable to compose correct ws edit session id since names contain string separator")
		return ""
	}
	return id
}

func splitFileEditSessionId(editSessionId string) (string, string, string) {
	parts := strings.Split(editSessionId, stringSeparator)
	if len(parts) != 3 {
		log.Errorf("Incorrect ws edit session id: %s, unable to split", editSessionId)
		return "", "", ""
	}
	//return projectId, branchName, fileId
	return parts[0], parts[1], parts[2]
}

func (w *WsFileEditServiceImpl) HandleDebugStateWsMessage(sess *websocket.WsEditSession, wsId string) {
	message := websocket.DebugSessionStateOutputMessage{
		Session:     sess,
		File:        w.files[sess.EditSessionId],
		Cursors:     w.cursors[sess.EditSessionId],
		OpsStatData: w.opsStatData[sess.EditSessionId],
	}

	sess.NotifyClient(wsId, message)
}

func (w *WsFileEditServiceImpl) disconnectClient(sessionId string, wsId string) {
	session, exists := w.fileEditSessions[sessionId]
	if !exists {
		return
	}
	session.ForceDisconnect(wsId)
}

func (w *WsFileEditServiceImpl) disconnectClients(sessionId string) {
	session, exists := w.fileEditSessions[sessionId]
	if !exists {
		return
	}
	session.ForceDisconnectAll()
}

func (w *WsFileEditServiceImpl) runAsyncFileKeepaliveJob() {
	for range time.Tick(websocket.PingTime) {
		for sessId, session := range w.fileEditSessions {
			sessIdTmp := sessId
			sessionTmp := session
			utils.SafeAsync(func() {
				err := w.wsLoadBalancer.TrackSession(sessIdTmp)
				if err != nil {
					log.Errorf("Unable to make keepalive for file edit session with id = %s: %s", sessIdTmp, err.Error())
				}
			})
			utils.SafeAsync(func() {
				sessionTmp.SendPingToAllClients()
			})
		}
	}
}

func (w *WsFileEditServiceImpl) handleRemoteFileEvent(msg olric.DTopicMessage) {
	eventMap := msg.Message.(map[string]interface{})
	event := websocket.FileEventFromMap(eventMap)
	editSessionId := makeBranchEditSessionId(event.ProjectId, event.BranchName)

	_, exists := w.fileEditSessions[editSessionId]
	if !exists {
		return
	}
	switch event.Action {
	case "set_content":
		w.SetFileContent(event.ProjectId, event.BranchName, event.FileId, []byte(event.Content))
	case "commit":
		err := w.HandleCommitAction(event.ProjectId, event.BranchName, event.FileId)
		if err != nil {
			log.Errorf("Got error when handling commit action: %s", err.Error())
		}
	default:
		log.Errorf("Unknown remote file event action type: %s", event.Action)
	}
}
