import { Request, Response, NextFunction } from 'express';
import { fetchSetting } from '../operations/settings';
import { Error } from '../types';
import { badRequest } from '../utils/responses';

/**
 * Check in database if login is allowed
 */
export const loginAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const loginSetting = await fetchSetting('shop');
  if (loginSetting && loginSetting.value) {
    return next();
  }
  return badRequest(response, Error.LoginNotAllowed);
};

/**
 * Check in database if shop is opened
 */
export const shopAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const shopSetting = await fetchSetting('shop');
  if (shopSetting && shopSetting.value) {
    return next();
  }
  return badRequest(response, Error.ShopNotAllowed);
};
