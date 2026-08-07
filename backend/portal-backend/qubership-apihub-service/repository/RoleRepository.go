package repository

import (
	"context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
)

type RoleRepository interface {
	AddPackageMemberRoles(ctx context.Context, entities []entity.PackageMemberRoleEntity) error
	DeleteDirectPackageMember(ctx context.Context, packageId string, userId string) error
	GetDirectPackageMembers(ctx context.Context, packageId string) ([]entity.PackageMemberRoleEntity, error)
	GetDirectPackageMember(ctx context.Context, packageId string, userId string) (*entity.PackageMemberRoleEntity, error)
	RemoveRoleFromPackageMember(ctx context.Context, packageId string, userId string, roleId string) error
	GetPackageRolesHierarchyForUser(ctx context.Context, packageId string, userId string) ([]entity.PackageMemberRoleRichEntity, error)
	GetPackageHierarchyMembers(ctx context.Context, packageId string) ([]entity.PackageMemberRoleRichEntity, error)
	GetAvailablePackageRoles(ctx context.Context, packageId string, userId string) ([]entity.RoleEntity, error)
	GetUserSystemRole(ctx context.Context, userId string) (*entity.SystemRoleEntity, error)
	SetUserSystemRole(ctx context.Context, userId string, role string) error
	DeleteUserSystemRole(ctx context.Context, userId string) error
	GetAllRoles(ctx context.Context) ([]entity.RoleEntity, error)
	CreateRole(ctx context.Context, roleEntity entity.RoleEntity) error
	UpdateRolePermissions(ctx context.Context, roleId string, permissions []string) error
	DeleteRole(ctx context.Context, roleId string) error
	GetRole(ctx context.Context, roleId string) (*entity.RoleEntity, error)
	GetPermissionsForRoles(ctx context.Context, roles []string) ([]string, error)
	GetUserPermissions(ctx context.Context, packageId string, userId string) ([]string, error)
	GetAllUserPermissions(ctx context.Context, userId string) ([]string, error)
	SetRoleRanks(ctx context.Context, entities []entity.RoleEntity) error
	GetUsersBySystemRole(ctx context.Context, systemRole string) ([]entity.UserEntity, error)
}

func NewRoleRepository(cp db.ConnectionProvider) RoleRepository {
	return &roleRepositoryImpl{cp: cp}
}

type roleRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r roleRepositoryImpl) AddPackageMemberRoles(ctx context.Context, entities []entity.PackageMemberRoleEntity) error {
	if len(entities) == 0 {
		return nil
	}
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(&entities).
			OnConflict(`
		(package_id, user_id) do update 
		set updated_by = excluded.updated_by,
			updated_at = excluded.updated_at,
			roles = array(select distinct unnest(package_member_role.roles || excluded.roles))`).
			Insert()
		if err != nil {
			return err
		}
		//user is not allowed to have the same role for parent and children package
		removeDuplicateInheritedRolesQuery := `
		update package_member_role 
		set roles = 
		(
			SELECT array
			(
				SELECT unnest(roles) 
				EXCEPT 
				select unnest(roles) from package_member_role where user_id = ? and package_id = ?
			)
		)
		where user_id = ?
		and package_id like ? || '.%';
		`
		for _, ent := range entities {
			_, err = tx.Exec(removeDuplicateInheritedRolesQuery, ent.UserId, ent.PackageId, ent.UserId, ent.PackageId)
			if err != nil {
				return err
			}
		}
		return r.deleteMembersWithEmptyRoles(tx)
	})
}

func (r roleRepositoryImpl) DeleteDirectPackageMember(ctx context.Context, packageId string, userId string) error {
	ent := new(entity.PackageMemberRoleEntity)
	_, err := r.cp.GetConnection().WithContext(ctx).Model(ent).
		Where("package_id = ?", packageId).
		Where("user_id = ?", userId).
		Delete()
	if err != nil {
		return err
	}
	return nil
}

func (r roleRepositoryImpl) GetDirectPackageMember(ctx context.Context, packageId string, userId string) (*entity.PackageMemberRoleEntity, error) {
	result := new(entity.PackageMemberRoleEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).
		Where("package_id = ?", packageId).
		Where("user_id = ?", userId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (r roleRepositoryImpl) RemoveRoleFromPackageMember(ctx context.Context, packageId string, userId string, roleId string) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		removeRoleFromPackageMemberQuery := `
		update package_member_role set roles = array_remove(roles, ?)
			where package_id = ?
			and user_id = ?;`
		_, err := tx.Exec(removeRoleFromPackageMemberQuery, roleId, packageId, userId)
		if err != nil {
			return err
		}
		return r.deleteMembersWithEmptyRoles(tx)
	})
}

