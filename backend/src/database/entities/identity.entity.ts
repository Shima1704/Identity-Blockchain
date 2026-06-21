import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany
} from 'typeorm';
import { User } from './user.entity';

export enum KycStatus {
  PENDING    = 'pending',
  PROCESSING = 'processing',
  VERIFIED   = 'verified',
  REJECTED   = 'rejected',
  EXPIRED    = 'expired',
}

export enum DidStatus {
  ACTIVE    = 'active',
  REVOKED   = 'revoked',
  SUSPENDED = 'suspended',
}

@Entity('identities')
export class Identity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  // ── Blockchain ─────────────────────────────
  @Column({ unique: true })
  did: string;

  @Column({ name: 'did_status', type: 'varchar', default: DidStatus.ACTIVE })
  didStatus: DidStatus;

  // ── Encrypted personal data (AES-256) ──────
  @Column({ name: 'full_name_enc', type: 'text' })
  fullNameEnc: string;

  @Column({ name: 'dob_enc', type: 'text' })
  dobEnc: string;

  @Column({ name: 'gender_enc', type: 'text' })
  genderEnc: string;

  @Column({ name: 'hometown_enc', type: 'text' })
  hometownEnc: string;

  @Column({ name: 'address_enc', type: 'text' })
  addressEnc: string;

  @Column({ name: 'nationality_enc', type: 'text', nullable: true })
  nationalityEnc: string;

  @Column({ name: 'cccd_number_enc', type: 'text', unique: true })
  cccdNumberEnc: string;

  @Column({ name: 'cccd_issue_date_enc', type: 'text', nullable: true })
  cccdIssueDateEnc: string;

  @Column({ name: 'cccd_expiry_enc', type: 'text' })
  cccdExpiryEnc: string;

  @Column({ name: 'cccd_issued_by_enc', type: 'text', nullable: true })
  cccdIssuedByEnc: string;

  // ── Integrity hash ─────────────────────────
  @Column({ name: 'data_hash' })
  dataHash: string;

  // ── KYC ────────────────────────────────────
  @Column({ name: 'kyc_status', type: 'varchar', default: KycStatus.PENDING })
  kycStatus: KycStatus;

  @Column({ name: 'kyc_verified_at', type: 'timestamptz', nullable: true })
  kycVerifiedAt: Date;

  @Column({ name: 'kyc_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  kycScore: number;

  @Column({ name: 'face_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  faceMatchScore: number;

  // ── KYC Session data (temporary, for session persistence) ──
  @Column({ name: 'cccd_data_json', type: 'jsonb', nullable: true })
  cccdDataJson: any;

  @Column({ name: 'cccd_hash', type: 'text', nullable: true })
  cccdHash: string;

  @Column({ name: 'face_result_json', type: 'jsonb', nullable: true })
  faceResultJson: any;

  @Column({ name: 'kyc_step', type: 'varchar', default: 'not_started' })
  kycStep: string;

  // ── CCCD Image filenames ───────────────────
  @Column({ name: 'cccd_front_filename', type: 'text', nullable: true })
  cccdFrontFilename: string;

  @Column({ name: 'cccd_back_filename', type: 'text', nullable: true })
  cccdBackFilename: string;

  // ── Blockchain tx ──────────────────────────
  @Column({ name: 'tx_hash', nullable: true })
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
