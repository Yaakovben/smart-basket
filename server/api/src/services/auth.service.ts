import { UserDAL, LoginActivityDAL } from '../dal';
import { ConflictError, AuthError } from '../errors';
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
  static async checkEmail(email: string): Promise<{ exists: boolean; isGoogleAccount: boolean }> {
    // שימוש ב-findByEmailWithPassword כי ה-password field הוא select: false
    const user = await UserDAL.findByEmailWithPassword(email);

    if (!user) {
      return { exists: false, isGoogleAccount: false };
    }

    // בדיקה אם זה חשבון Google בלבד (ללא סיסמה)
    const isGoogleAccount = !!(user.googleId && !user.password);

    return { exists: true, isGoogleAccount };
  }

  static async register(
    data: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
    const existingUser = await UserDAL.findByEmail(data.email);
    if (existingUser) {
      throw ConflictError.emailExists();
    }

    const isAdmin = data.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    const user = await UserDAL.create({
      name: sanitizeText(data.name),
      email: data.email.toLowerCase(),
      password: data.password,
      isAdmin,
    });

    const tokens = await TokenService.createTokens(
      user._id.toString(),
      user.email,
      user.name
    );

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
    const user = await UserDAL.findByEmailWithPassword(data.email);

    // שגיאה אחידה לכל מקרי כישלון, מונעת חשיפת מידע על קיום חשבון
    if (!user || !user.password) {
      throw AuthError.invalidCredentials();
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw AuthError.invalidCredentials();
    }

    const tokens = await TokenService.createTokens(
      user._id.toString(),
      user.email,
      user.name
    );

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

    // שליפת פרטי משתמש מ-Google
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw AuthError.googleAuthFailed();
    }

    const googleUser = (await response.json()) as GoogleUserInfo;

    // אימות שדות חובה מ-Google
    if (!googleUser.sub || !googleUser.email || !googleUser.name) {
      throw AuthError.googleAuthFailed();
    }

    // וידוא שהאימייל מאומת ב-Google
    if (googleUser.email_verified === false) {
      throw AuthError.googleAuthFailed();
    }

    // מציאת או יצירת משתמש
    let user = await UserDAL.findByGoogleId(googleUser.sub);

    if (!user) {
      user = await UserDAL.findByEmail(googleUser.email);
    }

    const isAdmin =
      googleUser.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    if (!user) {
      user = await UserDAL.create({
        name: sanitizeText(googleUser.name),
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.sub,
        avatarColor: '#4285F4', // כחול של Google
        isAdmin,
      });
    } else if (!user.googleId) {
      // קישור חשבון אימייל קיים ל-Google (פעולה אטומית)
      await UserDAL.updateById(user._id.toString(), { googleId: googleUser.sub });
      user.googleId = googleUser.sub;
    }

    const tokens = await TokenService.createTokens(
      user._id.toString(),
      user.email,
      user.name
    );

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
