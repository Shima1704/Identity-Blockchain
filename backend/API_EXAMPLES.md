# Admin API - Ví dụ curl

## 1. Admin Login

### Request
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin@123"
  }'
```

### Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDUzMjE2MDAsImV4cCI6MTcwNTMyNTIwMH0.abc123...",
  "admin": {
    "id": "admin",
    "username": "admin"
  }
}
```

### Lưu token
```bash
# Linux/Mac
TOKEN=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin@123"}' \
  | jq -r '.access_token')

# Windows PowerShell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"username":"admin","password":"admin@123"}'
$TOKEN = ($response.Content | ConvertFrom-Json).access_token
```

## 2. Dashboard Statistics

### Request
```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### Response
```json
{
  "total_users": 150,
  "active_users": 145,
  "kyc_verified": 120,
  "kyc_pending": 20,
  "kyc_rejected": 5,
  "blockchain_records": 120
}
```

## 3. Get All Users

### Request
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### Response
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "0901234567",
    "email": "user@example.com",
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "role": "user",
    "isActive": true,
    "isLocked": false,
    "kycStatus": "verified",
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-10T08:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "phone": "0909876543",
    "email": "user2@example.com",
    "firstName": "Trần",
    "lastName": "Thị B",
    "role": "user",
    "isActive": true,
    "isLocked": false,
    "kycStatus": "pending",
    "lastLoginAt": null,
    "createdAt": "2024-01-14T08:00:00Z"
  }
]
```

## 4. Get User Details

### Request
```bash
curl -X GET http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

### Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "0901234567",
  "email": "user@example.com",
  "firstName": "Nguyễn",
  "lastName": "Văn A",
  "role": "user",
  "isActive": true,
  "isLocked": false,
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "identity": {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "did": "did:vnchain:0x123abc456def789ghi",
    "kycStatus": "verified",
    "kycScore": 95,
    "faceMatchScore": 0.97,
    "txHash": "0xabc123def456ghi789jkl",
    "blockNumber": 12345,
    "kycVerifiedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-10T08:00:00Z",
    "profile": {
      "full_name": "NGUYỄN VĂN A",
      "dob": "01/01/1990",
      "age": 34,
      "gender": "Nam",
      "hometown": "Hà Nội",
      "address": "123 Đường Test, Quận 1, TP.HCM",
      "nationality": "Việt Nam",
      "cccd_number": "012345678901",
      "cccd_expiry": "01/01/2035",
      "cccd_front_url": "/kyc/cccd-images/8a14463d-d54e-4419-b4b4-d55d4903f3d2.jpg",
      "cccd_back_url": "/kyc/cccd-images/e5b5f4ff-0d07-446c-9797-b6464e9fa999.jpg"
    }
  }
}
```

## 5. Get Blockchain Records

### Request
```bash
curl -X GET http://localhost:3000/api/admin/blockchain \
  -H "Authorization: Bearer $TOKEN"
```

### Response
```json
[
  {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "userName": "Nguyễn Văn A",
    "did": "did:vnchain:0x123abc456def789ghi",
    "kycStatus": "verified",
    "kycScore": 95,
    "faceMatchScore": 0.97,
    "dataHash": "0xdata123...",
    "txHash": "0xabc123def456ghi789jkl",
    "blockNumber": 12345,
    "kycVerifiedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-10T08:00:00Z"
  },
  {
    "id": "660f8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "userName": "Trần Thị B",
    "did": "did:vnchain:0xdef456ghi789jkl123abc",
    "kycStatus": "processing",
    "kycScore": 75,
    "faceMatchScore": 0.85,
    "dataHash": "0xdata456...",
    "txHash": "0xdef456ghi789jkl123abc",
    "blockNumber": 12346,
    "kycVerifiedAt": null,
    "createdAt": "2024-01-14T08:00:00Z"
  }
]
```

## Script Test Tất Cả Endpoints (Bash)

