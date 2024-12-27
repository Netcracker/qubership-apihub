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
	"os"
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

func NewOlricProvider() (OlricProvider, error) {
	prov := &olricProviderImpl{wg: sync.WaitGroup{}}

	var err error
	gob.Register(map[string]interface{}{})
	prov.cfg, err = getConfig()
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

func getConfig() (*config.Config, error) {
	mode := getMode()
	switch mode {
	case "lan":
		log.Info("Olric run in cloud mode")
		cfg := config.New(mode)

		cfg.LogLevel = "WARN"
		cfg.LogVerbosity = 2

		namespace, err := getNamespace()
		if err != nil {
			return nil, err
		}

		cloudDiscovery := &discovery.CloudDiscovery{}
		labelSelector := fmt.Sprintf("name=%s", getServiceName())
		cfg.ServiceDiscovery = map[string]interface{}{
			"plugin":   cloudDiscovery,
			"provider": "k8s",
			"args":     fmt.Sprintf("namespace=%s label_selector=\"%s\"", namespace, labelSelector),
		}

		// TODO: try to get from replica set via kube client
		replicaCount := getReplicaCount()
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

		cfg.BindAddr = "localhost"

		cfg.BindPort = getRandomFreePort()
		cfg.MemberlistConfig.BindPort = getRandomFreePort()
		cfg.PartitionCount = 5

		return cfg, nil
	default:
		log.Warnf("Unknown olric discovery mode %s. Will use default \"local\" mode", mode)
		return config.New("local"), nil
	}
}

func getRandomFreePort() int {
	for {
		port := rand.Intn(48127) + 1024
		if isPortFree("localhost", port) {
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

func getMode() string {
	olricCacheMode, exists := os.LookupEnv("OLRIC_DISCOVERY_MODE")
	if exists {
		return olricCacheMode
	}

	return "local"
}

func getReplicaCount() int {
	replicaCountStr, exists := os.LookupEnv("OLRIC_REPLICA_COUNT")
	if exists {
		rc, err := strconv.Atoi(replicaCountStr)
		if err != nil {
			log.Errorf("Invalid OLRIC_REPLICA_COUNT env value, expecting int. Replica count set to 1.")
			return 1
		}
		return rc
	}
	return 1
}

func getNamespace() (string, error) {
	ns, exists := os.LookupEnv("NAMESPACE")
	if !exists {
		return "", fmt.Errorf("NAMESPACE env is not set")
	}
	return ns, nil
}

func getServiceName() string {
	return "apihub-backend"
}
