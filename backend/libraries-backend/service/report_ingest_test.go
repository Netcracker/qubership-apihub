package service

import (
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

func boolPtr(value bool) *bool {
	return &value
}

func TestErasedMethodId(t *testing.T) {
	tests := []struct {
		name   string
		member string
		want   string
	}{
		{
			name:   "a method drops its return type",
			member: "java.lang.String getName(int, boolean)",
			want:   "getName(int, boolean)",
		},
		{
			name:   "a generic return type is dropped as one token",
			member: "java.util.List<java.lang.String> names()",
			want:   "names()",
		},
		{
			name:   "a constructor has no return type to drop",
			member: "ObjectMapper(com.fasterxml.jackson.core.JsonFactory)",
			want:   "ObjectMapper(com.fasterxml.jackson.core.JsonFactory)",
		},
		{
			name:   "a member without parentheses is used as it is",
			member: "int MAX_VALUE",
			want:   "int MAX_VALUE",
		},
		{
			name:   "an empty member stays empty",
			member: "",
			want:   "",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := erasedMethodId(test.member); got != test.want {
				t.Errorf("got %q, want %q", got, test.want)
			}
		})
	}
}

// Two overloads of one method must not collapse onto one id, or the second would violate the primary key of
// library_method.
func TestErasedMethodIdSeparatesOverloads(t *testing.T) {
	first := erasedMethodId("void writeValue(java.io.File, java.lang.Object)")
	second := erasedMethodId("void writeValue(java.io.OutputStream, java.lang.Object)")
	if first == second {
		t.Errorf("overloads share the id %q", first)
	}
}

// A return-type change must not change the id, which is what makes a method traceable across versions.
func TestErasedMethodIdSurvivesAReturnTypeChange(t *testing.T) {
	before := erasedMethodId("java.lang.Object read(java.io.File)")
	after := erasedMethodId("java.lang.String read(java.io.File)")
	if before != after {
		t.Errorf("the id changed with the return type: %q then %q", before, after)
	}
}

func TestMethodNameOf(t *testing.T) {
	tests := []struct{ member, want string }{
		{"java.lang.String getName(int)", "getName"},
		{"ObjectMapper()", "ObjectMapper"},
		{"int MAX_VALUE", "MAX_VALUE"},
		{"", ""},
	}
	for _, test := range tests {
		if got := methodNameOf(test.member); got != test.want {
			t.Errorf("methodNameOf(%q) = %q, want %q", test.member, got, test.want)
		}
	}
}

func TestPackageNameOf(t *testing.T) {
	tests := []struct{ qualifiedName, want string }{
		{"com.fasterxml.jackson.databind.ObjectMapper", "com.fasterxml.jackson.databind"},
		{"ObjectMapper", ""},
		{"a.B", "a"},
	}
	for _, test := range tests {
		if got := packageNameOf(test.qualifiedName); got != test.want {
			t.Errorf("packageNameOf(%q) = %q, want %q", test.qualifiedName, got, test.want)
		}
	}
}

func TestSeverityOf(t *testing.T) {
	tests := []struct {
		name   string
		change view.ApiChange
		want   view.ChangeSeverity
	}{
		{
			name:   "a breaking change is breaking whatever its codes say",
			change: view.ApiChange{Breaking: true, ChangeTypes: []string{"ANNOTATION_DEPRECATED_ADDED"}},
			want:   view.ChangeSeverityBreaking,
		},
		{
			name:   "only annotation codes make an annotation change",
			change: view.ApiChange{ChangeTypes: []string{"ANNOTATION_ADDED", "ANNOTATION_DEPRECATED_ADDED"}},
			want:   view.ChangeSeverityAnnotation,
		},
		{
			name:   "one non-annotation code makes it non-breaking",
			change: view.ApiChange{ChangeTypes: []string{"ANNOTATION_ADDED", "METHOD_ADDED"}},
			want:   view.ChangeSeverityNonBreaking,
		},
		{
			name:   "no codes at all is non-breaking, not annotation",
			change: view.ApiChange{},
			want:   view.ChangeSeverityNonBreaking,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := severityOf(test.change); got != test.want {
				t.Errorf("got %q, want %q", got, test.want)
			}
		})
	}
}