func (r roleRepositoryImpl) GetDirectPackageMembers(ctx context.Context, packageId string) ([]entity.PackageMemberRoleEntity, error) {
	var result []entity.PackageMemberRoleEntity
	err := r.cp.GetConnection().WithContext(ctx).Model(&result).
		Where("package_id = ?", packageId).
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r roleRepositoryImpl) deleteMembersWithEmptyRoles(tx *pg.Tx) error {
	deleteMembersWithEmptyRolesQuery := `delete from package_member_role where roles = ARRAY[]::varchar[];`
	_, err := tx.Exec(deleteMembersWithEmptyRolesQuery)
	if err != nil {
		return err
	}
	return nil
}

func (r roleRepositoryImpl) GetPackageRolesHierarchyForUser(ctx context.Context, packageId string, userId string) ([]entity.PackageMemberRoleRichEntity, error) {
	var result []entity.PackageMemberRoleRichEntity
	if packageId == "" {
		return nil, nil
	}

	packageIds := utils.GetPackageHierarchy(packageId)

	//using unnest to sort result by packageIds array
	query := `
	select pg.id package_id, pg.kind package_kind, pg.name package_name, u.user_id, u.name user_name, u.email user_email, u.avatar_url user_avatar, role.id as role_id, role.role as role
	from 
	package_member_role p,
	package_group pg,
	user_data u,
    role,
	UNNEST(?::text[]) WITH ORDINALITY t(package_id, ord),
    UNNEST(p.roles) roles(role)
	where t.package_id = p.package_id
	and p.package_id=pg.id
	and p.user_id = ?
	and p.user_id = u.user_id
    and role.id = roles.role
	order by t.ord;
	`
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result, query, pg.Array(packageIds), userId)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r roleRepositoryImpl) GetPackageHierarchyMembers(ctx context.Context, packageId string) ([]entity.PackageMemberRoleRichEntity, error) {
	var result []entity.PackageMemberRoleRichEntity
	if packageId == "" {
		return nil, nil
	}
	packageIds := utils.GetPackageHierarchy(packageId)
	//using unnest to sort result by packageIds array
	query := `
	select pg.id package_id, pg.kind package_kind, pg.name package_name, u.user_id, u.name user_name, u.email user_email, u.avatar_url user_avatar, role.id as role_id, role.role as role
	from 
	package_member_role p,
	package_group pg,
	user_data u,
    role,
	UNNEST(?::text[]) WITH ORDINALITY t(package_id, ord),
    UNNEST(p.roles) roles(role)
	where t.package_id = p.package_id
	and p.package_id=pg.id
	and p.user_id = u.user_id
    and role.id = roles.role
	order by t.ord;
	`
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result, query, pg.Array(packageIds))
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r roleRepositoryImpl) GetAvailablePackageRoles(ctx context.Context, packageId string, userId string) ([]entity.RoleEntity, error) {
	var result []entity.RoleEntity
	if packageId == "" {
		return nil, nil
	}
	packageIds := utils.GetPackageHierarchy(packageId)
	query := `
	select distinct *
	from role 
	where rank <= (
		select max(rank) from role where id in 
		(
			select unnest(roles) as role
			from 
			package_member_role
			where package_id in (?)
			and user_id = ?
			union
			select default_role as role
			from package_group
			where id in (?)
		)
	)
	order by rank desc;
	`
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result, query, pg.In(packageIds), userId, pg.In(packageIds))
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r roleRepositoryImpl) GetUserSystemRole(ctx context.Context, userId string) (*entity.SystemRoleEntity, error) {
	systemRole := new(entity.SystemRoleEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(systemRole).
		Where("user_id = ?", userId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return systemRole, nil
}

func (r roleRepositoryImpl) SetUserSystemRole(ctx context.Context, userId string, role string) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(&entity.SystemRoleEntity{UserId: userId, Role: role}).OnConflict("(user_id) DO UPDATE").Insert()
	if err != nil {
		return err
	}
	return nil
}

func (r roleRepositoryImpl) DeleteUserSystemRole(ctx context.Context, userId string) error {
	_, err := r.cp.GetConnection().WithContext(ctx).
		Model(&entity.SystemRoleEntity{UserId: userId}).
		WherePK().
		ForceDelete()
	if err != nil {
		return err
	}
	return nil
}

func (r roleRepositoryImpl) GetAllRoles(ctx context.Context) ([]entity.RoleEntity, error) {
	var result []entity.RoleEntity
	err := r.cp.GetConnection().WithContext(ctx).Model(&result).
		Order("rank desc").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r roleRepositoryImpl) CreateRole(ctx context.Context, roleEntity entity.RoleEntity) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		shiftRoleRanksUpQuery := `update role set rank = rank + 1 where rank >= ?`
		_, err := tx.Exec(shiftRoleRanksUpQuery, roleEntity.Rank)
		if err != nil {
			return err
		}
		_, err = tx.Model(&roleEntity).Insert()
		if err != nil {
			return err
		}

		return err
	})
}

