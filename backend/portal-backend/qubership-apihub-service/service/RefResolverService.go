// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type RefResolverService interface {
	CalculateBuildConfigRefs(refs []view.BCRef, resolveRefs bool, resolveConflicts bool) ([]view.BCRef, error)
}

func NewRefResolverService(publishedRepo repository.PublishedRepository) RefResolverService {
	return &refResolverServiceImpl{
		publishedRepo: publishedRepo,
	}
}

type refResolverServiceImpl struct {
	publishedRepo repository.PublishedRepository
}

func (r *refResolverServiceImpl) CalculateBuildConfigRefs(refs []view.BCRef, resolveRefs bool, resolveConflicts bool) ([]view.BCRef, error) {
	validRefs := make(map[string]struct{}, 0)
	if resolveRefs {
		uniqueRefs := make(map[string]struct{}, 0)
		for i := range refs {
			ref := &refs[i]
			versionEnt, err := r.publishedRepo.GetVersion(ref.RefId, ref.Version)
			if err != nil {
				return nil, err
			}
			if versionEnt == nil {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.ReferencedPackageVersionNotFound,
					Message: exception.ReferencedPackageVersionNotFoundMsg,
					Params:  map[string]interface{}{"package": ref.RefId, "version": ref.Version},
				}
			}
			if ref.ParentRefId != "" {
				parentVersionEnt, err := r.publishedRepo.GetVersion(ref.ParentRefId, ref.ParentVersion)
				if err != nil {
					return nil, err
				}
				if parentVersionEnt == nil {
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.ReferencedPackageVersionNotFound,
						Message: exception.ReferencedPackageVersionNotFoundMsg,
						Params:  map[string]interface{}{"package": ref.ParentRefId, "version": ref.ParentVersion},
					}
				}
				//add revision to version name
				ref.ParentVersion = view.MakeVersionRefKey(parentVersionEnt.Version, parentVersionEnt.Revision)
			}
			//add revision to version name
			ref.Version = view.MakeVersionRefKey(versionEnt.Version, versionEnt.Revision)
			validRefs[makeConfigRefUniqueKey(*ref)] = struct{}{}
			childRefs, err := r.publishedRepo.GetVersionRefsV3(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
			if err != nil {
				return nil, err
			}
			for _, childRef := range childRefs {
				configRef := view.BCRef{
					RefId:         childRef.RefPackageId,
					Version:       view.MakeVersionRefKey(childRef.RefVersion, childRef.RefRevision),
					ParentRefId:   childRef.ParentRefPackageId,
					ParentVersion: view.MakeVersionRefKey(childRef.ParentRefVersion, childRef.ParentRefRevision),
				}
				if configRef.ParentRefId == "" {
					configRef.ParentRefId = ref.RefId
				}
				if configRef.ParentVersion == "" {
					configRef.ParentVersion = ref.Version
				}
				uniqueRefKey := makeConfigRefUniqueKey(configRef)
				if _, exists := uniqueRefs[uniqueRefKey]; exists {
					continue
				}
				uniqueRefs[uniqueRefKey] = struct{}{}
				refs = append(refs, configRef)
			}
		}
	}

	uniqueRefs := make(map[string]struct{}, 0)
	uniquePackageRefs := make(map[string]struct{}, 0)
	for i := range refs {
		ref := &refs[i]
		versionEnt, err := r.publishedRepo.GetVersion(ref.RefId, ref.Version)
		if err != nil {
			return nil, err
		}
		if versionEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ReferencedPackageVersionNotFound,
				Message: exception.ReferencedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"package": ref.RefId, "version": ref.Version},
			}
		}
		if ref.ParentRefId != "" {
			parentVersionEnt, err := r.publishedRepo.GetVersion(ref.ParentRefId, ref.ParentVersion)
			if err != nil {
				return nil, err
			}
			if parentVersionEnt == nil {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.ReferencedPackageVersionNotFound,
					Message: exception.ReferencedPackageVersionNotFoundMsg,
					Params:  map[string]interface{}{"package": ref.ParentRefId, "version": ref.ParentVersion},
				}
			}
			ref.ParentVersion = view.MakeVersionRefKey(parentVersionEnt.Version, parentVersionEnt.Revision)
		}
		ref.Version = view.MakeVersionRefKey(versionEnt.Version, versionEnt.Revision)
		uniqueRefKey := makeConfigRefUniqueKey(*ref)
		if _, exists := uniqueRefs[uniqueRefKey]; exists {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.DuplicateReference,
				Message: exception.DuplicateReferenceMsg,
				Params:  map[string]interface{}{"refId": ref.RefId, "refVersion": ref.Version},
			}
		}
		uniqueRefs[uniqueRefKey] = struct{}{}
		if _, packageRefExists := uniquePackageRefs[ref.RefId]; packageRefExists && !ref.Excluded {
			if resolveConflicts {
				ref.Excluded = true
			} else {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.MultiplePackageReference,
					Message: exception.MultiplePackageReferenceMsg,
					Params:  map[string]interface{}{"refId": ref.RefId},
				}
			}
		}
		uniquePackageRefs[ref.RefId] = struct{}{}
	}
	return refs, nil
}

func makeConfigRefUniqueKey(ref view.BCRef) string {
	return fmt.Sprintf(`%v|@@|%v|@@|%v|@@|%v`, ref.RefId, ref.Version, ref.ParentRefId, ref.ParentVersion)
}
