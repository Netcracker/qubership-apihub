// Copyright 2014 Martin Schnabel. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package ot

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"unicode/utf8"
)

var Zero Pos

type Pos struct {
	Index  int
	Line   int
	Offset int
}

func (p Pos) Valid() bool {
	return p.Line >= 0 && p.Offset >= 0
}

// Doc represents a utf8-text document as lines of runes.
// All lines en in an implicit trailing newline.
type Doc struct {
	Lines [][]rune
	Size  int
}

func NewDoc(r io.Reader) (*Doc, error) {
	br := bufio.NewReader(r)
	var d Doc
	var err error
	for err == nil {
		var data []byte
		data, err = br.ReadSlice('\n')
		if err == nil {
			d.Size += 1
			data = data[:len(data)-1]
		}
		line := make([]rune, 0, utf8.RuneCount(data))
		for len(data) > 0 {
			r, rl := utf8.DecodeRune(data)
			if r == utf8.RuneError {
				return nil, fmt.Errorf("invalid rune in at %d:%d",
					len(d.Lines), len(line))
			}
			data = data[rl:]
			line = append(line, r)
		}
		d.Size += len(line)
		d.Lines = append(d.Lines, line)
	}
	if err != nil && err != io.EOF {
		return nil, err
	}
	return &d, nil
}

func NewDocFromStr(s string) *Doc {
	var d Doc
	var b int
	for i, r := range s {
		d.Size++
		if r == '\n' {
			d.Lines = append(d.Lines, []rune(s[b:i]))
			b = i + 1
		}
	}
	d.Lines = append(d.Lines, []rune(s[b:]))
	return &d
}

func (doc *Doc) Pos(index int, last Pos) Pos {
	n := index - last.Index + last.Offset
	for i, l := range doc.Lines[last.Line:] {
		if len(l) >= n {
			return Pos{index, i + last.Line, n}
		}
		n -= len(l) + 1
	}
	return Pos{index, -1, -1}
}

type posop struct {
	Pos
	Op
}

// Apply applies the operation sequence ops to the document.
// An error is returned if applying ops failed.
func (doc *Doc) Apply(ops Ops) error {
	d := doc.Lines
	p, pops := Zero, make([]posop, 0, len(ops))
	for _, op := range ops {
		switch {
		case op.N > 0:
			p = doc.Pos(p.Index+op.N, p)
			if !p.Valid() {
				return fmt.Errorf("invalid document index %d", p.Index)
			}
		case op.N < 0:
			pops = append(pops, posop{p, op})
			p = doc.Pos(p.Index-op.N, p)
			if !p.Valid() {
				return fmt.Errorf("invalid document index %d", p.Index)
			}
		case op.S != "":
			pops = append(pops, posop{p, op})
		}
	}
	/*if p.Line != len(d)-1 || p.Offset != len(d[p.Line]) {
		return fmt.Errorf("operation didn't operate on the whole document")
	}*/
	for i := len(pops) - 1; i >= 0; i-- {
		pop := pops[i]
		switch {
		case pop.N < 0:
			doc.Size += pop.N
			end := doc.Pos(pop.Index-pop.N, pop.Pos)
			if !end.Valid() {
				return fmt.Errorf("invalid document index %d", end.Index)
			}
			line := d[pop.Line]
			if pop.Line == end.Line {
				rest := line[end.Offset:]
				d[pop.Line] = append(line[:pop.Offset], rest...)
				break
			}
			rest := d[end.Line][end.Offset:]
			d[pop.Line] = append(line[:pop.Offset], rest...)
			d = append(d[:pop.Line+1], d[end.Line+1:]...)
		case pop.S != "":
			insd := NewDocFromStr(pop.S)
			doc.Size += insd.Size
			insl := insd.Lines
			line := d[pop.Line]
			last := len(insl) - 1
			insl[last] = append(insl[last], line[pop.Offset:]...)
			insl[0] = append(line[:pop.Offset], insl[0]...)
			if len(insl) == 1 {
				d[pop.Line] = insl[0]
				break
			}
			need := len(d) + len(insl) - 1
			if cap(d) < need {
				nd := make([][]rune, len(d), need)
				copy(nd, d)
				d = nd
			}
			d = d[:need]
			copy(d[pop.Line+len(insl):], d[pop.Line+1:])
			copy(d[pop.Line:], insl)
		}
	}
	doc.Lines = d
	return nil
}

func (doc Doc) Extract(from, to int) *Doc {
	off := doc.Pos(from, Zero)
	end := doc.Pos(to, off)
	if off.Line == end.Line {
		return &Doc{Lines: [][]rune{
			doc.Lines[off.Line][off.Offset:end.Offset],
		}}
	}
	nd := make([][]rune, 0, 1+end.Line-off.Line)
	nd = append(nd, doc.Lines[off.Line][off.Offset:])
	for i := off.Line + 1; i < end.Line; i++ {
		nd = append(nd, doc.Lines[i])
	}
	nd = append(nd, doc.Lines[end.Line][:end.Offset])
	return &Doc{nd, to - from}
}

func (doc Doc) WriteTo(w io.Writer) (nn int64, err error) {
	rw, ok := w.(runeWriter)
	if !ok {
		rw = bufio.NewWriter(w)
	}
	var n int
	for i, l := range doc.Lines {
		if i > 0 {
			n, err = rw.WriteRune('\n')
			nn += int64(n)
			if err != nil {
				return
			}
		}
		for _, r := range l {
			n, err = rw.WriteRune(r)
			nn += int64(n)
			if err != nil {
				return
			}
		}
	}
	return
}

func (doc Doc) String() string {
	var buf bytes.Buffer
	doc.WriteTo(&buf)
	return buf.String()
}

type runeWriter interface {
	WriteRune(rune) (int, error)
}
