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

package client

import (
	"encoding/gob"
	"fmt"
	"math/rand"
	"net"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/buraksezer/olric"
	discovery "github.com/buraksezer/olric-cloud-plugin/lib"
	"github.com/buraksezer/olric/config"
	log "github.com/sirupsen/logrus"
)

type OlricProvider interface {
	Get() *olric.Olric
	GetBindAddr() string
}

type olricProviderImpl struct {
	wg     sync.WaitGroup
	cfg    *config.Config
	olricC *olric.Olric
}

const olricBindAddr = "0.0.0.0"

func NewOlricProvider(discoveryMode string, replicaCount int, namespace string, apihubUrl string) (OlricProvider, error) {
	prov := &olricProviderImpl{wg: sync.WaitGroup{}}

	var err error
	gob.Register(map[string]interface{}{})
	prov.cfg, err = getConfig(discoveryMode, replicaCount, namespace, apihubUrl)
	if err != nil {
		return nil, err
	}

	prov.wg.Add(1)

	prov.cfg.Started = prov.startCallback

	prov.olricC, err = olric.New(prov.cfg)
	if err != nil {
		return nil, err
	}

	go func() {
		err = prov.olricC.Start()
		if err != nil {
			log.Panicf("Olric cache node cannot be started. Error: %s", err.Error())
		}
	}()

	return prov, nil
}

func (op *olricProviderImpl) startCallback() {
	op.wg.Done()
}

func (op *olricProviderImpl) Get() *olric.Olric {
	op.wg.Wait()
	return op.olricC
}

func (op *olricProviderImpl) GetBindAddr() string {
	op.wg.Wait()
	return op.cfg.BindAddr
}

func getConfig(discoveryMode string, replicaCount int, namespace string, apihubUrl string) (*config.Config, error) {
	mode := getMode(discoveryMode)
	switch mode {
	case "lan":
		log.Info("Olric run in cloud mode")
		cfg := config.New(mode)

		cfg.LogLevel = "WARN"
		cfg.LogVerbosity = 2

		ns, err := getNamespace(namespace)
		if err != nil {
			return nil, err
		}

		cloudDiscovery := &discovery.CloudDiscovery{}
		cfg.ServiceDiscovery = map[string]interface{}{
			"plugin":   cloudDiscovery,
			"provider": "k8s",
			"args":     fmt.Sprintf("namespace=%s label_selector=\"%s\"", ns, "olric-cluster=apihub"), // select pods with label "olric-cluster=apihub"
		}

		// TODO: try to get from replica set via kube client
		rc := getReplicaCount(replicaCount)
		log.Infof("replicaCount is set to %d", rc)

		cfg.PartitionCount = uint64(rc * 4)
		cfg.ReplicaCount = rc

		cfg.MemberCountQuorum = int32(rc)
		cfg.BootstrapTimeout = 60 * time.Second
		cfg.MaxJoinAttempts = 60

		return cfg, nil
	case "local":
		log.Info("Olric run in local mode")
		cfg := config.New(mode)

		cfg.LogLevel = "WARN"
		cfg.LogVerbosity = 2

		cfg.BindAddr = olricBindAddr
		cfg.BindPort = getRandomFreePort()
		cfg.MemberlistConfig.BindAddr = olricBindAddr
		cfg.MemberlistConfig.BindPort = getRandomFreePort()
		cfg.PartitionCount = 5

		aUrl, err := url.Parse(apihubUrl)
		if err != nil {
			return nil, fmt.Errorf("olric node cannot be started, apihub URL is not correct: %s", err.Error())
		}

		if !isPortFree(aUrl.Hostname(), 47376) {
			// Apihub's olric node is listening, add Apihub peer
			peer := fmt.Sprintf("%s:%d", aUrl.Hostname(), 47376)
			cfg.Peers = []string{peer}
		}

		return cfg, nil
	default:
		log.Warnf("Unknown olric discovery mode %s. Will use default \"local\" mode", mode)
		return config.New("local"), nil
	}
}

func getRandomFreePort() int {
	for {
		port := rand.Intn(48127) + 1024
		if isPortFree(olricBindAddr, port) {
			return port
		}
	}
}

func isPortFree(address string, port int) bool {
	ln, err := net.Listen("tcp", address+":"+strconv.Itoa(port))

	if err != nil {
		return false
	}

	_ = ln.Close()
	return true
}

func getMode(discoveryMode string) string {
	if discoveryMode != "" {
		return discoveryMode
	}
	return "local"
}

func getReplicaCount(replicaCount int) int {
	if replicaCount == 0 {
		return 1
	}
	return replicaCount
}

func getNamespace(namespace string) (string, error) {
	if namespace == "" {
		return "", fmt.Errorf("NAMESPACE env is not set")
	}

	return namespace, nil
}
