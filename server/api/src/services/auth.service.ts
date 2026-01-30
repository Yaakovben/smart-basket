import { User, LoginActivity } from '../models';
import { ApiError } from '../utils';
import { TokenService } from './token.service';
import { env } from '../config';
import type { RegisterInput, LoginInput } from '../utils/validators';
import type { AuthTokens, IUserResponse } from '../types';

interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

export class AuthService {
  // Check if email exists in the database
  static async checkEmail(email: string): Promise<{ exists: boolean; isGoogleAccount: boolean }> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+googleId');

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
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    // Check if user should be admin
    const isAdmin = data.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    // Create user
    const user = await User.create({
      name: data.name,
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
    await LoginActivity.create({
      user: user._id,
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
    const user = await User.findOne({ email: data.email.toLowerCase() }).select(
      '+password +googleId'
    );

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check if user registered with Google only (no password)
    if (!user.password && user.googleId) {
      throw ApiError.badRequest('This account was created with Google. Please use Google Sign-In.');
    }

    if (!user.password) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check password
    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const tokens = await TokenService.createTokens(
      user._id.toString(),
      user.email,
      user.name
    );

    // Log activity
    await LoginActivity.create({
      user: user._id,
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
      throw ApiError.unauthorized('Invalid Google access token');
    }

    const googleUser = (await response.json()) as GoogleUserInfo;

    // Find or create user
    let user = await User.findOne({
      $or: [
        { googleId: googleUser.sub },
        { email: googleUser.email.toLowerCase() },
      ],
    });

    const isAdmin =
      googleUser.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    if (!user) {
      // Create new user
      user = await User.create({
        name: googleUser.name,
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
    await LoginActivity.create({
      user: user._id,
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
