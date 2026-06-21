
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(15) UNIQUE,
    email           VARCHAR(255) UNIQUE,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'admin', 'verifier', 'issuer')),
    is_active       BOOLEAN DEFAULT TRUE,
    is_locked       BOOLEAN DEFAULT FALSE,
    locked_until    TIMESTAMPTZ,
    login_attempts  INTEGER DEFAULT 0,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẢNG 2: identities — Thông tin định danh (dữ liệu mã hóa AES-256)
-- ============================================================
CREATE TABLE identities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- DID trên Blockchain
    did             TEXT UNIQUE NOT NULL,       -- did:vnchain:0x...
    did_status      VARCHAR(20) DEFAULT 'active'
                    CHECK (did_status IN ('active', 'revoked', 'suspended')),

    -- Dữ liệu cá nhân mã hóa AES-256 (lưu dạng BYTEA)
    full_name_enc   BYTEA NOT NULL,             -- Họ và tên
    dob_enc         BYTEA NOT NULL,             -- Ngày tháng năm sinh
    gender_enc      BYTEA NOT NULL,             -- Giới tính
    hometown_enc    BYTEA NOT NULL,             -- Quê quán
    address_enc     BYTEA NOT NULL,             -- Địa chỉ thường trú
    nationality_enc BYTEA NOT NULL,             -- Quốc tịch
    cccd_number_enc BYTEA NOT NULL UNIQUE,      -- Số CCCD (12 chữ số)
    cccd_issue_date_enc BYTEA,                  -- Ngày cấp CCCD
    cccd_expiry_enc BYTEA NOT NULL,             -- Ngày hết hạn CCCD
    cccd_issued_by_enc  BYTEA,                  -- Nơi cấp CCCD

    -- Hash để verify toàn vẹn (không mã hóa)
    data_hash       TEXT NOT NULL,              -- SHA-256 của toàn bộ dữ liệu

    -- KYC status
    kyc_status      VARCHAR(20) DEFAULT 'pending'
                    CHECK (kyc_status IN ('pending', 'processing', 'verified', 'rejected', 'expired')),
    kyc_verified_at TIMESTAMPTZ,
    kyc_expires_at  TIMESTAMPTZ,
    kyc_score       DECIMAL(5,2),               -- 0.00 - 100.00

    -- Blockchain reference
    tx_hash         TEXT,                       -- Transaction hash khi ghi lên chain
    block_number    BIGINT,
    chain_id        INTEGER DEFAULT 1,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

-- ============================================================
-- BẢNG 3: face_verifications — Kết quả xác minh khuôn mặt
-- ============================================================
CREATE TABLE face_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id     UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,

    -- Kết quả (không lưu ảnh — xóa ngay sau xác minh)
    liveness_score  DECIMAL(5,2) NOT NULL,      -- % liveness confidence
    match_score     DECIMAL(5,2) NOT NULL,      -- % face match với CCCD
    is_liveness_pass BOOLEAN NOT NULL,
    is_match_pass   BOOLEAN NOT NULL,
    spoof_detected  BOOLEAN DEFAULT FALSE,

    -- Thiết bị
    device_info     JSONB,                      -- {os, browser, ip}
    attempt_number  INTEGER DEFAULT 1,

    -- Trạng thái
    status          VARCHAR(20) DEFAULT 'passed'
                    CHECK (status IN ('passed', 'failed', 'spoof_detected')),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẢNG 4: cccd_scans — Kết quả quét CCCD
-- ============================================================
CREATE TABLE cccd_scans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id     UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,

    -- OCR result metadata (không lưu ảnh gốc)
    scan_method     VARCHAR(10) DEFAULT 'ocr'
                    CHECK (scan_method IN ('ocr', 'nfc', 'upload')),
    ocr_confidence  DECIMAL(5,2),               -- % OCR accuracy
    is_valid_format BOOLEAN NOT NULL,           -- Đúng định dạng 12 số
    is_expired      BOOLEAN DEFAULT FALSE,

    -- Trạng thái
    status          VARCHAR(20) DEFAULT 'success'
                    CHECK (status IN ('success', 'failed', 'low_quality')),
    failure_reason  TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẢNG 5: user_wallets — Ví số (chỉ lưu public key)
-- ============================================================
CREATE TABLE user_wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Chỉ lưu public key, private key KHÔNG BAO GIỜ lưu server
    wallet_address  TEXT UNIQUE NOT NULL,       -- Địa chỉ ví Ethereum
    public_key      TEXT NOT NULL,              -- Ed25519 / secp256k1 public key
    key_algorithm   VARCHAR(20) DEFAULT 'secp256k1'
                    CHECK (key_algorithm IN ('secp256k1', 'ed25519')),

    is_primary      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẢNG 6: verifiable_credentials — Chứng chỉ số
