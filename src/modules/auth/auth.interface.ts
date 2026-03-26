export type SessionMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

export type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
} & SessionMetadata;

export type SignInInput = {
  identifier: string;
  password: string;
} & SessionMetadata;
