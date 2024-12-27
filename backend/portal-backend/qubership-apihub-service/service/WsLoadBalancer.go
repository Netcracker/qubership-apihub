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
	"encoding/gob"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/buraksezer/olric"
	"github.com/buraksezer/olric/query"
	ws "github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
)

const LocalServer = "local"

type WsLoadBalancer interface {
	SelectWsServer(projectId string, branchName string, fileId string) (string, error)
	TrackSession(sessionId string) error
	ListSessions() ([]WSLoadBalancerSession, error)
	HasBranchEditSession(sessionId string) (bool, error)
	ListNodes() ([]string, error)
	ListForwardedSessions() []string
	GetBindAddr() string
	RedirectWs(addr string, serverConn *ws.Conn, origSecWebSocketKey string)
	GetBranchEventTopic() *olric.DTopic
	GetFileEventTopic() *olric.DTopic
}

func NewWsLoadBalancer(op cache.OlricProvider) (WsLoadBalancer, error) {
	gob.Register(WSLoadBalancerSession{})

	lb := &wsLoadBalancerImpl{
		op:                   op,
		isReadyWg:            sync.WaitGroup{},
		olricC:               nil,
		sessMap:              nil,
		bindAddr:             "",
		forwardedConnections: sync.Map{},
	}
	lb.isReadyWg.Add(1)

	utils.SafeAsync(func() {
		lb.initWhenOlricReady()
	})

	return lb, nil
}

type wsLoadBalancerImpl struct {
	op                   cache.OlricProvider
	isReadyWg            sync.WaitGroup
	olricC               *olric.Olric
	sessMap              *olric.DMap
	branchEventTopic     *olric.DTopic
	fileEventTopic       *olric.DTopic
	bindAddr             string
	forwardedConnections sync.Map
}

type forwardedConnection struct {
	serverConn          *ws.Conn
	clientConn          *ws.Conn
	started             time.Time
	origSecWebSocketKey string
}

func (w *wsLoadBalancerImpl) initWhenOlricReady() {
	var err error
	hasErrors := false

	w.olricC = w.op.Get()
	w.sessMap, err = w.olricC.NewDMap("EditSessions")
	if err != nil {
		log.Errorf("Failed to creare dmap EditSessions: %s", err.Error())
		hasErrors = true
	}
	w.branchEventTopic, err = w.olricC.NewDTopic("branch_events", 50, olric.UnorderedDelivery)
	if err != nil {
		log.Errorf("Failed to creare branchEventTopic: %s", err.Error())
		hasErrors = true
	}
	w.fileEventTopic, err = w.olricC.NewDTopic("file_events", 50, olric.UnorderedDelivery)
	if err != nil {
		log.Errorf("Failed to creare fileEventTopic: %s", err.Error())
		hasErrors = true
	}
	w.bindAddr = w.op.GetBindAddr()

	if hasErrors {
		log.Infof("Failed to init WsLoadBalancer, going to retry")
		time.Sleep(time.Second * 5)
		w.initWhenOlricReady()
		return
	}

	w.isReadyWg.Done()
	log.Infof("WsLoadBalancer is ready")

	utils.SafeAsync(func() {
		w.runErrorHandlingJob()
	})

	utils.SafeAsync(func() {
		w.sendPingPong()
	})
}

func (w *wsLoadBalancerImpl) GetBindAddr() string {
	w.isReadyWg.Wait()

	return w.bindAddr
}

func (w *wsLoadBalancerImpl) ListForwardedSessions() []string {
	w.isReadyWg.Wait()

	var result []string
	w.forwardedConnections.Range(func(key, value interface{}) bool {
		result = append(result, fmt.Sprintf("Url: %s | started: %s | ws-key: %s", key.(string), value.(forwardedConnection).started.Format(time.RFC3339), value.(forwardedConnection).origSecWebSocketKey))
		return true
	})

	return result
}

