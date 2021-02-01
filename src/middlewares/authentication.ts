import { Response, NextFunction, Request } from 'express';
import { getRequestUser } from '../utils/user';
import { unauthorized, unauthenticated } from '../utils/responses';
import { Permission } from '../types';

// Check if the user is authenticated
export const isAuthenticated = () => (request: Request, response: Response, next: NextFunction) => {
  if (getRequestUser(response)) {
    return next();
  }

  return unauthenticated(response);
};

// Check if the user has the given permission
export const hasPermission = (permission: Permission) => (request: Request, response: Response, next: NextFunction) => {
  // Check if user is authenticated
  const user = getRequestUser(response);
  if (!user) return unauthenticated(response);

  // Check if user has required permission or has "admin" permission
  const userPermissions = user.permissions?.split(',');
  if (userPermissions && (userPermissions.includes(permission) || userPermissions.includes(Permission.admin))) {
    return next();
  }

  return unauthorized(response);
};