-- ============================================================
CREATE TABLE verifiable_credentials (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id     UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,

    -- VC metadata
    vc_id           TEXT UNIQUE NOT NULL,       -- urn:uuid:...
    vc_type         VARCHAR(50) NOT NULL,       -- IdentityCredential, AgeCredential...
    issuer_did      TEXT NOT NULL,              -- DID của tổ chức phát hành
    subject_did     TEXT NOT NULL,              -- DID của chủ thể

    -- VC data (JWT / JSON-LD dạng mã hóa)
    credential_enc  BYTEA NOT NULL,

    -- Validity
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    is_revoked      BOOLEAN DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,
    revoke_reason   TEXT,

    -- Blockchain
    tx_hash         TEXT,
    block_number    BIGINT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẢNG 7: access_grants — Quyền chia sẻ dữ liệu
-- ============================================================
CREATE TABLE access_grants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id     UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,

    -- Tổ chức được cấp quyền
    verifier_did    TEXT NOT NULL,
    verifier_name   TEXT,

    -- Phạm vi dữ liệu được chia sẻ (JSON array)
    -- VD: ["full_name", "dob", "nationality"]
    allowed_fields  JSONB NOT NULL DEFAULT '[]',

    -- Thời hạn
    granted_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    is_revoked      BOOLEAN DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,

    -- Blockchain reference (ghi lên Smart Contract)
    tx_hash         TEXT,

    -- Purpose
    purpose         TEXT,                       -- Lý do chia sẻ

    UNIQUE(identity_id, verifier_did)
);

-- ============================================================
-- BẢNG 8: audit_logs — Nhật ký bất biến
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    identity_did    TEXT,

    -- Sự kiện
    event_type      VARCHAR(50) NOT NULL,
    -- Các loại: REGISTER, KYC_START, KYC_COMPLETE, LOGIN,
    --           FACE_VERIFY, CCCD_SCAN, DATA_SHARE, ACCESS_REVOKE,
    --           DID_REVOKE, CREDENTIAL_ISSUE, SECURITY_ALERT

    event_status    VARCHAR(20) DEFAULT 'success'
                    CHECK (event_status IN ('success', 'failed', 'suspicious')),

    -- Metadata (không chứa dữ liệu nhạy cảm)
    metadata        JSONB DEFAULT '{}',

    -- Blockchain (bản ghi quan trọng được ghi lên chain)
    tx_hash         TEXT,
    is_on_chain     BOOLEAN DEFAULT FALSE,

    -- Request info
    ip_address      INET,
    user_agent      TEXT,

    -- Timestamp bất biến (không UPDATE)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẢNG 9: organizations — Tổ chức tích hợp (verifier / issuer)
-- ============================================================
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    did             TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    type            VARCHAR(30) NOT NULL
                    CHECK (type IN ('bank', 'hospital', 'government', 'university', 'enterprise', 'other')),
    wallet_address  TEXT UNIQUE,
    public_key      TEXT,
    is_trusted      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_phone         ON users(phone);
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_identities_user_id  ON identities(user_id);
CREATE INDEX idx_identities_did      ON identities(did);
CREATE INDEX idx_identities_kyc      ON identities(kyc_status);
CREATE INDEX idx_face_identity_id    ON face_verifications(identity_id);
CREATE INDEX idx_vc_identity_id      ON verifiable_credentials(identity_id);
CREATE INDEX idx_vc_subject_did      ON verifiable_credentials(subject_did);
CREATE INDEX idx_grants_identity     ON access_grants(identity_id);
CREATE INDEX idx_grants_verifier     ON access_grants(verifier_did);
CREATE INDEX idx_audit_user_id       ON audit_logs(user_id);
CREATE INDEX idx_audit_did           ON audit_logs(identity_did);
CREATE INDEX idx_audit_event_type    ON audit_logs(event_type);
CREATE INDEX idx_audit_created_at    ON audit_logs(created_at DESC);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_identities_updated_at
    BEFORE UPDATE ON identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEW: identity_summary (không expose dữ liệu mã hóa)
-- ============================================================
CREATE VIEW identity_summary AS
SELECT
    i.id,
    i.did,
    i.did_status,
    i.kyc_status,
    i.kyc_verified_at,
    i.kyc_expires_at,
    i.kyc_score,
    i.tx_hash,
    i.block_number,
    i.created_at,
    u.phone,
    u.email,
    u.role,
    u.is_active
FROM identities i
JOIN users u ON u.id = i.user_id;
