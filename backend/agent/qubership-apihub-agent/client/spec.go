package client

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/utils"
)

func GetRawGraphqlIntrospectionFromUrl(url string, timeout time.Duration) ([]byte, error) {
	client := utils.MakeDiscoveryHttpClient(timeout)

	start := time.Now()
	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {

		utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw graphql introspection from URL %s with err %s", url, err))
		return nil, err
	}
	if resp.StatusCode != 200 {
		utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw graphql introspection from URL %s with resp code %d", url, resp.StatusCode))
		return nil, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.FailedToDownloadSpec,
			Message: exception.FailedToDownloadSpecMsg,
			Params:  map[string]interface{}{"code": strconv.Itoa(resp.StatusCode)},
			Debug:   fmt.Sprintf("unable to get graphql introspection from url %s: incorrect response code: %d", url, resp.StatusCode),
		}
	}
	defer resp.Body.Close()
	bytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw graphql introspection from URL %s with body read err %s", url, err))
		return nil, err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw graphql introspection from URL %s", url))
	return bytes, nil
}

func GetRawDocumentFromUrl(url, documentType string, timeout time.Duration) ([]byte, error) {
	client := utils.MakeDiscoveryHttpClient(timeout)
	start := time.Now()
	resp, err := client.Get(url)
	if err != nil {
		utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw document from URL %s with err %s", url, err))
		return nil, err
	}
	if resp.StatusCode != 200 {
		utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw document from URL %s with resp code %d", url, resp.StatusCode))
		return nil, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.FailedToDownloadDocument,
			Message: exception.FailedToDownloadDocumentMsg,
			Params:  map[string]interface{}{"code": strconv.Itoa(resp.StatusCode)},
			Debug:   fmt.Sprintf("unable to get document with type - %s from url %s: incorrect response code: %d", documentType, url, resp.StatusCode),
		}
	}
	defer resp.Body.Close()
	bytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw document from URL %s with body read err %s", url, err))
		return nil, err
	}
	utils.PerfLog(time.Since(start).Milliseconds(), timeout.Milliseconds()+500, fmt.Sprintf("Get raw document from URL %s", url))
	return bytes, nil
}
