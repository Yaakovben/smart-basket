export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
  googleId?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  // סטטיסטיקות התחברות מהשרת (aggregation)
  totalLogins: number;
  lastLoginAt: string | null;
  lastLoginMethod: 'email' | 'google' | 'app_open' | null;
  lastAppOpenAt: string | null;
  hasPushSubscription: boolean;
}

export interface AdminLoginActivity {
  id: string;
  user: string;
  userName: string;
  userEmail: string;
  loginMethod: 'email' | 'google' | 'app_open';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PaginatedActivity {
  activities: AdminLoginActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  loginsToday: number;
  uniqueUsersToday: number;
  loginsThisMonth: number;
  uniqueUsersThisMonth: number;
}

export interface AdminUserList {
  id: string;
  name: string;
  isGroup: boolean;
  isOwner: boolean;
  membersCount: number;
  productCount: number;
  purchasedCount: number;
}

export interface AdminUserDetails {
  lists: AdminUserList[];
}

export interface DbHealthCollection {
  name: string;
  documents: number;
  size: number;
  storageSize: number;
  indexSize: number;
}

export interface DbHealth {
  limitMB: number;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  totalSize: number;
  usedPct: number;
  status: 'ok' | 'warning' | 'critical';
  collectionCount: number;
  collections: DbHealthCollection[];
}

export interface AiProviderRateLimit {
  limitRequests: string | null;
  remainingRequests: string | null;
  resetRequests: string | null;
  limitTokens: string | null;
  remainingTokens: string | null;
  resetTokens: string | null;
}

export interface AiProviderStatus {
  name: string;
  role: 'primary' | 'backup';
  configured: boolean;
  model: string | null;
  modelResolvedAt: string | null;
  nextModelCheckAt: string | null;
  requestCount: number;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorReason: string | null;
  lastErrorAt: string | null;
  rateLimit: AiProviderRateLimit | null;
}

export interface AiDailyBudget {
  limit: number;          // 0 = ללא הגבלה
  usedToday: number;
  exceeded: boolean;
  resetAt: string | null; // חצות UTC הבא; null כשאין הגבלה
}

export interface AiStatus {
  providers: AiProviderStatus[];
  serverStartedAt: string;
  configured: boolean;
  dailyBudget: AiDailyBudget;
}
