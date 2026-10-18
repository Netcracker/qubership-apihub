package service

import (
	"errors"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"testing"
	"time"
)

func TestCalculateExpiresAt_NoLimit(t *testing.T) {
	expiresAt, err := calculateExpiresAt(-1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !expiresAt.IsZero() {
		t.Errorf("expected zero time, got %v", expiresAt)
	}
}

func TestCalculateExpiresAt_InvalidDays(t *testing.T) {
	testCases := []struct {
		name string
		days int
	}{
		{"Zero", 0},
		{"NegativeTwo", -2},
		{"NegativeFive", -5},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			expiresAt, err := calculateExpiresAt(tc.days)
			if !expiresAt.IsZero() {
				t.Error("expected zero time")
			}
			if err == nil {
				t.Fatal("expected error, got nil")
			}

			var customErr exception.CustomError
			ok := errors.As(err, &customErr)
			if !ok {
				t.Fatalf("expected CustomError, got %T", err)
			}

			if customErr.Status != 400 {
				t.Errorf("expected status 400, got %d", customErr.Status)
			}
			if customErr.Code != exception.PersonalAccessTokenIncorrectExpiry {
				t.Errorf("expected error code %v, got %v", exception.PersonalAccessTokenIncorrectExpiry, customErr.Code)
			}
			if customErr.Message != exception.PersonalAccessTokenIncorrectExpiryMsg {
				t.Errorf("expected message %q, got %q", exception.PersonalAccessTokenIncorrectExpiryMsg, customErr.Message)
			}
			param, ok := customErr.Params["param"]
			if !ok {
				t.Fatal("expected 'param' in error Params")
			}
			if param != "daysUntilExpiry" {
				t.Errorf("expected param 'daysUntilExpiry', got %v", param)
			}
		})
	}
}

func TestCalculateExpiresAt_ValidDays(t *testing.T) {
	testCases := []struct {
		name string
		days int
	}{
		{"OneDay", 1},
		{"FiveDays", 5},
		{"TenDays", 10},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			now := time.Now()
			expiresAt, err := calculateExpiresAt(tc.days)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			expected := now.Add(time.Duration(tc.days) * 24 * time.Hour)
			delta := 2 * time.Second // Allowing a 2-second delta for execution time

			minExpected := expected.Add(-delta)
			maxExpected := expected.Add(delta)

			if expiresAt.Before(minExpected) || expiresAt.After(maxExpected) {
				t.Errorf("expiresAt %v is not within %v of expected %v", expiresAt, delta, expected)
			}
		})
	}
}
