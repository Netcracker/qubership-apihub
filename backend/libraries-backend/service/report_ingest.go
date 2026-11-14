package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"

	log "github.com/sirupsen/logrus"
)

// ReportIngestService turns a finished build's report.json into the rows the read APIs serve: an API
// inventory for a java-api-report, a comparison for a java-api-diff.
type ReportIngestService interface {
	Ingest(ctx context.Context, build entity.BuildEntity, report view.DiffReport) error
}

func NewReportIngestService(
	contentRepository repository.LibraryContentRepository,
	comparisonRepository repository.ComparisonRepository,
) ReportIngestService {
	return reportIngestServiceImpl{
		contentRepository:    contentRepository,
		comparisonRepository: comparisonRepository,
	}
}

type reportIngestServiceImpl struct {
	contentRepository    repository.LibraryContentRepository
	comparisonRepository repository.ComparisonRepository
}

func (r reportIngestServiceImpl) Ingest(ctx context.Context, build entity.BuildEntity, report view.DiffReport) error {
	switch view.BuildType(build.BuildType) {
	case view.BuildTypeJavaApiReport:
		return r.ingestInventory(ctx, build, report)
	case view.BuildTypeJavaApiDiff:
		return r.ingestComparison(ctx, build, report)
	case view.BuildTypeJavaUpgradeImpact:
		// An upgrade-impact report describes the libraries a subject depends on, not this library's own
		// versions, so there is no version pair to key a comparison on. The raw report stays in
		// build_result until a reader for it exists.
		log.Infof("Build %s is an upgrade-impact report; it is stored but not indexed", build.BuildId)
		return nil
	}
	return fmt.Errorf("build %s has unknown build type '%s'", build.BuildId, build.BuildType)
}

// ingestInventory writes the API inventory of one library version. A java-api-report compares the artifact
// with itself, so every entry arrives as UNCHANGED and the entries together are the full inventory.
func (r reportIngestServiceImpl) ingestInventory(ctx context.Context, build entity.BuildEntity, report view.DiffReport) error {
	inventory := newInventoryBuilder(build.LibraryId, build.Version)
	for _, artifact := range report.Artifacts {
		for _, change := range artifact.Changes {
			inventory.add(change)
		}
	}

	content, err := inventory.build()
	if err != nil {
		return err
	}
	if err := r.contentRepository.Replace(ctx, build.LibraryId, build.Version, content); err != nil {
		return err
	}
	log.Infof("Indexed %d classes and %d methods for library %s version %s",
		len(content.Classes), len(content.Methods), build.LibraryId, build.Version)
	return nil
}

// ingestComparison writes the change list of a java-api-diff. The pair it is keyed on comes from the build
// row and the report: the build carries the new version, the report the old one.
func (r reportIngestServiceImpl) ingestComparison(ctx context.Context, build entity.BuildEntity, report view.DiffReport) error {
	previousVersion := previousVersionOf(build, report)
	if previousVersion == "" {
		return fmt.Errorf("build %s reports no previous version to key the comparison on", build.BuildId)
	}

	comparisonId := newComparisonId()
	changes := make([]entity.LibraryVersionChangeEntity, 0)
	changeCounts := map[string]int{}

	for _, artifact := range report.Artifacts {
		for _, change := range artifact.Changes {
			if !isReportableChange(change) {
				continue
			}
			changeEntity, err := makeChangeEntity(comparisonId, change)
			if err != nil {
				return err
			}
			changes = append(changes, *changeEntity)
			changeCounts[changeEntity.ChangeType]++
			changeCounts[changeEntity.Severity]++
		}
	}

	comparison := entity.LibraryVersionComparisonEntity{
		LibraryId:         build.LibraryId,
		Version:           build.Version,
		PreviousLibraryId: build.LibraryId,
		PreviousVersion:   previousVersion,
		ComparisonId:      comparisonId,
		ChangeCounts:      changeCounts,
		// Nothing in this service reviews a change, so every change counts as open. The column exists to
		// mirror portal-backend's version_comparison; revisit it when a review workflow is defined.
		OpenCount:      len(changes),
		LastActive:     time.Now(),
		NoContent:      len(changes) == 0,
		BuilderVersion: report.ToolVersion,
	}

	if err := r.comparisonRepository.Replace(ctx, comparison, changes); err != nil {
		return err
	}
	log.Infof("Stored comparison %s with %d changes for library %s %s against %s",
		comparisonId, len(changes), build.LibraryId, build.Version, previousVersion)
	return nil
}

func previousVersionOf(build entity.BuildEntity, report view.DiffReport) string {
	for _, artifact := range report.Artifacts {
		if artifact.OldVersion != "" && artifact.OldVersion != build.Version {
			return artifact.OldVersion
		}
	}
	if oldVersion, ok := build.Metadata[view.BuildMetadataOldVersion].(string); ok {
		return oldVersion
	}
	return ""
}

