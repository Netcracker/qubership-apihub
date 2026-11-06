package service

import (
	"testing"
	"time"
)

func TestTtlCacheExpires(t *testing.T) {
	c := newTtlCache[string](time.Minute)
	now := time.Now()
	c.now = func() time.Time { return now }
	c.Put("k", "v")
	if v, ok := c.Get("k"); !ok || v != "v" {
		t.Fatal("expected hit")
	}
	now = now.Add(2 * time.Minute)
	if _, ok := c.Get("k"); ok {
		t.Fatal("expected expiry")
	}
	disabled := newTtlCache[string](0)
	disabled.Put("k", "v")
	if _, ok := disabled.Get("k"); ok {
		t.Fatal("zero TTL must disable caching")
	}
}

func TestNormalizeFilePath(t *testing.T) {
	for in, want := range map[string]string{
		"images/a.png":   "images/a.png",
		"/images/a.png":  "images/a.png",
		"./images/a.png": "images/a.png",
	} {
		got, err := NormalizeFilePath(in)
		if err != nil || got != want {
			t.Fatalf("%q: got %q err %v", in, got, err)
		}
	}
	for _, bad := range []string{"", "../x", "a/../../x", "a b", ".hidden"} {
		if _, err := NormalizeFilePath(bad); err == nil {
			t.Fatalf("%q must be rejected", bad)
		}
	}
}
