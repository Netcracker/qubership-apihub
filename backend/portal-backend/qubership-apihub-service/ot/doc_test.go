// Copyright 2014 Martin Schnabel. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package ot

import "testing"

func TestDocPos(t *testing.T) {
	doc := NewDocFromStr("abc")
	off := doc.Pos(3, Zero)
	if !off.Valid() {
		t.Error("eof is not valid")
	}
}

func TestDocApply(t *testing.T) {
	tests := []struct {
		text string
		want string
		ops  Ops
	}{
		{"abc", "atag", Ops{
			{N: 1},
			{S: "tag"},
			{N: -2},
		}},
		{"abc\ndef", "\nabc\ndef", Ops{
			{S: "\n"},
			{N: 7},
		}},
		{"abc\ndef\nghi", "abcghi", Ops{
			{N: 3},
			{N: -5},
			{N: 3},
		}},
		{"abc\ndef\nghi", "ahoi", Ops{
			{N: 1},
			{N: -3},
			{S: "h"},
			{N: -4},
			{S: "o"},
			{N: -2},
			{N: 1},
		}},
	}
	for i, test := range tests {
		doc := NewDocFromStr(test.text)
		if err := doc.Apply(test.ops); err != nil {
			t.Errorf("test %d error: %s", i, err)
		}
		if got := doc.String(); got != test.want {
			t.Errorf("test %d want %q got %q", i, test.want, got)
		}
	}
}
