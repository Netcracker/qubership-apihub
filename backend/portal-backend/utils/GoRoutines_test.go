package utils

import "testing"

func TestRunRecoversPanic(t *testing.T) {
	f := noPanicFuncWErr(func() error {
		panic("boom")
	})

	err := f.run()

	if err == nil {
		t.Fatal("expected error after panic, got nil")
	}

	if err.Error() != "boom" {
		t.Errorf("expected %q error, got %s", "boom", err.Error())
	}
}

func TestNoPanicFuncRunRecoversPanic(t *testing.T) {
	f := noPanicFunc(func() {
		panic("boom")
	})

	f.run()
}
