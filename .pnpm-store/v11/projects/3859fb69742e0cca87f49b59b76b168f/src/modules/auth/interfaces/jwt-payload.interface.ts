export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  tokenId?: string;
}

export interface ExternalAuthProfile {
  provider: 'GOOGLE' | 'APPLE';
  providerId: string;
  email: string;
}
