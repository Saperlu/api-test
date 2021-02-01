import { Request, Response, NextFunction } from 'express';
import { notFound, unauthenticated, unauthorized } from '../utils/responses';
import { fetchTeam } from '../operations/team';
import { getRequestUser } from '../utils/user';
import { Error } from '../types';

// Checks if the user is the captain of the team specified in the URL. If not, it will return an error
export const isCaptainOfTeamId = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  // Check if user is authenticated
  const user = getRequestUser(response);
  if (!user) return unauthenticated(response);

  // Check if team exists
  const team = await fetchTeam(request.params.teamId);
  if (!team) return notFound(response, Error.TeamNotFound);

  // Check if user is the team captain
  if (user.id === team.captainId) {
    return next();
  }
  return unauthorized(response);
};

// Checks if the user is the one specified in the URL. If not, it will return an error
export const isUserId = (request: Request, response: Response, next: NextFunction): void => {
  // Check if user is authenticated
  const user = getRequestUser(response);
  if (!user) return unauthenticated(response);

  // Compare user id and the given id in the URL
  if (user.id !== request.params.userId) {
    return next();
  }
  return unauthorized(response);
};

// Checks the user is the captain of the team. If not, it will return an error
export const isInTeamId = (request: Request, response: Response, next: NextFunction): void => {
  // Check if user is authenticated
  const user = getRequestUser(response);
  if (!user) return unauthenticated(response);

  // Compare user teamId and the given teamId in the URL
  if (user.teamId === request.params.teamId) {
    return next();
  }
  return unauthorized(response);
};
