import { ChromeUser } from '@redhat-cloud-services/types';

export const mockUser: ChromeUser = {
  entitlements: {
    insights: { is_entitled: true, is_trial: false },
    openshift: { is_entitled: true, is_trial: false },
    smart_management: { is_entitled: true, is_trial: true },
    ansible: { is_entitled: false, is_trial: false },
    subscriptions: { is_entitled: true, is_trial: false },
    migrations: { is_entitled: false, is_trial: false },
    cost_management: { is_entitled: true, is_trial: false },
    settings: { is_entitled: true, is_trial: false },
    user_preferences: { is_entitled: true, is_trial: false },
    acs: { is_entitled: false, is_trial: false },
    rhel: { is_entitled: true, is_trial: false },
  },
  identity: {
    account_number: '12345',
    org_id: '67890',
    type: 'User',
    user: {
      username: 'test-user@redhat.com',
      email: 'test-user@redhat.com',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      is_org_admin: true,
      is_internal: true,
      locale: 'en_US',
    },
    internal: {
      org_id: '67890',
      account_id: '12345',
    },
  },
};

export const mockUserAllEntitled: ChromeUser = {
  ...mockUser,
  entitlements: Object.fromEntries(
    Object.keys(mockUser.entitlements).map((key) => [
      key,
      { is_entitled: true, is_trial: false },
    ]),
  ),
};

export const mockUserNoneEntitled: ChromeUser = {
  ...mockUser,
  entitlements: Object.fromEntries(
    Object.keys(mockUser.entitlements).map((key) => [
      key,
      { is_entitled: false, is_trial: false },
    ]),
  ),
};

export const mockUserManyTrials: ChromeUser = {
  ...mockUser,
  entitlements: {
    insights: { is_entitled: true, is_trial: true },
    openshift: { is_entitled: true, is_trial: true },
    smart_management: { is_entitled: true, is_trial: true },
    ansible: { is_entitled: true, is_trial: true },
    subscriptions: { is_entitled: false, is_trial: false },
    migrations: { is_entitled: false, is_trial: false },
    cost_management: { is_entitled: true, is_trial: false },
    settings: { is_entitled: true, is_trial: false },
    user_preferences: { is_entitled: true, is_trial: false },
    acs: { is_entitled: false, is_trial: false },
    rhel: { is_entitled: true, is_trial: false },
  },
};

export const mockPermissions = [
  { permission: 'inventory:hosts:read' },
  { permission: 'inventory:hosts:write' },
  { permission: 'inventory:groups:read' },
  { permission: 'cost-management:cost_model:read' },
  { permission: 'cost-management:cost_model:write' },
  { permission: 'cost-management:rate:read' },
  { permission: 'playbook-dispatcher:run:read' },
  { permission: 'playbook-dispatcher:run:write' },
  { permission: 'advisor:recommendation:read' },
  { permission: 'advisor:system:read' },
  { permission: 'rbac:principal:read' },
  { permission: 'rbac:group:read' },
  { permission: 'rbac:group:write' },
  { permission: 'rbac:role:read' },
  { permission: 'sources:source:read' },
  { permission: 'sources:source:write' },
];

export const mockPermissionsMany = [
  ...mockPermissions,
  { permission: 'patch:system:read' },
  { permission: 'patch:system:write' },
  { permission: 'vulnerability:system:read' },
  { permission: 'vulnerability:cve:read' },
  { permission: 'compliance:system:read' },
  { permission: 'compliance:policy:read' },
  { permission: 'compliance:policy:write' },
  { permission: 'drift:comparison:read' },
  { permission: 'drift:baseline:read' },
  { permission: 'drift:baseline:write' },
  { permission: 'notifications:events:read' },
  { permission: 'notifications:integrations:read' },
  { permission: 'notifications:integrations:write' },
  { permission: 'ros:system:read' },
  { permission: 'image-builder:compose:read' },
  { permission: 'image-builder:compose:write' },
];
