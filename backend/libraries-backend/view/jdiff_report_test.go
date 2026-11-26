package view

import "testing"

// A member entry names the kind of the member in elementType, so kind comes from classKind when the report
// carries it.
func TestApiChangeKindPrefersTheClassKind(t *testing.T) {
	change := ApiChange{
		ClassName:   "com.example.Repository",
		ElementType: ElementTypeMethod,
		ClassKind:   ElementTypeInterface,
	}
	if got := change.Kind(); got != ClassKindInterface {
		t.Errorf("got kind %q, want %q", got, ClassKindInterface)
	}
}

// A report from a worker that predates classKind still yields the kind of a class-level entry.
func TestApiChangeKindFallsBackToTheElementType(t *testing.T) {
	change := ApiChange{
		ClassName:   "com.example.OldService",
		ElementType: ElementTypeEnum,
	}
	if got := change.Kind(); got != ClassKindEnum {
		t.Errorf("got kind %q, want %q", got, ClassKindEnum)
	}
}

func TestApiChangeKindFallsBackToClass(t *testing.T) {
	change := ApiChange{
		ClassName:   "com.example.Service",
		ElementType: ElementTypeMethod,
	}
	if got := change.Kind(); got != ClassKindClass {
		t.Errorf("got kind %q, want %q", got, ClassKindClass)
	}
}
