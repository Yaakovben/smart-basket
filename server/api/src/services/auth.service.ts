import { UserDAL, LoginActivityDAL } from '../dal';
import { NotFoundError, ConflictError, AuthError, ValidationError } from '../errors';
import { sanitizeText } from '../utils';
import { TokenService } from './token.service';
import { env } from '../config';
import type { RegisterInput, LoginInput } from '../validators';
import type { AuthTokens, IUserResponse } from '../types';

interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  email_verified?: boolean;
  picture?: string;
}

export class AuthService {
  // Check if email exists in the database
  static async checkEmail(email: string): Promise<{ exists: boolean; isGoogleAccount: boolean }> {
    const user = await UserDAL.findByEmail(email);

    if (!user) {
      return { exists: false, isGoogleAccount: false };
    }

    // Check if this is a Google-only account (no password)
    const isGoogleAccount = !!(user.googleId && !user.password);

    return { exists: true, isGoogleAccount };
  }

  static async register(
    data: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
    // Check if email already exists
    const existingUser = await UserDAL.findByEmail(data.email);
    if (existingUser) {
      throw ConflictError.emailExists();
    }

    // Check if user should be admin
    const isAdmin = data.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    // Create user with sanitized name
    const user = await UserDAL.create({
      name: sanitizeText(data.name),
      email: data.email.toLowerCase(),
      password: data.password,
      isAdmin,
    });

    // Generate tokens
    const tokens = await TokenService.createTokens(
      user._id.toString(),
      user.email,
      user.name
    );

    // Log activity
    await LoginActivityDAL.logActivity({
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      loginMethod: 'email',
      ipAddress,
      userAgent,
    });

    return {
      user: user.toJSON() as IUserResponse,
      tokens,
    };
  }

  static async login(
    data: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
    // Find user with password
    const user = await UserDAL.findByEmailWithPassword(data.email);

    if (!user) {
      throw NotFoundError.user();
    }

    // Check if user registered with Google only (no password)
    if (!user.password && user.googleId) {
      throw ValidationError.single('email', 'This account was created with Google. Please use Google Sign-In.');
    }

    if (!user.password) {
      throw AuthError.invalidCredentials();
    }

    // Check password
    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw AuthError.invalidCredentials();
    }

    // Generate tokens
    const tokens = await TokenService.createTokens(
      user._id.toString(),
      user.email,
      user.name
    );

    // Log activity
    await LoginActivityDAL.logActivity({
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      loginMethod: 'email',
      ipAddress,
      userAgent,
    });

    return {
      user: user.toJSON() as IUserResponse,
      tokens,
    };
  }

  static async googleAuth(
    data: { accessToken: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
    const { accessToken } = data;
    // Fetch user info from Google
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw AuthError.googleAuthFailed();
    }

    const googleUser = (await response.json()) as GoogleUserInfo;

    // Validate required fields from Google
    if (!googleUser.sub || !googleUser.email || !googleUser.name) {
      throw AuthError.googleAuthFailed();
    }

    // Ensure email is verified by Google
    if (googleUser.email_verified === false) {
      throw AuthError.googleAuthFailed();
    }

    // Find or create user
    let user = await UserDAL.findByGoogleId(googleUser.sub);

    if (!user) {
      user = await UserDAL.findByEmail(googleUser.email);
    }

    const isAdmin =
      googleUser.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    if (!user) {
      // Create new user with sanitized name
      user = await UserDAL.create({
        name: sanitizeText(googleUser.name),
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.sub,
        avatarColor: '#4285F4', // Google blue
        isAdmin,
      });
    } else if (!user.googleId) {
      // Link existing email account to Google
      user.googleId = googleUser.sub;
      await user.save();
    }

    // Generate tokens
    const tokens = await TokenService.createTokens(
      user._id.toString(),
      user.email,
      user.name
    );

    // Log activity
    await LoginActivityDAL.logActivity({
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      loginMethod: 'google',
      ipAddress,
      userAgent,
    });

    return {
      user: user.toJSON() as IUserResponse,
      tokens,
    };
  }

  static async refreshToken(
    refreshToken: string
  ): Promise<AuthTokens | null> {
    return TokenService.refreshAccessToken(refreshToken);
  }

  static async logout(refreshToken: string): Promise<void> {
    await TokenService.invalidateRefreshToken(refreshToken);
  }
}
