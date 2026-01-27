import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

/**
 * Guard to ensure only PlainLedger CPA Admin can access certain endpoints
 */
@Injectable()
export class CPAAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const realmRoles = user.realm_access?.roles || [];

    // Check if user has the CPA Admin role
    return realmRoles.includes("plainledger_cpa_admin");
  }
}
