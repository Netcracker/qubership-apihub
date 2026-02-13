package controller

import (
	"github.com/Netcracker/qubership-apihub-test-service/exception"
	"net/http"
	"os"
)

type GraphqlController interface {
	GetGraphqlSpec(w http.ResponseWriter, r *http.Request)
	GetGraphqlIntrospection(w http.ResponseWriter, r *http.Request)
}

func NewGraphqlController(basePath string) GraphqlController {
	return &graphqlControllerImpl{basePath: basePath}
}

type graphqlControllerImpl struct {
	basePath string
}

func (o graphqlControllerImpl) GetGraphqlSpec(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/schema.graphql")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Write(bytes)
}

func (o graphqlControllerImpl) GetGraphqlIntrospection(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/gql_introspection.json")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(bytes)
}
