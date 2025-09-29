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

package cache

import (
	"encoding/gob"
	"fmt"
	"math/rand"
	"net"
	"strconv"
	"sync"
	"time"

	sysconfig "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/config"
	"github.com/buraksezer/olric"
	discovery "github.com/buraksezer/olric-cloud-plugin/lib"
	"github.com/buraksezer/olric/config"
	log "github.com/sirupsen/logrus"
)

type OlricProvider interface {
	Get() *olric.Olric
	GetBindAddr() string
}

const olricBindAddr = "0.0.0.0"

type olricProviderImpl struct {
	wg     sync.WaitGroup
	cfg    *config.Config
	olricC *olric.Olric
}

func NewOlricProvider(olricConfig sysconfig.OlricConfig) (OlricProvider, error) {
	prov := &olricProviderImpl{wg: sync.WaitGroup{}}

	var err error
	gob.Register(map[string]interface{}{})
	prov.cfg, err = getConfig(olricConfig)
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

func getConfig(olricConfig sysconfig.OlricConfig) (*config.Config, error) {
	mode := olricConfig.DiscoveryMode
	switch mode {
	case "lan":
		log.Info("Olric run in cloud mode")
		cfg := config.New(mode)

		cfg.LogLevel = "WARN"
		cfg.LogVerbosity = 2

		namespace := olricConfig.Namespace
		if namespace == "" {
			return nil, fmt.Errorf("namespace is not set")
		}

		cloudDiscovery := &discovery.CloudDiscovery{}
		cfg.ServiceDiscovery = map[string]interface{}{
			"plugin":   cloudDiscovery,
			"provider": "k8s",
			"args":     fmt.Sprintf("namespace=%s label_selector=\"%s\"", namespace, "olric-cluster=apihub"), // select pods with label "olric-cluster=apihub"
		}

		// TODO: try to get from replica set via kube client
		replicaCount := olricConfig.ReplicaCount
		log.Infof("replicaCount is set to %d", replicaCount)

		cfg.PartitionCount = uint64(replicaCount * 4)
		cfg.ReplicaCount = replicaCount

		cfg.MemberCountQuorum = int32(replicaCount)
		cfg.BootstrapTimeout = 60 * time.Second
		cfg.MaxJoinAttempts = 60

		return cfg, nil
	case "local":
		log.Info("Olric run in local mode")
		cfg := config.New(mode)

		cfg.LogLevel = "WARN"
		cfg.LogVerbosity = 2

		cfg.BindAddr = olricBindAddr
		cfg.BindPort = getLocalPort()
		cfg.MemberlistConfig.BindAddr = olricBindAddr
		cfg.MemberlistConfig.BindPort = getLocalMemberlistPort()
		cfg.PartitionCount = 5

		return cfg, nil
	default:
		log.Warnf("Unknown olric discovery mode %s. Will use default \"local\" mode", mode)
		return config.New("local"), nil
	}
}

func getLocalPort() int {
	//try specific port first
	port := 47375
	if isPortFree(olricBindAddr, port) {
		return port
	}
	//and if fails, then random
	return getLocalRandomFreePort()
}
func getLocalMemberlistPort() int {
	//try specific port first
	port := 47376
	if isPortFree(olricBindAddr, port) {
		return port
	}
	//and if fails, then random
	return getLocalRandomFreePort()
}

func getLocalRandomFreePort() int {
	for {
		port := rand.Intn(48127) + 1024
		if isPortFree(olricBindAddr, port) {
			return port
		}
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