// isReportableChange drops the entries a diff carries only for completeness: an element that did not change
// and has no compatibility note attached to it.
func isReportableChange(change view.ApiChange) bool {
	return change.Status != view.ChangeStatusUnchanged || len(change.ChangeTypes) > 0
}

func makeChangeEntity(comparisonId string, change view.ApiChange) (*entity.LibraryVersionChangeEntity, error) {
	changeType := changeTypeOf(change)
	methodId := ""
	switch change.ElementType {
	case view.ElementTypeMethod, view.ElementTypeConstructor:
		methodId = erasedMethodId(change.Member)
	}

	details := map[string]interface{}{
		"elementType": change.ElementType,
		"status":      change.Status,
		"semver":      change.Semver,
	}
	if change.Member != "" {
		details["member"] = change.Member
	}
	if len(change.ChangeTypes) > 0 {
		details["changeTypes"] = change.ChangeTypes
	}
	if change.Details != "" {
		details["details"] = change.Details
	}
	if change.BinaryCompatible != nil {
		details["binaryCompatible"] = *change.BinaryCompatible
	}
	if change.SourceCompatible != nil {
		details["sourceCompatible"] = *change.SourceCompatible
	}
	if len(change.UsedBy) > 0 {
		details["usedBy"] = change.UsedBy
	}

	// The change id is derived from what identifies the change inside its comparison, so re-running the
	// same diff produces the same ids instead of a fresh set every time.
	changeId := utils.GetEncodedChecksum([]byte(change.ClassName), []byte(change.ElementType),
		[]byte(change.Member), []byte(changeType))

	return &entity.LibraryVersionChangeEntity{
		ComparisonId: comparisonId,
		ChangeId:     changeId,
		ClassId:      change.ClassName,
		MethodId:     methodId,
		ChangeType:   string(changeType),
		Severity:     string(severityOf(change)),
		Description:  describeChange(change),
		Details:      details,
	}, nil
}

func changeTypeOf(change view.ApiChange) view.ChangeType {
	switch change.Status {
	case view.ChangeStatusNew:
		return view.ChangeTypeAdded
	case view.ChangeStatusRemoved:
		return view.ChangeTypeRemoved
	}
	if change.Deprecated() {
		return view.ChangeTypeDeprecated
	}
	return view.ChangeTypeChanged
}

// severityOf maps jdiff's compatibility verdict onto the breaking / non-breaking / annotation vocabulary
// api-diff already uses elsewhere in this repository.
func severityOf(change view.ApiChange) view.ChangeSeverity {
	if change.Breaking {
		return view.ChangeSeverityBreaking
	}
	if len(change.ChangeTypes) > 0 && onlyAnnotationChanges(change.ChangeTypes) {
		return view.ChangeSeverityAnnotation
	}
	return view.ChangeSeverityNonBreaking
}

func onlyAnnotationChanges(changeTypes []string) bool {
	for _, changeType := range changeTypes {
		if !strings.HasPrefix(changeType, view.AnnotationChangeTypePrefix) {
			return false
		}
	}
	return true
}

func describeChange(change view.ApiChange) string {
	element := change.ClassName
	if change.Member != "" {
		element += "#" + change.Member
	}
	description := fmt.Sprintf("%s %s", element, strings.ToLower(change.Status))
	if len(change.ChangeTypes) > 0 {
		description += ": " + strings.Join(change.ChangeTypes, ", ")
	}
	if change.Details != "" {
		description += " (" + change.Details + ")"
	}
	return description
}

// inventoryBuilder collects the class and method rows of one version, keeping each class's members with it
// so the stored class body stays complete.
type inventoryBuilder struct {
	libraryId string
	version   string
	order     []string
	classes   map[string]*inventoryClass
}

type inventoryClass struct {
	entry   view.ApiChange
	fields  []view.ApiChange
	methods []view.ApiChange
	// seen keeps the first entry per erased method id: an overload set shares a name but not an id, while a
	// repeated id would violate the primary key of library_method.
	seen map[string]bool
}

func newInventoryBuilder(libraryId, version string) *inventoryBuilder {
	return &inventoryBuilder{
		libraryId: libraryId,
		version:   version,
		classes:   map[string]*inventoryClass{},
	}
}

func (b *inventoryBuilder) classOf(className string) *inventoryClass {
	existing, found := b.classes[className]
	if found {
		return existing
	}
	created := &inventoryClass{seen: map[string]bool{}}
	b.classes[className] = created
	b.order = append(b.order, className)
	return created
}

