// Copyright 2014 Martin Schnabel. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package ot

import "fmt"

// ServerDoc represents shared document with revision history.
type ServerDoc struct {
	Doc     *Doc
	History []Ops
}

// Recv transforms, applies, and returns client ops and its revision.
// An error is returned if the ops could not be applied.
// Sending the derived ops to connected clients is the caller's responsibility.
func (s *ServerDoc) Recv(rev int, ops Ops) (Ops, error) {
	if rev < 0 || len(s.History) < rev {
		return nil, fmt.Errorf("Revision not in history")
	}
	var err error
	// transform ops against all operations that happened since rev
	for _, other := range s.History[rev:] {
		if ops, _, err = Transform(ops, other); err != nil {
			return nil, err
		}
	}
	// apply to document
	if err = s.Doc.Apply(ops); err != nil {
		return nil, err
	}
	s.History = append(s.History, ops)
	return ops, nil
}

func (s *ServerDoc) Rev() int {
	return len(s.History)
}
