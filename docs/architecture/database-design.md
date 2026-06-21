# VNChain — Thiết kế Cơ sở Dữ liệu & Smart Contract

## Kiến trúc Hybrid (Off-chain + On-chain)

```
┌─────────────────────────────────────────────────────────┐
│                      NGƯỜI DÙNG                          │
└─────────────────────────┬───────────────────────────────┘
                          │
               ┌──────────▼──────────┐
               │    Backend API      │
               │    (NestJS)         │
               └──────┬──────┬───────┘
                      │      │
        ┌─────────────▼──┐  ┌▼──────────────────┐
        │  PostgreSQL DB  │  │   Blockchain       │
        │  (dữ liệu mã hóa)│  │  (hash + DID)      │
        └─────────────────┘  └────────────────────┘
```

## Nguyên tắc phân chia dữ liệu

| Dữ liệu | PostgreSQL | Blockchain |
|---------|-----------|------------|
| Tên, ngày sinh, quê quán, địa chỉ | ✅ Mã hóa AES-256 | ❌ |
| Ảnh CCCD, ảnh khuôn mặt | ❌ Xóa ngay sau OCR | ❌ |
| DID (định danh) | ✅ Lưu tham chiếu | ✅ Primary |
| Hash dữ liệu | ✅ Backup | ✅ Primary |
| Trạng thái KYC | ✅ | ✅ |
| Lịch sử giao dịch | ✅ | ✅ Bất biến |
| Quyền truy cập | ✅ | ✅ |
| Private key | ❌ KHÔNG BAO GIỜ | ❌ KHÔNG BAO GIỜ |

## Smart Contracts

### 1. IdentityRegistry.sol
- Lưu DID, dataHash, cccdHash, trạng thái KYC
- Chống replay attack với nonce
- Version history bất biến
- Upgradeable (UUPS proxy)

### 2. CredentialRegistry.sol
- Phát hành và thu hồi Verifiable Credentials
- Xác minh hash VC

### 3. DataAccessControl.sol
- Cấp/thu hồi quyền truy cập theo từng trường dữ liệu
- Hỗ trợ thời hạn (expiry)

## Cách chạy

```bash
# Compile contracts
cd contracts && npm install && npx hardhat compile

# Chạy local node
npx hardhat node

# Deploy
npx hardhat run scripts/deploy.js --network localhost

# Test
npx hardhat test
```

## Schema PostgreSQL

9 bảng chính:
- `users` — Tài khoản hệ thống
- `identities` — Thông tin định danh mã hóa
- `face_verifications` — Kết quả xác minh khuôn mặt
- `cccd_scans` — Kết quả quét CCCD
- `user_wallets` — Ví số (chỉ public key)
- `verifiable_credentials` — Chứng chỉ số
- `access_grants` — Quyền chia sẻ dữ liệu
- `audit_logs` — Nhật ký bất biến
- `organizations` — Tổ chức tích hợp
