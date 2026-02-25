export type UserRole = 'owner' | 'admin' | 'pm' | 'superintendent' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  teamId: string;
  assignedProjects: string[];
  lastActive: Date;
  createdAt: Date;
  invitedBy?: string;
  status: 'active' | 'pending' | 'disabled';
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  assignedProjects: string[];
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

export const roleConfig: Record<UserRole, {
  label: string;
  description: string;
  color: string;
  permissions: string[];
}> = {
  owner: {
    label: 'Owner',
    description: 'Full access to all features and settings',
    color: 'text-accent',
    permissions: ['*'],
  },
  admin: {
    label: 'Admin',
    description: 'Manage team, users, and all projects',
    color: 'text-purple',
    permissions: ['manage_team', 'manage_projects', 'manage_permits', 'manage_tasks', 'send_emails', 'view_costs', 'view_audit'],
  },
  pm: {
    label: 'Project Manager',
    description: 'Full access to assigned projects only',
    color: 'text-success',
    permissions: ['manage_permits', 'manage_tasks', 'send_emails', 'view_costs', 'schedule_inspections'],
  },
  superintendent: {
    label: 'Superintendent',
    description: 'Field access - inspections and read-only permits',
    color: 'text-warn',
    permissions: ['view_permits', 'view_inspections', 'update_inspections'],
  },
  viewer: {
    label: 'View Only',
    description: 'Read-only access to assigned projects',
    color: 'text-muted',
    permissions: ['view_permits', 'view_tasks', 'view_inspections'],
  },
};

export function hasPermission(user: User, permission: string): boolean {
  const role = roleConfig[user.role];
  if (role.permissions.includes('*')) return true;
  return role.permissions.includes(permission);
}

export function canAccessProject(user: User, projectId: string): boolean {
  if (user.role === 'owner' || user.role === 'admin') return true;
  return user.assignedProjects.includes(projectId);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
