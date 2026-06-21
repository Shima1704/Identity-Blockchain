import { Injectable, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { User } from '../../database/entities/user.entity';
import { Identity, KycStatus } from '../../database/entities/identity.entity';
import { CryptoUtil } from '../../common/crypto.util';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
  UserProfileDto,
  UserListDto,
  BlockchainRecordDto,
  AdminDashboardDto,
} from './admin.dto';

// Hardcoded admin credentials (for development - use database in production)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin@123';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Identity) private readonly identityRepo: Repository<Identity>,
    private readonly jwtService: JwtService,
  ) {
    this.logger.log('Admin service initialized');
    this.logger.warn('⚠️  Using hardcoded admin credentials - change in production!');
  }

  /** Admin login - simple credentials verification */
  async login(dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    if (!dto.username || !dto.password) {
      throw new UnauthorizedException('Tên đăng nhập và mật khẩu không được để trống');
    }

    if (dto.username !== ADMIN_USERNAME || dto.password !== ADMIN_PASSWORD) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const payload = {
      sub: 'admin',
      username: ADMIN_USERNAME,
      role: 'admin',
    };

    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: 'admin',
        username: ADMIN_USERNAME,
      },
    };
  }

  /** Lấy danh sách tất cả người dùng */
  async getAllUsers(): Promise<UserListDto[]> {
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
    });

    const userList: UserListDto[] = [];

    for (const user of users) {
      const identity = await this.identityRepo.findOne({ where: { userId: user.id } });
      const decrypted = this.decryptIdentity(identity);

      userList.push({
        id: user.id,
        phone: user.phone || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        isActive: user.isActive,
        isLocked: user.isLocked,
        kycStatus: identity?.kycStatus || 'pending',
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      });
    }

    return userList;
  }

  /** Lấy chi tiết thông tin người dùng */
  async getUserById(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const identity = await this.identityRepo.findOne({ where: { userId } });
    const decryptedIdentity = this.decryptIdentity(identity);

    return {
      id: user.id,
      phone: user.phone || '',
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      isActive: user.isActive,
      isLocked: user.isLocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      identity: decryptedIdentity,
    };
  }

  /** Lấy danh sách các bản ghi blockchain */
  async getBlockchainRecords(): Promise<BlockchainRecordDto[]> {
    // Lấy tất cả identities có DID không phải pending_*
    const identities = await this.identityRepo.find({
      order: { createdAt: 'DESC' },
    });

    const records: BlockchainRecordDto[] = [];

    for (const identity of identities) {
      // Bỏ qua các record chưa có DID hoặc có DID pending
      if (!identity.did || identity.did.startsWith('pending_')) continue;

      const user = await this.userRepo.findOne({ where: { id: identity.userId } });
      const fullName = this.decrypt(identity.fullNameEnc) || 'N/A';

      records.push({
        id: identity.id,
        userId: identity.userId,
        userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        did: identity.did,
        kycStatus: identity.kycStatus,
        kycScore: identity.kycScore || 0,
        faceMatchScore: identity.faceMatchScore || 0,
        dataHash: identity.dataHash,
        txHash: identity.txHash || 'N/A',
        blockNumber: identity.blockNumber || 0,
        kycVerifiedAt: identity.kycVerifiedAt,
        createdAt: identity.createdAt,
      });
    }

    return records;
  }

  /** Lấy thống kê dashboard */
  async getDashboard(): Promise<AdminDashboardDto> {
    const totalUsers = await this.userRepo.count();
    const activeUsers = await this.userRepo.count({ where: { isActive: true } });
    const kycVerified = await this.identityRepo.count({
      where: { kycStatus: KycStatus.VERIFIED },
    });
    const kycPending = await this.identityRepo.count({
      where: { kycStatus: KycStatus.PENDING },
    });
    const kycRejected = await this.identityRepo.count({
      where: { kycStatus: KycStatus.REJECTED },
    });
    
    // Đếm những identity có DID hợp lệ (không pending)
    const allIdentities = await this.identityRepo.find();
    const blockchainRecords = allIdentities.filter(
      (id) => id.did && !id.did.startsWith('pending_')
    ).length;

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      kyc_verified: kycVerified,
      kyc_pending: kycPending,
      kyc_rejected: kycRejected,
      blockchain_records: blockchainRecords,
    };
  }

  /** Helper: Giải mã thông tin identity */
  private decryptIdentity(identity: Identity | null) {
    if (!identity || !identity.did || identity.did.startsWith('pending_')) {
      return undefined;
    }

    const decrypted = {
      id: identity.id,
      did: identity.did,
      kycStatus: identity.kycStatus,
      kycScore: identity.kycScore || 0,
      faceMatchScore: identity.faceMatchScore || 0,
      txHash: identity.txHash || '',
      blockNumber: identity.blockNumber || 0,
      kycVerifiedAt: identity.kycVerifiedAt,
      createdAt: identity.createdAt,
      profile: {
        full_name: this.decrypt(identity.fullNameEnc) || '',
        dob: this.decrypt(identity.dobEnc) || '',
        age: this.calculateAge(this.decrypt(identity.dobEnc)),
        gender: this.decrypt(identity.genderEnc) || '',
        hometown: this.decrypt(identity.hometownEnc) || '',
        address: this.decrypt(identity.addressEnc) || '',
        nationality: this.decrypt(identity.nationalityEnc) || '',
        cccd_number: this.decrypt(identity.cccdNumberEnc) || '',
        cccd_expiry: this.decrypt(identity.cccdExpiryEnc) || '',
        ...(identity.cccdFrontFilename && {
          cccd_front_url: `/kyc/cccd-images/${identity.cccdFrontFilename}`,
        }),
        ...(identity.cccdBackFilename && {
          cccd_back_url: `/kyc/cccd-images/${identity.cccdBackFilename}`,
        }),
      },
    };

    return decrypted;
  }

  /** Helper: Giải mã một giá trị */
  private decrypt(encrypted: string | null): string | null {
    if (!encrypted || encrypted.startsWith('pending_')) return null;
    try {
      const key = process.env.AES_SECRET_KEY || 'fallback_key_32_chars_minimum!!!';
      return CryptoUtil.decrypt(encrypted, key);
    } catch (e) {
      this.logger.warn(`Decrypt failed: ${e.message}`);
      return null;
    }
  }

  /** Helper: Tính tuổi từ ngày sinh */
  private calculateAge(dob: string | null): number | null {
    if (!dob) return null;
    try {
      const [d, m, y] = dob.split('/').map(Number);
      const birth = new Date(y, m - 1, d);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (
        today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  }
}