func TestChangeTypeOf(t *testing.T) {
	tests := []struct {
		name   string
		change view.ApiChange
		want   view.ChangeType
	}{
		{
			name:   "new",
			change: view.ApiChange{Status: view.ChangeStatusNew},
			want:   view.ChangeTypeAdded,
		},
		{
			name:   "removed",
			change: view.ApiChange{Status: view.ChangeStatusRemoved},
			want:   view.ChangeTypeRemoved,
		},
		{
			name:   "modified",
			change: view.ApiChange{Status: view.ChangeStatusModified},
			want:   view.ChangeTypeChanged,
		},
		{
			name: "a newly deprecated element is reported as deprecated, not as changed",
			change: view.ApiChange{
				Status:      view.ChangeStatusModified,
				ChangeTypes: []string{view.DeprecatedChangeType},
			},
			want: view.ChangeTypeDeprecated,
		},
		{
			name: "removal wins over a deprecation marker",
			change: view.ApiChange{
				Status:      view.ChangeStatusRemoved,
				ChangeTypes: []string{view.DeprecatedChangeType},
			},
			want: view.ChangeTypeRemoved,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := changeTypeOf(test.change); got != test.want {
				t.Errorf("got %q, want %q", got, test.want)
			}
		})
	}
}

func TestIsReportableChange(t *testing.T) {
	unchanged := view.ApiChange{Status: view.ChangeStatusUnchanged}
	if isReportableChange(unchanged) {
		t.Error("an unchanged element with no codes should not be reported")
	}

	annotated := view.ApiChange{Status: view.ChangeStatusUnchanged, ChangeTypes: []string{"ANNOTATION_ADDED"}}
	if !isReportableChange(annotated) {
		t.Error("an unchanged element that gained an annotation should be reported")
	}

	modified := view.ApiChange{Status: view.ChangeStatusModified}
	if !isReportableChange(modified) {
		t.Error("a modified element should be reported")
	}
}

func TestMakeChangeEntityScopesMembers(t *testing.T) {
	method := view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeMethod,
		Member:      "void run(int)",
		Status:      view.ChangeStatusRemoved,
		Breaking:    true,
	}
	entity, err := makeChangeEntity("cmp-1", method)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if entity.MethodId != "run(int)" {
		t.Errorf("method change has methodId %q, want %q", entity.MethodId, "run(int)")
	}
	if entity.ClassId != "com.example.Service" {
		t.Errorf("method change has classId %q", entity.ClassId)
	}

	// A field has no row in library_method, so it is recorded as a class-level change and the member is
	// kept in the details instead.
	field := view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeField,
		Member:      "int retries",
		Status:      view.ChangeStatusRemoved,
	}
	entity, err = makeChangeEntity("cmp-1", field)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if entity.MethodId != "" {
		t.Errorf("field change has methodId %q, want it empty", entity.MethodId)
	}
	if entity.Details["member"] != "int retries" {
		t.Errorf("field change lost its member: %v", entity.Details["member"])
	}
}

// Re-running the same diff must produce the same change ids, so a stored comparison can be replaced without
// every change looking new.
func TestMakeChangeEntityIdIsStable(t *testing.T) {
	change := view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeMethod,
		Member:      "void run(int)",
		Status:      view.ChangeStatusRemoved,
	}
	first, err := makeChangeEntity("cmp-1", change)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	second, err := makeChangeEntity("cmp-2", change)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if first.ChangeId != second.ChangeId {
		t.Errorf("the change id is not stable: %q then %q", first.ChangeId, second.ChangeId)
	}

	other := change
	other.Member = "void run(long)"
	third, err := makeChangeEntity("cmp-1", other)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if first.ChangeId == third.ChangeId {
		t.Error("two different members share one change id")
	}
}

func TestInventoryBuilder(t *testing.T) {
	builder := newInventoryBuilder("lib-1", "2.0.0")
	builder.add(view.ApiChange{
		ClassName:        "com.example.Service",
		ElementType:      view.ElementTypeInterface,
		Status:           view.ChangeStatusUnchanged,
		BinaryCompatible: boolPtr(true),
	})
	builder.add(view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeMethod,
		Member:      "void run(int)",
		Status:      view.ChangeStatusUnchanged,
	})
	builder.add(view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeMethod,
		Member:      "void run(long)",
		Status:      view.ChangeStatusUnchanged,
	})
	builder.add(view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeField,
		Member:      "int retries",
		Status:      view.ChangeStatusUnchanged,
	})
	// A member whose erased id repeats is dropped rather than breaking the primary key.
	builder.add(view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeMethod,
		Member:      "int run(int)",
		Status:      view.ChangeStatusUnchanged,
	})
	// A class with no class-level entry still gets a row, so its methods have a parent.
	builder.add(view.ApiChange{
		ClassName:   "com.example.Helper",
		ElementType: view.ElementTypeMethod,
		Member:      "void help()",
		Status:      view.ChangeStatusUnchanged,
	})
	// An entry without a class name has nothing to hang off.
	builder.add(view.ApiChange{ElementType: view.ElementTypeMethod, Member: "void orphan()"})

	content, err := builder.build()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(content.Classes) != 2 {
		t.Fatalf("got %d classes, want 2: %+v", len(content.Classes), content.Classes)
	}
	service := content.Classes[0]
	if service.ClassId != "com.example.Service" || service.Kind != string(view.ClassKindInterface) {
		t.Errorf("unexpected class row: %+v", service)
	}
	if service.PackageName != "com.example" {
		t.Errorf("got package name %q, want %q", service.PackageName, "com.example")
	}
	if content.Classes[1].Kind != string(view.ClassKindClass) {
		t.Errorf("a class without a class-level entry should default to 'class', got %q", content.Classes[1].Kind)
	}

	if len(content.Methods) != 3 {
		t.Fatalf("got %d methods, want 3: %+v", len(content.Methods), content.Methods)
	}
	for _, method := range content.Methods {
		if method.LibraryId != "lib-1" || method.Version != "2.0.0" {
			t.Errorf("method row is not keyed on the version: %+v", method)
		}
		if method.DataHash == "" {
			t.Errorf("method row has no data hash: %+v", method)
		}
	}

	// Every class and method row must point at a data row that the same write provides.
	hashes := map[string]bool{}
	for _, data := range content.ClassData {
		hashes[data.DataHash] = true
	}
	for _, class := range content.Classes {
		if !hashes[class.DataHash] {
			t.Errorf("class %s references data %s that is not written", class.ClassId, class.DataHash)
		}
	}
	methodHashes := map[string]bool{}
	for _, data := range content.MethodData {
		methodHashes[data.DataHash] = true
	}
	for _, method := range content.Methods {
		if !methodHashes[method.DataHash] {
			t.Errorf("method %s references data %s that is not written", method.MethodId, method.DataHash)
		}
	}
}

