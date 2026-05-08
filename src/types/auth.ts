export interface JWTPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarPath: string | null;
  isSystemUser: boolean;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}
