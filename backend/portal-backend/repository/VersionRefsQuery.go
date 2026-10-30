package repository

import (
	"github.com/go-pg/pg/v10/orm"
)

// versionWithRefsCTE selects the target version triple together with all its non-excluded,
// non-deleted references, so a dashboard aggregates the rows of every referenced package version.
// The query takes six positional arguments: packageId, version, revision — twice.
const versionWithRefsCTE = `
with versions as (
	select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
	from published_version_reference s
	inner join published_version pv
	on pv.package_id = s.reference_id
	and pv.version = s.reference_version
	and pv.revision = s.reference_revision
	and pv.deleted_at is null
	where s.package_id = ?
	and s.version = ?
	and s.revision = ?
	and s.excluded = false
	union
	select ? as package_id, ? as version, ? as revision
)`

// comparisonIdWithRefsCondition matches rows of the given comparison and of every comparison
// listed in its refs (a dashboard comparison stores its per-reference comparisons there, same as
// OperationRepository.GetChangelog). The condition takes the comparison id twice.
const comparisonIdWithRefsCondition = `comparison_id in (
	select unnest(array_append(refs, ?)) from version_comparison where comparison_id = ?
	)`

// joinVersionRefs joins the model rows to the target version and all its non-excluded references
// (dashboard aggregation, same shape as OperationRepository.GetOperations), optionally narrowed to
// a single referenced package. For a plain package the refs set is empty and the join degrades to
// the version itself.
func joinVersionRefs(query *orm.Query, tableAlias string, packageId string, version string, revision int, refPackageId string) *orm.Query {
	query = query.Join(`inner join
		(with refs as(
			select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
			from published_version_reference s
			inner join published_version pv
			on pv.package_id = s.reference_id
			and pv.version = s.reference_version
			and pv.revision = s.reference_revision
			and pv.deleted_at is null
			where s.package_id = ?
			and s.version = ?
			and s.revision = ?
			and s.excluded = false
		)
		select package_id, version, revision
		from refs
		union
		select ? as package_id, ? as version, ? as revision
		) refs`, packageId, version, revision, packageId, version, revision).
		JoinOn(tableAlias + ".package_id = refs.package_id").
		JoinOn(tableAlias + ".version = refs.version").
		JoinOn(tableAlias + ".revision = refs.revision")
	if refPackageId != "" {
		query = query.JoinOn("refs.package_id = ?", refPackageId)
	}
	return query
}
