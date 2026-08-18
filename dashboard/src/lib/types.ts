export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "SUPPORT";
export type SessionUser = {
  id: string;
  email: string;
  role: AdminRole;
  twoFactorEnabled?: boolean;
  profile?: { firstName: string } | null;
};
export type Moderator = { id: string; email: string; role: AdminRole };
export type User = SessionUser & {
  isActive: boolean;
  accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  profile?: {
    firstName: string;
    country: string;
    city: string;
    occupation?: string | null;
    onboardingCompleted: boolean;
  } | null;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
export type Overview = {
  metrics: Record<string, number | null>;
  recentUsers: User[];
  generatedAt: string;
};