Lưu vào file `test-admin-api.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000"

echo "=== Admin API Test ==="
echo

# 1. Login
echo "1. Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin@123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
echo "Token: ${TOKEN:0:50}..."
echo

# 2. Dashboard
echo "2. Dashboard Statistics..."
curl -s -X GET $API_URL/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo

# 3. Users List
echo "3. Users List..."
curl -s -X GET $API_URL/api/admin/users \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:2]'
echo

# 4. Get User Detail (first user)
echo "4. User Detail..."
USER_ID=$(curl -s -X GET $API_URL/api/admin/users \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
echo "User ID: $USER_ID"
curl -s -X GET $API_URL/api/admin/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.id, .email, .identity.did'
echo

# 5. Blockchain Records
echo "5. Blockchain Records..."
curl -s -X GET $API_URL/api/admin/blockchain \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:2]'
echo

echo "=== Test Complete ==="
```

Chạy:
```bash
chmod +x test-admin-api.sh
./test-admin-api.sh
```

## Script Test Tất Cả Endpoints (PowerShell)

Lưu vào file `test-admin-api.ps1`:

```powershell
$ApiUrl = "http://localhost:3000"

Write-Host "=== Admin API Test ===" -ForegroundColor Green

# 1. Login
Write-Host "`n1. Admin Login..." -ForegroundColor Cyan
$loginResponse = Invoke-WebRequest -Uri "$ApiUrl/api/admin/login" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body '{"username":"admin","password":"admin@123"}'

$loginData = $loginResponse.Content | ConvertFrom-Json
$token = $loginData.access_token
Write-Host "Token: $($token.Substring(0, 50))..."

# 2. Dashboard
Write-Host "`n2. Dashboard Statistics..." -ForegroundColor Cyan
$dashResponse = Invoke-WebRequest -Uri "$ApiUrl/api/admin/dashboard" `
  -Method GET `
  -Headers @{"Authorization" = "Bearer $token"}
$dashResponse.Content | ConvertFrom-Json | Format-Table

# 3. Users List
Write-Host "`n3. Users List..." -ForegroundColor Cyan
$usersResponse = Invoke-WebRequest -Uri "$ApiUrl/api/admin/users" `
  -Method GET `
  -Headers @{"Authorization" = "Bearer $token"}
$users = $usersResponse.Content | ConvertFrom-Json
$users | Select-Object -First 2 | Format-Table

# 4. Blockchain Records
Write-Host "`n4. Blockchain Records..." -ForegroundColor Cyan
$bcResponse = Invoke-WebRequest -Uri "$ApiUrl/api/admin/blockchain" `
  -Method GET `
  -Headers @{"Authorization" = "Bearer $token"}
$bcRecords = $bcResponse.Content | ConvertFrom-Json
$bcRecords | Select-Object -First 2 | Format-Table

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
```

Chạy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
./test-admin-api.ps1
```

## Lỗi Thường Gặp

### 401 - Unauthorized
```
{
  "statusCode": 401,
  "message": "Token không hợp lệ",
  "error": "Unauthorized"
}
```

**Giải pháp**:
- Kiểm tra token được lưu đúng
- Kiểm tra token không hết hạn
- Đăng nhập lại để lấy token mới

### 403 - Forbidden
```
{
  "statusCode": 403,
  "message": "Không có quyền truy cập (yêu cầu admin)",
  "error": "Forbidden"
}
```

**Giải pháp**:
- Token phải từ admin account
- Kiểm tra role trong token

### 404 - Not Found
```
{
  "statusCode": 404,
  "message": "Người dùng không tồn tại",
  "error": "Not Found"
}
```

**Giải pháp**:
- Kiểm tra user ID chính xác
- Kiểm tra user đã được tạo

## Response Status Codes

| Code | Ý nghĩa |
|------|---------|
| 200 | OK - Thành công |
| 201 | Created - Tạo thành công |
| 400 | Bad Request - Request sai |
| 401 | Unauthorized - Cần authentication |
| 403 | Forbidden - Không có quyền |
| 404 | Not Found - Không tìm thấy |
| 500 | Internal Server Error - Lỗi server |

## Headers Cần Thiết

```bash
# Tất cả endpoints (trừ login)
Authorization: Bearer {access_token}
Content-Type: application/json
```

## Note

- Token có hiệu lực trong 1 giờ (configurable)
- Giữ token an toàn và không chia sẻ
- Trong production, dùng HTTPS
- Log tất cả admin operations
