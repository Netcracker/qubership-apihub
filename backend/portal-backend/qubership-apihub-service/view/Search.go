package view

import "time"

const SearchLevelOperations = "operations"
const SearchLevelPackages = "packages"
const SearchLevelDocuments = "documents"

const ScopeAll = "all"

type PublicationDateInterval struct {
	// TODO: probably user's timezone is required to handle dates properly
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

type OperationSearchParams struct {
	ApiType        string   `json:"apiType"`
	Methods        []string `json:"methods"`
	OperationTypes []string `json:"operationTypes"`
}

type SearchQueryReq_deprecated struct {
	SearchString            string                  `json:"searchString" validate:"required"`
	PackageIds              []string                `json:"packageIds"`
	Versions                []string                `json:"versions"`
	Statuses                []string                `json:"statuses"`
	PublicationDateInterval PublicationDateInterval `json:"creationDateInterval"`
	OperationSearchParams   *OperationSearchParams  `json:"operationParams"`
	Limit                   int                     `json:"-"`
	Page                    int                     `json:"-"`
}

type SearchQueryReq struct {
	SearchString            string                  `json:"searchString" validate:"required"`
	ApiType                 string                  `json:"apiType" validate:"required"`
	Workspace               string                  `json:"workspace" validate:"required"`
	Status                  string                  `json:"status" validate:"required"`
	PackageIds              []string                `json:"packageIds"`
	Versions                []string                `json:"versions"`
	PublicationDateInterval PublicationDateInterval `json:"creationDateInterval"`
	Limit                   int                     `json:"-"`
	Page                    int                     `json:"-"`
}

func (r SearchQueryReq) ToDeprecated() SearchQueryReq_deprecated {
	req := SearchQueryReq_deprecated{
		SearchString:            r.SearchString,
		PackageIds:              r.PackageIds,
		Versions:                r.Versions,
		PublicationDateInterval: r.PublicationDateInterval,
		Limit:                   r.Limit,
		Page:                    r.Page,
	}
	if r.Status != "" {
		req.Statuses = []string{r.Status}
	}
	return req
}

type SearchResult struct {
	Operations *[]interface{}          `json:"operations,omitempty"`
	Packages   *[]PackageSearchResult  `json:"packages,omitempty"`
	Documents  *[]DocumentSearchResult `json:"documents,omitempty"`
}

type OperationSearchWeightsDebug struct {
	ScopeWeight              float64 `json:"scopeWeight"`
	ScopeTf                  float64 `json:"scopeTf"`
	TitleTf                  float64 `json:"titleTf"`
	VersionStatusTf          float64 `json:"versionStatusTf"`
	OperationOpenCountWeight float64 `json:"operationOpenCountWeight"`
	OperationOpenCount       float64 `json:"operationOpenCount"`
}

type CommonOperationSearchResult_deprecated struct {
	PackageId      string   `json:"packageId"`
	PackageName    string   `json:"name"`
	ParentPackages []string `json:"parentPackages"`
	VersionStatus  string   `json:"status"`
	Version        string   `json:"version"`
	Title          string   `json:"title"`

	//debug
	Debug OperationSearchWeightsDebug `json:"debug,omitempty"`
}

type CommonOperationSearchResult struct {
	PackageId      string   `json:"packageId"`
	PackageName    string   `json:"name"`
	ParentPackages []string `json:"parentPackages"`
	VersionStatus  string   `json:"status"`
	Version        string   `json:"version"`
	Title          string   `json:"title"`
}

type RestOperationSearchResult_deprecated struct {
	RestOperationView
	CommonOperationSearchResult_deprecated
}

type RestOperationSearchResult struct {
	RestOperationView
	CommonOperationSearchResult
}

type GraphQLOperationSearchResult_deprecated struct {
	GraphQLOperationView
	CommonOperationSearchResult_deprecated
}

type GraphQLOperationSearchResult struct {
	GraphQLOperationView
	CommonOperationSearchResult
}

type AsyncAPIOperationSearchResult struct {
	AsyncAPIOperationView
	CommonOperationSearchResult
}

type PackageSearchWeightsDebug struct {
	PackageIdTf            float64 `json:"packageIdTf"`
	PackageNameTf          float64 `json:"packageNameTf"`
	PackageDescriptionTf   float64 `json:"packageDescriptionTf"`
	PackageServiceNameTf   float64 `json:"packageServiceNameTf"`
	VersionTf              float64 `json:"versionTf"`
	VersionLabelsTf        float64 `json:"versionLabelsTf"`
	DefaultVersionTf       float64 `json:"defaultVersionTf"`
	VersionStatusTf        float64 `json:"versionStatusTf"`
	VersionOpenCountWeight float64 `json:"versionOpenCountWeight"`
	VersionOpenCount       float64 `json:"versionOpenCount"`
}

type PackageSearchResult struct {
	PackageId      string    `json:"packageId"`
	PackageName    string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	ServiceName    string    `json:"serviceName,omitempty"`
	ParentPackages []string  `json:"parentPackages"`
	Version        string    `json:"version"`
	VersionStatus  string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	Labels         []string  `json:"labels,omitempty"`
	LatestRevision bool      `json:"latestRevision,omitempty"`

	//debug
	Debug PackageSearchWeightsDebug `json:"debug,omitempty"`
}

type DocumentSearchWeightsDebug struct {
	TitleTf                 float64 `json:"titleTf"`
	LabelsTf                float64 `json:"labelsTf"`
	ContentTf               float64 `json:"contentTf"`
	VersionStatusTf         float64 `json:"versionStatusTf"`
	DocumentOpenCountWeight float64 `json:"documentOpenCountWeight"`
	DocumentOpenCount       float64 `json:"documentOpenCount"`
}

type DocumentSearchResult struct {
	PackageId      string    `json:"packageId"`
	PackageName    string    `json:"name"`
	ParentPackages []string  `json:"parentPackages"`
	Version        string    `json:"version"`
	VersionStatus  string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	Slug           string    `json:"slug"`
	Type           string    `json:"type"`
	Title          string    `json:"title"`
	Labels         []string  `json:"labels,omitempty"`
	Content        string    `json:"content,omitempty"`

	//debug
	Debug DocumentSearchWeightsDebug `json:"debug,omitempty"`
}
