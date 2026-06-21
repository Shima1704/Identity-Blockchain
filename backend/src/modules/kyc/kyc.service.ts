import {
  Injectable, BadRequestException,
  ConflictException, Logger, InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

import { Identity, KycStatus } from '../../database/entities/identity.entity';
import { User } from '../../database/entities/user.entity';
import { CryptoUtil } from '../../common/crypto.util';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { CCCDData, FaceResult, KycSession } from './kyc.types';

/* ── Remove local interface redeclarations — now imported from kyc.types.ts ── */

/* ── Service ─────────────────────────────────────────────────────────────── */

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  // Sessions are now stored in database via Identity entity

  constructor(
    @InjectRepository(Identity) private readonly identityRepo: Repository<Identity>,
    @InjectRepository(User)     private readonly userRepo:     Repository<User>,
    private readonly http:       HttpService,
    private readonly config:     ConfigService,
    private readonly blockchain: BlockchainService,
  ) {}

  /* ── Helper: Get or create temp KYC record for session ── */
  private async getKycSession(userId: string): Promise<Identity | null> {
    let session = await this.identityRepo.findOne({ where: { userId } });
    return session;
  }

  async getIdentityByUserId(userId: string): Promise<Identity | null> {
    return this.identityRepo.findOne({ where: { userId } });
  }

  private async saveKycSession(userId: string, data: Partial<Identity>): Promise<Identity> {
    let session = await this.identityRepo.findOne({ where: { userId } });
    if (!session) {
      const placeholder = `pending_${userId}`;
      session = this.identityRepo.create();
      session.userId = userId;
      session.did = placeholder;
      session.fullNameEnc = placeholder;
      session.dobEnc = placeholder;
      session.genderEnc = placeholder;
      session.hometownEnc = placeholder;
      session.addressEnc = placeholder;
      session.nationalityEnc = placeholder;
      session.cccdNumberEnc = placeholder;
      session.cccdExpiryEnc = placeholder;
      session.dataHash = placeholder;
      session.kycStatus = KycStatus.PENDING;
    }
    Object.assign(session, data);
    return this.identityRepo.save(session);
  }

  private get aiUrl(): string {
    return this.config.get<string>('aiService.url') ?? 'http://localhost:8000';
  }

  private get key(): string {
    return this.config.get<string>('aes.secretKey') ?? 'fallback_key_32_chars_minimum!!!';
  }

  /* ── Step 1: Scan CCCD ─────────────────────────────────────────────── */

  async scanCCCD(frontFile: Express.Multer.File, userId: string) {
    if (!frontFile) throw new BadRequestException('Thiếu ảnh mặt trước CCCD');

    let aiData: CCCDData;
    let warning: string | null = null;

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(frontFile.path), {
        filename:    frontFile.originalname,
        contentType: frontFile.mimetype,
      });
      const resp = await firstValueFrom(
        this.http.post<{ success: boolean; data: CCCDData; error?: string; warning?: string }>(
          `${this.aiUrl}/api/cccd/scan`, form,
          { headers: form.getHeaders(), timeout: 30_000 },
        ),
      );
      if (!resp.data.success) throw new BadRequestException(resp.data.error ?? 'OCR thất bại');
      aiData  = resp.data.data;
      warning = resp.data.warning ?? null;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`AI service down — mock: ${err.message}`);
      warning = 'AI service không khả dụng, dữ liệu giả được dùng để test';
      aiData  = {
        cccd_number:    '012345678901',
        full_name:      'NGUYỄN VĂN A',
        dob:            '01/01/1990',
        gender:         'Nam',
        hometown:       'Hà Nội',
        address:        '123 Đường Test, Quận 1, TP.HCM',
        expiry:         '01/01/2035',
        ocr_confidence: 0,
      };
    }
    // Giữ ảnh CCCD để dùng làm ảnh tham chiếu khi xác minh khuôn mặt

    /* Validate CCCD chưa đăng ký */
    const all = await this.identityRepo.find();
    for (const id of all) {
      if (!id.cccdNumberEnc) continue;
      try {
        if (CryptoUtil.decrypt(id.cccdNumberEnc, this.key) === aiData.cccd_number) {
          throw new ConflictException('CCCD này đã được đăng ký trong hệ thống');
        }
      } catch (e) { if (e instanceof ConflictException) throw e; }
    }

    const cccdHash = CryptoUtil.sha256(aiData.cccd_number);
    
    // Extract and persist the uploaded CCCD front image filename
    const frontFilename = frontFile.filename;
    
    // Save session to database instead of RAM
    await this.saveKycSession(userId, {
      cccdDataJson: aiData,
      cccdHash: cccdHash,
      kycStep: 'cccd_done',
      kycStatus: KycStatus.PROCESSING,
      cccdFrontFilename: frontFilename,
    });

    return { success: true, message: 'Quét CCCD thành công', data: aiData, warning };
  }

  /* ── Step 2: Verify face ───────────────────────────────────────────── */

  async verifyFace(selfieFile: Express.Multer.File, userId: string) {
    if (!selfieFile) throw new BadRequestException('Thiếu ảnh selfie');
    
    const session = await this.getKycSession(userId);
    this.logger.debug(`Face verify - User: ${userId}, Session step: ${session?.kycStep}`);

    if (!session || session.kycStep !== 'cccd_done') {
      throw new BadRequestException('Vui lòng quét CCCD trước khi xác minh khuôn mặt');
    }
    if (!session.cccdFrontFilename) {
      throw new BadRequestException('Không tìm thấy ảnh CCCD. Vui lòng quét lại CCCD.');
    }
    const refPath = path.join(
      process.cwd(), 'src', 'uploads', 'cccd', session.cccdFrontFilename,
    );
    if (!fs.existsSync(refPath)) {
      throw new BadRequestException('Không tìm thấy ảnh CCCD đã upload. Vui lòng quét lại CCCD.');
    }

    let faceResult: FaceResult;
    let warning: string | null = null;

    try {
      const form = new FormData();
      form.append('selfie', fs.createReadStream(selfieFile.path), {
        filename:    selfieFile.originalname,
        contentType: selfieFile.mimetype,
      });
      form.append('reference', fs.createReadStream(refPath), {
        filename: 'cccd_ref.jpg',
        contentType: 'image/jpeg',
      });

      const resp = await firstValueFrom(
        this.http.post<{
          success: boolean; liveness_score: number; match_score: number;
          is_match: boolean; face_detected: boolean; warning?: string; error?: string;
        }>(`${this.aiUrl}/api/face/verify`, form,
          { headers: form.getHeaders(), timeout: 60_000 }),
      );
      const d = resp.data;
      if (!d.face_detected) throw new BadRequestException(d.error ?? 'Không phát hiện khuôn mặt trong ảnh');
      if (!d.is_match && d.liveness_score < 0.15) {
        throw new BadRequestException(`Liveness thất bại (${(d.liveness_score * 100).toFixed(1)}%). Vui lòng thử lại với ánh sáng tốt hơn.`);
      }
      if (!d.is_match) throw new BadRequestException(`Khuôn mặt không khớp với ảnh CCCD (${(d.match_score * 100).toFixed(1)}%)`);
      faceResult = { matchScore: d.match_score, livenessScore: d.liveness_score, isMatch: d.is_match };
      warning    = d.warning ?? null;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const axiosMsg = err?.response?.data?.detail ?? err?.response?.data?.error;
      if (axiosMsg) throw new BadRequestException(String(axiosMsg));
      this.logger.warn(`Face AI down — using mock success: ${err.message}`);
      warning    = 'AI service không khả dụng, sử dụng kết quả giả để test';
      faceResult = { matchScore: 0.97, livenessScore: 0.95, isMatch: true };
    } finally {
      this.rm(selfieFile.path);
    }

    // Update session in database
    await this.saveKycSession(userId, {
      faceResultJson: faceResult,
      kycStep: 'face_done',
    });

    return {
      success:        true,
      message:        'Xác nhận khuôn mặt thành công',
      match_score:    faceResult.matchScore,
      liveness_score: faceResult.livenessScore,
      warning,
    };
  }

  /* ── Step 3: Complete KYC ──────────────────────────────────────────── */

  async completeKYC(userId: string) {
    // Get session from database
    const session = await this.getKycSession(userId);
    if (!session || session.kycStep !== 'face_done' || !session.faceResultJson) {
      throw new BadRequestException('Vui lòng hoàn thành CCCD và xác minh khuôn mặt trước');
    }

    const cccdData = session.cccdDataJson as CCCDData;
    const cccdHash = session.cccdHash;
    const faceResult = session.faceResultJson as FaceResult;
    const k = this.key;

    const enc = (v: string) => CryptoUtil.encrypt(v, k);

    const rawData  = `${cccdData.full_name}|${cccdData.dob}|${cccdData.cccd_number}`;
    const dataHash = CryptoUtil.sha256(rawData);
    const did      = await this.blockchain.generateDID();
    const kycScore = Math.round((faceResult.matchScore * 0.7 + faceResult.livenessScore * 0.3) * 100);

    let txHash:     string | undefined;
    let blockNum:   number | undefined;
    try {
      const r = await this.blockchain.registerDID(did, dataHash, cccdHash);
      txHash  = r.txHash;
      blockNum = r.blockNumber;
      await this.blockchain.updateKYCStatus(did, 2, kycScore);
    } catch (e) { this.logger.warn(`Blockchain (non-fatal): ${e.message}`); }

    // Update existing session record instead of creating new one
    session.did            = did;
    session.fullNameEnc    = enc(cccdData.full_name);
    session.dobEnc         = enc(cccdData.dob);
    session.genderEnc      = enc(cccdData.gender);
    session.hometownEnc    = enc(cccdData.hometown);
    session.addressEnc     = enc(cccdData.address);
    session.nationalityEnc = enc('Việt Nam');
    session.cccdNumberEnc  = enc(cccdData.cccd_number);
    session.cccdExpiryEnc  = enc(cccdData.expiry);
    session.dataHash       = dataHash;
    session.kycStatus      = KycStatus.VERIFIED;
    session.kycVerifiedAt  = new Date();
    session.kycScore       = kycScore;
    session.faceMatchScore = Math.round(faceResult.matchScore * 100) / 100;
    if (txHash)   session.txHash      = txHash;
    if (blockNum) session.blockNumber = blockNum;
    // Clear temporary session data
    session.cccdDataJson = null;
    session.faceResultJson = null;
    session.kycStep = 'completed';
    await this.identityRepo.save(session);

    return {
      success:      true,
      message:      'Định danh số hoàn tất thành công!',
      did,
      tx_hash:      txHash ?? null,
      block_number: blockNum ?? null,
      kyc_score:    kycScore,
    };
  }

  /* ── Get status ─────────────────────────────────────────────────────── */

  async getStatus(userId: string) {
    const identity = await this.identityRepo.findOne({ where: { userId } });
    if (!identity) {
      return { kyc_status: 'pending', step: 'not_started' };
    }
    return {
      kyc_status:      identity.kycStatus,
      did:             identity.did,
      kyc_verified_at: identity.kycVerifiedAt,
      kyc_score:       identity.kycScore,
      face_match:      identity.faceMatchScore,
      tx_hash:         identity.txHash,
      step:            identity.kycStep,
    };
  }

  /* ── Get profile (decrypted) ─────────────────────────────────── */

  async getProfile(userId: string) {
    const identity = await this.identityRepo.findOne({ where: { userId } });
    if (!identity) return { kyc_status: 'pending', profile: null };

    const k = this.key;
    const dec = (v: string | null) => { try { return v ? CryptoUtil.decrypt(v, k) : ''; } catch { return ''; } };

    const dob    = dec(identity.dobEnc);
    const age    = dob ? this.calcAge(dob) : null;

    return {
      kyc_status:   identity.kycStatus,
      did:          identity.did,
      kyc_score:    identity.kycScore,
      face_match:   identity.faceMatchScore,
      tx_hash:      identity.txHash,
      kyc_verified_at: identity.kycVerifiedAt,
      profile: {
        full_name:   dec(identity.fullNameEnc),
        dob,
        age,
        gender:      dec(identity.genderEnc),
        hometown:    dec(identity.hometownEnc),
        address:     dec(identity.addressEnc),
        nationality: dec(identity.nationalityEnc),
        cccd_number: dec(identity.cccdNumberEnc),
        cccd_expiry: dec(identity.cccdExpiryEnc),
        // Add CCCD image URLs if filenames exist
        ...(identity.cccdFrontFilename && {
          cccd_front_url: `/kyc/cccd-images/${identity.cccdFrontFilename}`,
        }),
        ...(identity.cccdBackFilename && {
          cccd_back_url: `/kyc/cccd-images/${identity.cccdBackFilename}`,
        }),
      },
    };
  }

  private calcAge(dob: string): number | null {
    try {
      // dob format: DD/MM/YYYY
      const [d, m, y] = dob.split('/').map(Number);
      const birth = new Date(y, m - 1, d);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() ||
         (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
      return age;
    } catch { return null; }
  }

  private rm(p?: string) {
    if (p) try { fs.unlinkSync(p); } catch {}
  }
}
