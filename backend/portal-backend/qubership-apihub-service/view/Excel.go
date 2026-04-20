package view

const SummarySheetName = "Summary"
const RestAPISheetName = "REST API"
const GraphQLSheetName = "GraphQL"
const ProtobufSheetName = "Protobuf"
const AsyncAPISheetName = "AsyncAPI"
const PackageIDColumnName = "Package ID"
const PackageNameColumnName = "Package Name"
const ServiceNameColumnName = "Service Name"
const VersionColumnName = "Version"
const PreviousVersionColumnName = "Previous Version"
const APITypeColumnName = "API Type"
const OperationTitleColumnName = "Operation Title"
const OperationPathColumnName = "Operation Path"
const OperationMethodColumnName = "Operation Method"
const ChangeDescriptionColumnName = "Change Description"
const ChangeSeverityColumnName = "Change Severity"
const OperationTypeColumnName = "Operation Type"
const TagColumnName = "Tag"
const KindColumnName = "Kind"
const DeprecatedColumnName = "Deprecated"
const OperationActionColumnName = "Operation Action"
const DeprecatedSinceColumnName = "Deprecated Since"
const DeprecatedDescriptionColumnName = "Deprecated Description"
const AdditionalInformationColumnName = "Additional Information"
const APIKindColumnName = "API Kind"
const OperationChannelColumnName = "Channel"
const OperationProtocolColumnName = "Protocol"
const AsyncAPIActionColumnName = "Action"
const AsyncOperationIdColumnName = "Async Operation ID"
const MessageIdColumnName = "Message ID"

const ShareabilityReportSheetName = "Shareability Report"
const ShareabilityReportColPackageName = "Package Name"
const ShareabilityReportColDocumentName = "Document Name"
const ShareabilityReportColShareability = "Shareability"
const ShareabilityReportColPackageId = "Package Id"
const ShareabilityReportColPackageVersion = "Package Version"
const ShareabilityReportColSlug = "Slug"

type ShareabilityReportRow struct {
	PackageName    string
	DocumentName   string
	Shareability   string
	PackageId      string
	PackageVersion string
	Slug           string
	//set by the parser, unused by the writer; used for better error handling
	XlsxRowNumber int
}
