import { IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class AdminLoginResponseDto {
  access_token: string;
  admin: {
    id: string;
    username: string;
  };
}

export class UserProfileDto {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  identity?: {
    id: string;
    did: string;
    kycStatus: string;
    kycScore: number;
    faceMatchScore: number;
    txHash: string;
    blockNumber: number;
    kycVerifiedAt: Date;
    createdAt: Date;
    profile?: {
      full_name: string;
      dob: string;
      age: number | null;
      gender: string;
      hometown: string;
      address: string;
      nationality: string;
      cccd_number: string;
      cccd_expiry: string;
      cccd_front_url?: string;
      cccd_back_url?: string;
    };
  };
}

export class UserListDto {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  kycStatus?: string;
  lastLoginAt: Date;
  createdAt: Date;
}

export class BlockchainRecordDto {
  id: string;
  userId: string;
  userName: string;
  did: string;
  kycStatus: string;
  kycScore: number;
  faceMatchScore: number;
  dataHash: string;
  txHash: string;
  blockNumber: number;
  kycVerifiedAt: Date;
  createdAt: Date;
}

export class AdminDashboardDto {
  total_users: number;
  active_users: number;
  kyc_verified: number;
  kyc_pending: number;
  kyc_rejected: number;
  blockchain_records: number;
}