// Identical bodies must share one content-addressed row, which is the point of the data tables.
func TestInventoryBuilderDeduplicatesData(t *testing.T) {
	builder := newInventoryBuilder("lib-1", "1.0.0")
	for _, className := range []string{"com.example.A", "com.example.B"} {
		builder.add(view.ApiChange{
			ClassName:   className,
			ElementType: view.ElementTypeMethod,
			Member:      "void run()",
			Status:      view.ChangeStatusUnchanged,
		})
	}

	content, err := builder.build()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(content.Methods) != 2 {
		t.Fatalf("got %d methods, want 2", len(content.Methods))
	}
	if len(content.MethodData) != 1 {
		t.Errorf("got %d method data rows, want 1", len(content.MethodData))
	}
	if content.Methods[0].DataHash != content.Methods[1].DataHash {
		t.Error("identical method bodies do not share a data row")
	}
}

func TestPreviousVersionOf(t *testing.T) {
	build := buildEntityFor("2.0.0", map[string]interface{}{})
	report := view.DiffReport{Artifacts: []view.ArtifactReport{{OldVersion: "1.0.0", NewVersion: "2.0.0"}}}
	if got := previousVersionOf(build, report); got != "1.0.0" {
		t.Errorf("got %q, want %q", got, "1.0.0")
	}

	// An api-report compares an artifact with itself, so its old version is not a predecessor.
	selfReport := view.DiffReport{Artifacts: []view.ArtifactReport{{OldVersion: "2.0.0", NewVersion: "2.0.0"}}}
	fromMetadata := buildEntityFor("2.0.0", map[string]interface{}{view.BuildMetadataOldVersion: "1.5.0"})
	if got := previousVersionOf(fromMetadata, selfReport); got != "1.5.0" {
		t.Errorf("got %q, want the metadata fallback %q", got, "1.5.0")
	}

	if got := previousVersionOf(build, view.DiffReport{}); got != "" {
		t.Errorf("got %q, want an empty result", got)
	}
}

func buildEntityFor(version string, metadata map[string]interface{}) entity.BuildEntity {
	return entity.BuildEntity{
		BuildId:   "build-1",
		LibraryId: "lib-1",
		Version:   version,
		BuildType: string(view.BuildTypeJavaApiDiff),
		Metadata:  metadata,
	}
}

// The point of the content-addressed tables: the same method in two versions must share one data row, so a
// library with many versions does not store its unchanged API once per version.
func TestInventoryBuilderSharesDataAcrossVersions(t *testing.T) {
	method := view.ApiChange{
		ClassName:   "com.example.Service",
		ElementType: view.ElementTypeMethod,
		Member:      "void run(int)",
		Status:      view.ChangeStatusUnchanged,
	}

	first := newInventoryBuilder("lib-1", "1.0.0")
	first.add(method)
	firstContent, err := first.build()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	second := newInventoryBuilder("lib-1", "2.0.0")
	second.add(method)
	secondContent, err := second.build()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if firstContent.Methods[0].DataHash != secondContent.Methods[0].DataHash {
		t.Error("the same method in two versions does not share a data row")
	}
	if firstContent.Classes[0].DataHash != secondContent.Classes[0].DataHash {
		t.Error("the same class in two versions does not share a data row")
	}
}
