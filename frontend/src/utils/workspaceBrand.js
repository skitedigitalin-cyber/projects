const SKITE_TENANT_ID = '6af2c94a9d29730751ed2d01';
const ROBOTRIQ_TENANT_ID = '6afd35731172da4b0de9a48e';

export function getWorkspaceBrand(user) {
    const tenantId = String(user?.tenantId?._id || user?.tenantId || '');
    if (tenantId === SKITE_TENANT_ID) return 'skite';
    if (tenantId === ROBOTRIQ_TENANT_ID) return 'robotriq';
    return 'standard';
}
