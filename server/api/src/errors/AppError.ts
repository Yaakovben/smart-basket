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

// Validation Error (400)
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

// Authentication Errors (401)
export class AuthError extends AppError {
  constructor(message: string, code: string) {
    super(message, 401, code);
  }

  static invalidCredentials(): AuthError {
    return new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  static invalidGroupPassword(): AuthError {
    // Use 400 instead of 401 to avoid triggering token refresh
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

// Forbidden Error (403)
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
}

// Not Found Error (404)
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
}

// Conflict Error (409)
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

// Internal Server Error (500)
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}
