package exception

const InvalidURLEscape = "6"
const InvalidURLEscapeMsg = "Failed to unescape parameter $param"

const NamespaceDoesntExist = "100"
const NamespaceDoesntExistMsg = "Namespace $namespace doesn't exist"

const RouteDoesntExist = "101"
const RouteDoesntExistMsg = "Route $route doesn't exist"

const NoApihubAccess = "200"
const NoApihubAccessMsg = "No access to Apihub with code: $code. Not sufficient rights or incorrect agent configuration(api-key)."

const FailedToDownloadSpec = "201"
const FailedToDownloadSpecMsg = "Failed to download specification. Response code: $code."

const DocumentNotFound = "202"
const DocumentNotFoundMsg = "Document not found by fileId $fileId"
const NamespaceServiceDoesntExist = "400"
const NamespaceServiceDoesntExistMsg = "Service $service doesn't exist in namespace $namespace"

const InvalidURL = "300"
const InvalidURLMsg = "Url '$url' is not a valid url"

const ProxyFailed = "500"
const ProxyFailedMsg = "Failed to proxy the request to $url"

const FailedToDownloadDocument = "510"
const FailedToDownloadDocumentMsg = "Failed to download document. Response code: $code."

const PaasOperationFailed = "600"
const PaasOperationFailedMsg = "Paas operation forbiden"

const PaasOperationFailedForbiden = "601"
const PaasOperationFailedForbidenMsg = "Paas operation forbiden"

const AgentVersionMismatch = "700"
const AgentVersionMismatchMsg = "Current version $version of Agent not supported by APIHUB. Please, update this instance to version $recommended."
