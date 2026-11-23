package service

import (
	"reflect"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
)

type testMembers = map[uint64]client.ClusterMember

func testMember(id uint64, name string) client.ClusterMember {
	return client.ClusterMember{Name: name, ID: id}
}

func TestDiffMembers(t *testing.T) {
	const (
		selfID    uint64 = 1
		peerID    uint64 = 2
		newPeerID uint64 = 3
	)

	self := testMember(selfID, "self")
	peer := testMember(peerID, "peer")
	newPeer := testMember(newPeerID, "peer")

	tests := []struct {
		name       string
		previous   testMembers
		current    testMembers
		wantJoined testMembers
		wantLeft   testMembers
	}{
		{
			name:       "no change",
			previous:   testMembers{selfID: self, peerID: peer},
			current:    testMembers{selfID: self, peerID: peer},
			wantJoined: testMembers{},
			wantLeft:   testMembers{},
		},
		{
			name:       "peer left",
			previous:   testMembers{selfID: self, peerID: peer},
			current:    testMembers{selfID: self},
			wantJoined: testMembers{},
			wantLeft:   testMembers{peerID: peer},
		},
		{
			name:       "peer joined",
			previous:   testMembers{selfID: self},
			current:    testMembers{selfID: self, peerID: peer},
			wantJoined: testMembers{peerID: peer},
			wantLeft:   testMembers{},
		},
		{
			name:       "peer restarted between polls gets a new ID",
			previous:   testMembers{selfID: self, peerID: peer},
			current:    testMembers{selfID: self, newPeerID: newPeer},
			wantJoined: testMembers{newPeerID: newPeer},
			wantLeft:   testMembers{peerID: peer},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			joined, left := diffMembers(tt.previous, tt.current)
			if !reflect.DeepEqual(joined, tt.wantJoined) {
				t.Errorf("joined = %v, want %v", joined, tt.wantJoined)
			}
			if !reflect.DeepEqual(left, tt.wantLeft) {
				t.Errorf("left = %v, want %v", left, tt.wantLeft)
			}
		})
	}
}
