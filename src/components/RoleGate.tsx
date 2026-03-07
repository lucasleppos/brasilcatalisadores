import { usePermissions } from "@/lib/permissions";

interface RoleGateProps {
  children: React.ReactNode;
  module: string;
  action?: string;
  fallback?: React.ReactNode;
}

export function RoleGate({ children, module, action = "access", fallback = null }: RoleGateProps) {
  const { canDo } = usePermissions();
  if (!canDo(module, action)) return <>{fallback}</>;
  return <>{children}</>;
}
