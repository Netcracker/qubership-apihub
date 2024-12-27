// Copyright 2014 Martin Schnabel. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package ot

import "testing"

func TestServer(t *testing.T) {
	doc := NewDocFromStr("abc")
	s := &ServerDoc{doc, nil}
	_, err := s.Recv(1, Ops{})
	if err == nil || s.Rev() != 0 {
		t.Error("expected error")
	}
	a := Ops{{N: 1}, {S: "tag"}, {N: 2}}
	a1, err := s.Recv(0, a)
	if err != nil || s.Rev() != 1 {
		t.Error(err)
	}
	if !a1.Equal(a) {
		t.Errorf("expected %v got %v", a, a1)
	}
	b1, err := s.Recv(0, Ops{{N: 1}, {N: -2}})
	if err != nil || s.Rev() != 2 {
		t.Error(err)
	}
	if !b1.Equal(Ops{{N: 4}, {N: -2}}) {
		t.Errorf("expected %v got %v", a, a1)
	}
}
