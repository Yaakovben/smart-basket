export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: ValidationErrorDetail[] | Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: ValidationErrorDetail[] | Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// שגיאת ולידציה (400)
export class ValidationError extends AppError {
  constructor(details: ValidationErrorDetail[]) {
    super('Validation failed', 400, 'VALIDATION_ERROR', details);
  }

  static fromJoi(joiError: { details: Array<{ path: (string | number)[]; message: string }> }): ValidationError {
    const details = joiError.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return new ValidationError(details);
  }

  static single(field: string, message: string): ValidationError {
    return new ValidationError([{ field, message }]);
  }
}

// שגיאות אימות (401)
export class AuthError extends AppError {
  constructor(message: string, code: string) {
    super(message, 401, code);
  }

  static invalidCredentials(): AuthError {
    return new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  static invalidGroupPassword(): AuthError {
    // 400 במקום 401 כדי לא לגרום לרענון טוקן
    return new AppError('Invalid group password', 400, 'INVALID_GROUP_PASSWORD') as AuthError;
  }

  static tokenExpired(): AuthError {
    return new AuthError('Token has expired', 'TOKEN_EXPIRED');
  }

  static invalidToken(): AuthError {
    return new AuthError('Invalid token', 'INVALID_TOKEN');
  }

  static unauthorized(message = 'Authentication required'): AuthError {
    return new AuthError(message, 'UNAUTHORIZED');
  }

  static googleAuthFailed(): AuthError {
    return new AuthError('Google authentication failed', 'GOOGLE_AUTH_FAILED');
  }
}

// שגיאת הרשאה (403)
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }

  static notOwner(): ForbiddenError {
    return new ForbiddenError('Only the owner can perform this action');
  }

  static notAdmin(): ForbiddenError {
    return new ForbiddenError('Admin privileges required');
  }

  static noAccess(): ForbiddenError {
    return new ForbiddenError('You do not have access to this resource');
  }

  static ownerCannotLeave(): ForbiddenError {
    return new ForbiddenError('Owner cannot leave the list. Delete it instead.');
  }

  static cannotRemoveOwner(): ForbiddenError {
    return new ForbiddenError('Cannot remove the owner');
  }

  static cannotDeleteSelf(): ForbiddenError {
    return new ForbiddenError('Cannot delete your own account from admin panel');
  }

  static onlyOwnerCanRemoveAdmins(): ForbiddenError {
    return new ForbiddenError('Only owner can remove admins');
  }
}

// שגיאת לא נמצא (404)
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static user(): NotFoundError {
    return new NotFoundError('User');
  }

  static list(): NotFoundError {
    return new NotFoundError('List');
  }

  static product(): NotFoundError {
    return new NotFoundError('Product');
  }

  static notification(): NotFoundError {
    return new NotFoundError('Notification');
  }

  static inviteCode(): NotFoundError {
    return new NotFoundError('Invalid invite code');
  }

  static member(): NotFoundError {
    return new NotFoundError('Member');
  }
}

// שגיאת התנגשות (409)
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }

  static emailExists(): ConflictError {
    return new ConflictError('Email already registered');
  }

  static alreadyMember(): ConflictError {
    return new ConflictError('You are already a member of this list');
  }

  static isOwner(): ConflictError {
    return new ConflictError('You are the owner of this list');
  }
}
