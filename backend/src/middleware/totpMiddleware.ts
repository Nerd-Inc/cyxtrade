import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../utils/errors';
import { findUserById } from '../services/userService';
import { hasValidVerification } from '../services/totpService';

/**
 * Middleware that requires recent TOTP verification for sensitive operations.
 *
 * Usage:
 *   router.post('/withdraw', requireTotpVerification('withdrawal'), withdrawHandler);
 *
 * The user must have verified TOTP within the last 5 minutes for the specified operation.
 * If TOTP is not enabled for the user, the operation is allowed without verification.
 */
export function requireTotpVerification(operation: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required');
      }

      // Check if user has TOTP enabled
      const user = await findUserById(userId);
      if (!user) {
        throw new AppError(ErrorCode.UNAUTHORIZED, 'User not found');
      }

      // If TOTP is not enabled, allow the operation
      if (!user.totp_enabled) {
        return next();
      }

      // Check for recent TOTP verification for this operation
      const hasValid = await hasValidVerification(userId, operation);

      if (!hasValid) {
        throw new AppError(
          ErrorCode.TOTP_REQUIRED,
          'Two-factor authentication required for this operation',
          { operation }
        );
      }

      // Verification found and still valid
      next();
    } catch (err) {
      next(err);
    }
  };
}
