package view

type ClassKind string

const (
	ClassKindClass      ClassKind = "class"
	ClassKindInterface  ClassKind = "interface"
	ClassKindEnum       ClassKind = "enum"
	ClassKindAnnotation ClassKind = "annotation"
	ClassKindRecord     ClassKind = "record"
)

func (k ClassKind) Valid() bool {
	switch k {
	case ClassKindClass, ClassKindInterface, ClassKindEnum, ClassKindAnnotation, ClassKindRecord:
		return true
	}
	return false
}

// LibraryClass is one class of a library version's parsed API inventory.
type LibraryClass struct {
	ClassId       string    `json:"classId"`
	Kind          ClassKind `json:"kind"`
	QualifiedName string    `json:"qualifiedName"`
	PackageName   string    `json:"packageName,omitempty"`
	Modifiers     []string  `json:"modifiers,omitempty"`
	Deprecated    bool      `json:"deprecated"`
	// Data is the full parsed class body, stored content-addressed so an unchanged class is shared
	// between versions instead of duplicated.
	Data []byte `json:"-"`
}

// LibraryMethod is one method or constructor of a class in a library version's inventory.
type LibraryMethod struct {
	ClassId    string   `json:"classId"`
	MethodId   string   `json:"methodId"`
	Name       string   `json:"name"`
	Signature  string   `json:"signature"`
	Modifiers  []string `json:"modifiers,omitempty"`
	Deprecated bool     `json:"deprecated"`
	Data       []byte   `json:"-"`
}
