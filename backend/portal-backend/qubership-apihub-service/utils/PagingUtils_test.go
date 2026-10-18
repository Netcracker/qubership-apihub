package utils

import "testing"

func TestPaginateList(t *testing.T) {

	startIndex, endIndex := PaginateList(100, 10, 1)
	if startIndex != 10 || endIndex != 20 {
		t.Errorf("Expected start index: 10, end index: 20; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(100, 10, 3)
	if startIndex != 30 || endIndex != 40 {
		t.Errorf("Expected start index: 30, end index: 40; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(100, 10, 10)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(0, 10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 0, 1)
	if startIndex != 0 || endIndex != 10 {
		t.Errorf("Expected start index: 0, end index: 10; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 10, 0)
	if startIndex != 0 || endIndex != 10 {
		t.Errorf("Expected start index: 0, end index: 10; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, -10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 10, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(-10, 10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(0, -10, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(-10, 0, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, -10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 10, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(-10, 10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(0, 0, 0)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}
}
