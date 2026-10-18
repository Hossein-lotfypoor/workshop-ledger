import { createContext, useContext, type PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export type WarehouseRole = 'owner' | 'viewer';

const WarehouseRoleContext = createContext<WarehouseRole>('owner');

export function WarehouseRoleProvider({ role, children }: PropsWithChildren<{ role: WarehouseRole }>) {
  return <WarehouseRoleContext.Provider value={role}>{children}</WarehouseRoleContext.Provider>;
}

export function useWarehouseRole() {
  return useContext(WarehouseRoleContext);
}

export function RequireWarehouseWriteAccess() {
  const role = useWarehouseRole();
  return role === 'viewer' ? <Navigate to="/warehouse" replace /> : <Outlet />;
}