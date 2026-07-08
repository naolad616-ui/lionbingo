export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

export const ADMIN_PERMISSIONS = [
  'dashboard',
  'commission',
  'reports',
  'security',
  'admin_management',
  'settings',
];

export const ROLE_DEFAULT_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: [...ADMIN_PERMISSIONS],
  [ADMIN_ROLES.MANAGER]: ['dashboard', 'commission', 'reports', 'settings'],
  [ADMIN_ROLES.ADMIN]: ['dashboard', 'reports'],
};

export const ROLE_LABELS = {
  [ADMIN_ROLES.SUPER_ADMIN]: 'Super Admin',
  [ADMIN_ROLES.MANAGER]: 'Manager',
  [ADMIN_ROLES.ADMIN]: 'Admin',
};

export function resolvePermissionsForRole(role, customPermissions = null) {
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    return [...ADMIN_PERMISSIONS];
  }

  if (Array.isArray(customPermissions) && customPermissions.length > 0) {
    return customPermissions.filter((permission) => ADMIN_PERMISSIONS.includes(permission));
  }

  return ROLE_DEFAULT_PERMISSIONS[role] ? [...ROLE_DEFAULT_PERMISSIONS[role]] : [];
}

export function roleHasPermission(role, permissions, requiredPermission) {
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    return true;
  }

  return Array.isArray(permissions) && permissions.includes(requiredPermission);
}
