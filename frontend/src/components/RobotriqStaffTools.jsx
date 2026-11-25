import RobotriqCustomers from './RobotriqCustomers';

export function hasRobotriqStaffTools(permissions, role) {
    return role === 'Sales' || permissions?.salesCustomers === true;
}

export default function RobotriqStaffTools({ permissions, role }) {
    return hasRobotriqStaffTools(permissions, role) ? <RobotriqCustomers /> : null;
}