func (r roleRepositoryImpl) UpdateRolePermissions(ctx context.Context, roleId string, permissions []string) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(&entity.RoleEntity{}).
		Where("id = ?", roleId).
		Set("permissions = ?", pg.Array(permissions)).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (r roleRepositoryImpl) DeleteRole(ctx context.Context, roleId string) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		shiftRoleRanksDownQuery := `
		update role 
		set rank = rank - 1 
		where rank > (select rank from role where id = ?)
		`
		_, err := tx.Exec(shiftRoleRanksDownQuery, roleId)
		if err != nil {
			return err
		}
		_, err = tx.Model(&entity.RoleEntity{}).
			Where("id = ?", roleId).
			Delete()
		if err != nil {
			return err
		}
		removeRoleFromMembers := `
			update package_member_role 
			set roles = array_remove(roles, ?)
			`
		_, err = tx.Exec(removeRoleFromMembers, roleId)
		if err != nil {
			return err
		}
		return r.deleteMembersWithEmptyRoles(tx)
	})
}

func (r roleRepositoryImpl) GetRole(ctx context.Context, roleId string) (*entity.RoleEntity, error) {
	result := new(entity.RoleEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).
		Where("id = ?", roleId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

type Permission struct {
	Permission string `pg:"permission"`
}

func (r roleRepositoryImpl) GetPermissionsForRoles(ctx context.Context, roles []string) ([]string, error) {
	var permissions []Permission
	if len(roles) == 0 {
		return make([]string, 0), nil
	}
	query := `
	select distinct unnest(permissions) as permission
	from role 
	where id in(?);`
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&permissions, query, pg.In(roles))
	if err != nil {
		return nil, err
	}
	result := make([]string, 0)
	for _, p := range permissions {
		result = append(result, p.Permission)
	}
	return result, nil
}

func (r roleRepositoryImpl) GetUserPermissions(ctx context.Context, packageId string, userId string) ([]string, error) {
	var permissions []Permission
	if packageId == "" {
		return make([]string, 0), nil
	}
	packageIds := utils.GetPackageHierarchy(packageId)
	query := `
	select distinct unnest(permissions) as permission
	from role 
	where id in(
		select unnest(roles) as role
		from 
			package_member_role
			where package_id in (?)
			and user_id = ?
			union
			select default_role as role
			from package_group
			where id in (?)
	);`
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&permissions, query, pg.In(packageIds), userId, pg.In(packageIds))
	if err != nil {
		return nil, err
	}
	result := make([]string, 0)
	for _, p := range permissions {
		result = append(result, p.Permission)
	}
	return result, nil
}

func (r roleRepositoryImpl) GetAllUserPermissions(ctx context.Context, userId string) ([]string, error) {
	var permissions []Permission
	query := `
	select distinct unnest(permissions) as permission
	from role 
	where id in(
		select unnest(roles) as role
		from 
			package_member_role
			where user_id = ?
			union
			select default_role as role
			from package_group
			where id in (
				select package_id from package_member_role where user_id = ?
			)
	);`
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&permissions, query, userId, userId)
	if err != nil {
		return nil, err
	}
	result := make([]string, 0)
	for _, p := range permissions {
		result = append(result, p.Permission)
	}
	return result, nil
}

func (r roleRepositoryImpl) SetRoleRanks(ctx context.Context, entities []entity.RoleEntity) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, ent := range entities {
			_, err := tx.Model(&ent).
				Column("rank").
				Where("id = ?id").
				Where("read_only = false").
				Update()
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (r roleRepositoryImpl) GetUsersBySystemRole(ctx context.Context, systemRole string) ([]entity.UserEntity, error) {
	var result []entity.UserEntity
	err := r.cp.GetConnection().WithContext(ctx).Model(&result).
		ColumnExpr("user_data.*").
		Join("inner join system_role sr").
		JoinOn("sr.user_id = user_data.user_id").
		JoinOn("sr.role = ?", systemRole).
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}