func (b *inventoryBuilder) add(change view.ApiChange) {
	if change.ClassName == "" {
		return
	}
	class := b.classOf(change.ClassName)

	switch change.ElementType {
	case view.ElementTypeMethod, view.ElementTypeConstructor:
		methodId := erasedMethodId(change.Member)
		if methodId == "" || class.seen[methodId] {
			return
		}
		class.seen[methodId] = true
		class.methods = append(class.methods, change)
	case view.ElementTypeField:
		// There is no field table: fields live inside the stored class body, which keeps the inventory
		// complete without a normalised row nothing filters on.
		class.fields = append(class.fields, change)
	default:
		class.entry = change
	}
}

func (b *inventoryBuilder) build() (repository.LibraryContent, error) {
	content := repository.LibraryContent{}
	// One data row per distinct body, so a class unchanged across versions is stored once.
	classDataSeen := map[string]bool{}
	methodDataSeen := map[string]bool{}

	for _, className := range b.order {
		class := b.classes[className]

		classBody, err := json.Marshal(map[string]interface{}{
			"qualifiedName": className,
			"kind":          class.entry.ClassKind(),
			"elementType":   class.entry.ElementType,
			"details":       class.entry.Details,
			"changeTypes":   class.entry.ChangeTypes,
			"fields":        class.fields,
		})
		if err != nil {
			return content, fmt.Errorf("failed to encode the body of class %s: %w", className, err)
		}
		classDataHash := utils.CreateSHA256Hash(classBody)
		if !classDataSeen[classDataHash] {
			classDataSeen[classDataHash] = true
			content.ClassData = append(content.ClassData, entity.LibraryClassDataEntity{
				DataHash: classDataHash,
				Data:     classBody,
			})
		}

		content.Classes = append(content.Classes, entity.LibraryClassEntity{
			LibraryId:     b.libraryId,
			Version:       b.version,
			ClassId:       className,
			DataHash:      classDataHash,
			Kind:          string(class.entry.ClassKind()),
			QualifiedName: className,
			PackageName:   packageNameOf(className),
			Deprecated:    class.entry.Deprecated(),
		})

		for _, method := range class.methods {
			methodBody, err := json.Marshal(methodBodyOf(method))
			if err != nil {
				return content, fmt.Errorf("failed to encode the body of %s#%s: %w", className, method.Member, err)
			}
			methodDataHash := utils.CreateSHA256Hash(methodBody)
			if !methodDataSeen[methodDataHash] {
				methodDataSeen[methodDataHash] = true
				content.MethodData = append(content.MethodData, entity.LibraryMethodDataEntity{
					DataHash: methodDataHash,
					Data:     methodBody,
				})
			}

			content.Methods = append(content.Methods, entity.LibraryMethodEntity{
				LibraryId:  b.libraryId,
				Version:    b.version,
				ClassId:    className,
				MethodId:   erasedMethodId(method.Member),
				DataHash:   methodDataHash,
				Name:       methodNameOf(method.Member),
				Signature:  method.Member,
				Deprecated: method.Deprecated(),
			})
		}
	}
	return content, nil
}

// methodBodyOf is the stored body of one method: its signature and what jdiff says about it, without the
// class name. The class name is already on the row that points here, and leaving it out of the body is what
// lets the same method in two versions share a single content-addressed row.
func methodBodyOf(method view.ApiChange) map[string]interface{} {
	body := map[string]interface{}{
		"signature":   method.Member,
		"elementType": method.ElementType,
	}
	if method.Status != "" {
		body["status"] = method.Status
	}
	if len(method.ChangeTypes) > 0 {
		body["changeTypes"] = method.ChangeTypes
	}
	if method.Details != "" {
		body["details"] = method.Details
	}
	if method.BinaryCompatible != nil {
		body["binaryCompatible"] = *method.BinaryCompatible
	}
	if method.SourceCompatible != nil {
		body["sourceCompatible"] = *method.SourceCompatible
	}
	return body
}

func packageNameOf(qualifiedName string) string {
	lastDot := strings.LastIndex(qualifiedName, ".")
	if lastDot < 0 {
		return ""
	}
	return qualifiedName[:lastDot]
}

// erasedMethodId reduces a jdiff member signature to the part that stays stable across versions: the name
// and the parameter types. jdiff renders a method as `<returnType> <name>(<params>)` and a constructor as
// `<name>(<params>)`, so dropping the leading return type keeps the id from changing when only the return
// type does.
func erasedMethodId(member string) string {
	if member == "" {
		return ""
	}
	openParen := strings.Index(member, "(")
	if openParen < 0 {
		return member
	}
	return methodNameOf(member) + member[openParen:]
}

// methodNameOf extracts the bare method or constructor name from a jdiff member signature.
func methodNameOf(member string) string {
	head := member
	if openParen := strings.Index(member, "("); openParen >= 0 {
		head = member[:openParen]
	}
	if lastSpace := strings.LastIndex(head, " "); lastSpace >= 0 {
		return head[lastSpace+1:]
	}
	return head
}