func (w *wsLoadBalancerImpl) ListSessions() ([]WSLoadBalancerSession, error) {
	w.isReadyWg.Wait()

	var result []WSLoadBalancerSession
	cursor, err := w.sessMap.Query(query.M{"$onKey": query.M{"$regexMatch": ""}})
	if err != nil {
		return nil, err
	}
	err = cursor.Range(func(key string, value interface{}) bool {
		result = append(result, value.(WSLoadBalancerSession))
		return true
	})
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (w *wsLoadBalancerImpl) HasBranchEditSession(sessionId string) (bool, error) {
	w.isReadyWg.Wait()

	branchSessionRegex := strings.Replace(sessionId, "|", "\\|", -1)
	var branchEditSessions []WSLoadBalancerSession

	cursor, err := w.sessMap.Query(query.M{"$onKey": query.M{"$regexMatch": branchSessionRegex}})
	if err != nil {
		return false, err
	}
	err = cursor.Range(func(key string, value interface{}) bool {
		branchEditSessions = append(branchEditSessions, value.(WSLoadBalancerSession))
		return true
	})
	if len(branchEditSessions) > 0 {
		return true, nil
	}
	return false, nil
}

func (w *wsLoadBalancerImpl) ListNodes() ([]string, error) {
	w.isReadyWg.Wait()

	stats, err := w.olricC.Stats()
	if err != nil {
		return nil, err
	}

	var result []string

	for _, v := range stats.ClusterMembers {
		result = append(result, fmt.Sprintf("%+v", v))
	}
	return result, err
}

type WSLoadBalancerSession struct {
	SessionId   string
	NodeAddress string
}

func (w *wsLoadBalancerImpl) TrackSession(sessionId string) error {
	w.isReadyWg.Wait()

	session := WSLoadBalancerSession{
		SessionId:   sessionId,
		NodeAddress: w.bindAddr,
	}

	return w.sessMap.PutEx(sessionId, session, time.Second*30)
}

func (w *wsLoadBalancerImpl) SelectWsServer(projectId string, branchName string, fileId string) (string, error) {
	w.isReadyWg.Wait()

	var sessionId string
	if fileId != "" {
		sessionId = makeFileEditSessionId(projectId, branchName, fileId)

		branchSessionId := makeBranchEditSessionId(projectId, branchName)
		branchObj, err := w.sessMap.Get(branchSessionId)
		if err != nil {
			if errors.Is(err, olric.ErrKeyNotFound) {
				// no branch edit session found, continue
			} else {
				return "", err
			}
		}
		if branchObj != nil {
			branchSession := branchObj.(WSLoadBalancerSession)
			if branchSession.NodeAddress == w.bindAddr {
				return LocalServer, nil
			} else {
				return branchSession.NodeAddress, nil
			}
		}
	} else {
		sessionId = makeBranchEditSessionId(projectId, branchName)

		fileSessionRegex := makeFileEditSessionId(projectId, branchName, ".*")
		fileSessionRegex = strings.Replace(fileSessionRegex, "|", "\\|", -1)
		var fileEditSessions []WSLoadBalancerSession
		cursor, err := w.sessMap.Query(query.M{"$onKey": query.M{"$regexMatch": fileSessionRegex}})
		if err != nil {
			return "", err
		}
		err = cursor.Range(func(key string, value interface{}) bool {
			fileEditSessions = append(fileEditSessions, value.(WSLoadBalancerSession))
			return true
		})
		// all sessions should be bound to one node
		if len(fileEditSessions) > 0 {
			if fileEditSessions[0].NodeAddress == w.bindAddr {
				return LocalServer, nil
			} else {
				return fileEditSessions[0].NodeAddress, nil
			}
		}
	}

	obj, err := w.sessMap.Get(sessionId)
	if err != nil {
		if errors.Is(err, olric.ErrKeyNotFound) {
			session := WSLoadBalancerSession{
				SessionId:   sessionId,
				NodeAddress: w.bindAddr,
			}
			err = w.sessMap.PutIfEx(sessionId, session, time.Second*30, olric.IfNotFound)
			if err != nil {
				if errors.Is(err, olric.ErrKeyFound) {
					// session is already acquired, re-run procedure
					return w.SelectWsServer(projectId, branchName, fileId)
				} else {
					return "", err
				}
			}
			return LocalServer, nil
		} else {
			return "", err
		}
	}
	session := obj.(WSLoadBalancerSession)

	if session.NodeAddress == w.bindAddr {
		return LocalServer, nil
	} else {
		return session.NodeAddress, nil
	}
}

func (w *wsLoadBalancerImpl) RedirectWs(addr string, serverConn *ws.Conn, origSecWebSocketKey string) {
	w.isReadyWg.Wait()

	log.Debugf("Forwarding ws to %s", addr)
	clientConn, resp, err := ws.DefaultDialer.Dial(addr, nil)
	if err != nil {
		var body []byte
		var statusCode int
		if resp != nil && resp.Body != nil {
			_, errR := resp.Body.Read(body)
			if errR != nil {
				log.Errorf("Failed to read body: %s", errR)
				serverConn.Close()
				return
			}
			statusCode = resp.StatusCode
		}
		log.Errorf("Redirect to %s failed: %s. Status code: %d, body: %s", addr, err.Error(), statusCode, string(body))

		serverConn.Close()
		return
	}

	serverConn.SetReadDeadline(time.Now().Add(PingTime * 2))
	serverConn.SetPongHandler(func(appData string) error {
		serverConn.SetReadDeadline(time.Now().Add(PingTime * 2))
		return nil
	})

	utils.SafeAsync(func() { readAndForward(clientConn, serverConn) })

	w.forwardedConnections.Store(addr, forwardedConnection{clientConn: clientConn, serverConn: serverConn, started: time.Now(), origSecWebSocketKey: origSecWebSocketKey})

	log.Debugf("Forward connection to %s established", addr)

	defer func() {
		serverConn.Close()
		clientConn.Close()
		serverConn = nil
		clientConn = nil
		w.forwardedConnections.Delete(addr)
	}()

	readAndForward(serverConn, clientConn)
}

func readAndForward(from *ws.Conn, to *ws.Conn) {
	for {
		mt, data, err := from.ReadMessage()
		if err != nil {
			break
		}
		err = to.WriteMessage(mt, data)
		if err != nil {
			break
		}
	}
}

func (w *wsLoadBalancerImpl) handleBadSessions() {
	sessions, err := w.ListSessions()
	if err != nil {
		log.Errorf("Failed to list sessions: %s", err.Error())
		return
	}

	branchSession := map[string]string{}
	fileSessions := map[string]string{}

	for _, sess := range sessions {
		switch strings.Count(sess.SessionId, stringSeparator) {
		case 1:
			branchSession[sess.SessionId] = sess.NodeAddress
		case 2:
			fileSessions[sess.SessionId] = sess.NodeAddress
		default:
			log.Errorf("incorrect session id: %s", sess.SessionId)
		}
	}

	// Check bad sessions.
	// Sessions are considered to be bad if they're on different nodes. E.x. Branch edit session on node1 and file edit session on node2.
	for id, node := range fileSessions {
		project, branch, _ := splitSessionId(id)
		matchingBranchSessionId := makeBranchEditSessionId(project, branch)
		branchNode, exists := branchSession[matchingBranchSessionId]
		if exists && (node != branchNode) {
			log.Errorf("Bad WS sessions detected: %s %s", id, matchingBranchSessionId)
		}
	}

	var toDelete []string
	// Check stale forwarded connections
	w.forwardedConnections.Range(func(key, value interface{}) bool {
		addr := key.(string)
		fwdConn := value.(forwardedConnection)

		project, branch, file := getIdsFromUrl(addr)
		var sessionId string
		if file == "" {
			sessionId = makeBranchEditSessionId(project, branch)
		} else {
			sessionId = makeFileEditSessionId(project, branch, file)
		}
		_, exists := branchSession[sessionId]
		if !exists {
			_, fsExists := fileSessions[sessionId]
			if !fsExists {
				log.Warnf("Stale redirect session detected: %s, closing connection", addr)
				fwdConn.clientConn.Close()
				fwdConn.serverConn.Close()
				toDelete = append(toDelete, addr)
			}
		}
		return true
	})

	for _, item := range toDelete {
		w.forwardedConnections.Delete(item)
	}
}

func splitSessionId(sessionId string) (string, string, string) {
	parts := strings.Split(sessionId, stringSeparator)
	if len(parts) > 2 {
		return parts[0], parts[1], parts[2]
	}
	return parts[0], parts[1], ""
}

func getIdsFromUrl(urlStr string) (string, string, string) {
	qParts := strings.Split(urlStr, "?")
	parts := strings.Split(qParts[0], "/")
	if strings.Contains(urlStr, "/files/") {
		project, _ := url.QueryUnescape(parts[6])
		branch, _ := url.QueryUnescape(parts[8])
		file, _ := url.QueryUnescape(parts[10])
		return project, branch, file
	} else {
		project, _ := url.QueryUnescape(parts[6])
		branch, _ := url.QueryUnescape(parts[8])
		return project, branch, ""
	}
}

func (w *wsLoadBalancerImpl) runErrorHandlingJob() {
	for range time.Tick(time.Second * 60) {
		w.handleBadSessions()
	}
}

func (w *wsLoadBalancerImpl) GetBranchEventTopic() *olric.DTopic {
	w.isReadyWg.Wait()
	return w.branchEventTopic
}

func (w *wsLoadBalancerImpl) GetFileEventTopic() *olric.DTopic {
	w.isReadyWg.Wait()
	return w.fileEventTopic
}

func (w *wsLoadBalancerImpl) sendPingPong() {
	ticker := time.NewTicker(PingTime)
	for range ticker.C {
		w.forwardedConnections.Range(func(key, value interface{}) bool {
			addr := key.(string)
			fs := value.(forwardedConnection)
			utils.SafeAsync(func() {
				if err := fs.serverConn.WriteControl(ws.PingMessage, []byte{}, time.Now().Add(PingTime*2)); err != nil {
					fs.serverConn.Close()
					fs.clientConn.Close()
					w.forwardedConnections.Delete(addr)
				}
			})
			return true
		})
	}
}

const PingTime = time.Second * 5
