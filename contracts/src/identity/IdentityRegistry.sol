// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract IdentityRegistry is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ─── Roles ───────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE   = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ─── Enums ───────────────────────────────────────────────
    enum DIDStatus    { Active, Revoked, Suspended }
    enum KYCStatus    { Pending, Processing, Verified, Rejected, Expired }

    // ─── Structs ─────────────────────────────────────────────

    struct IdentityRecord {
        string  did;              // did:vnchain:0x...
        address walletAddress;    // Địa chỉ ví của chủ thể
        bytes32 dataHash;         // SHA-256 của toàn bộ dữ liệu cá nhân (từ DB)
        bytes32 cccdHash;         // SHA-256 của số CCCD (để kiểm tra trùng lặp)
        DIDStatus  didStatus;
        KYCStatus  kycStatus;
        uint256 kycScore;         // 0–10000 (đại diện 0.00%–100.00%)
        uint256 createdAt;
        uint256 updatedAt;
        uint256 verifiedAt;
        uint256 revokedAt;
        bool    exists;
    }

    struct DataVersion {
        bytes32 dataHash;
        uint256 timestamp;
        string  changeNote;       // "KYC_COMPLETE", "DATA_UPDATE", v.v.
    }


    // DID → IdentityRecord
    mapping(string  => IdentityRecord)    private _records;

    // Wallet address → DID
    mapping(address => string)            private _walletToDID;

    // CCCD hash → DID (chống đăng ký trùng)
    mapping(bytes32 => string)            private _cccdToDID;

    // DID → Lịch sử phiên bản dữ liệu
    mapping(string  => DataVersion[])     private _dataHistory;

    // Tổng số DID đã đăng ký
    uint256 public totalIdentities;

    // Nonce chống replay attack
    mapping(address => uint256)           private _nonces;

    // ─── Events ──────────────────────────────────────────────
    event DIDRegistered(
        string  indexed did,
        address indexed walletAddress,
        bytes32         dataHash,
        uint256         timestamp
    );

    event DIDStatusChanged(
        string  indexed did,
        DIDStatus       oldStatus,
        DIDStatus       newStatus,
        string          reason,
        uint256         timestamp
    );

    event KYCStatusUpdated(
        string  indexed did,
        KYCStatus       oldStatus,
        KYCStatus       newStatus,
        uint256         kycScore,
        uint256         timestamp
    );

    event DataHashUpdated(
        string  indexed did,
        bytes32         oldHash,
        bytes32         newHash,
        string          changeNote,
        uint256         timestamp
    );

    event AccessGranted(
        string  indexed subjectDID,
        string  indexed verifierDID,
        string[]        allowedFields,
        uint256         expiresAt,
        uint256         timestamp
    );

    event AccessRevoked(
        string  indexed subjectDID,
        string  indexed verifierDID,
        uint256         timestamp
    );

    event SecurityAlert(
        string  indexed did,
        address indexed actor,
        string          alertType,
        uint256         timestamp
    );


    modifier didExists(string calldata did) {
        require(_records[did].exists, "Identity: DID not found");
        _;
    }

    modifier didActive(string calldata did) {
        require(_records[did].didStatus == DIDStatus.Active, "Identity: DID not active");
        _;
    }

    modifier onlyDIDOwner(string calldata did) {
        require(
            _records[did].walletAddress == msg.sender,
            "Identity: caller is not DID owner"
        );
        _;
    }

    modifier validNonce(address account, uint256 nonce) {
        require(_nonces[account] == nonce, "Identity: invalid nonce (replay attack)");
        _;
        _nonces[account]++;
    }

    constructor() { _disableInitializers(); }

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(OPERATOR_ROLE,      admin);
    }

    function registerDID(
        string  calldata did,
        bytes32          dataHash,
        bytes32          cccdHash,
        uint256          nonce
    )
        external
        whenNotPaused
        validNonce(msg.sender, nonce)
    {
        require(bytes(did).length > 0,            "Identity: DID cannot be empty");
        require(!_records[did].exists,             "Identity: DID already registered");
        require(bytes(_walletToDID[msg.sender]).length == 0, "Identity: wallet already has DID");
        require(bytes(_cccdToDID[cccdHash]).length == 0,     "Identity: CCCD already registered");
        require(dataHash != bytes32(0),            "Identity: dataHash cannot be zero");
        require(cccdHash != bytes32(0),            "Identity: cccdHash cannot be zero");

        _records[did] = IdentityRecord({
            did:           did,
            walletAddress: msg.sender,
            dataHash:      dataHash,
            cccdHash:      cccdHash,
            didStatus:     DIDStatus.Active,
            kycStatus:     KYCStatus.Pending,
            kycScore:      0,
            createdAt:     block.timestamp,
            updatedAt:     block.timestamp,
            verifiedAt:    0,
            revokedAt:     0,
            exists:        true
        });

        _walletToDID[msg.sender] = did;
        _cccdToDID[cccdHash]     = did;
        totalIdentities++;

        // Ghi version đầu tiên
        _dataHistory[did].push(DataVersion({
            dataHash:   dataHash,
            timestamp:  block.timestamp,
            changeNote: "INITIAL_REGISTRATION"
        }));

        emit DIDRegistered(did, msg.sender, dataHash, block.timestamp);
    }

    function updateKYCStatus(
        string    calldata did,
        KYCStatus          status,
        uint256            kycScore
    )
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        didExists(did)
    {
        require(kycScore <= 10000, "Identity: kycScore max 10000");

        IdentityRecord storage record = _records[did];
        KYCStatus oldStatus = record.kycStatus;

        record.kycStatus = status;
        record.kycScore  = kycScore;
        record.updatedAt = block.timestamp;

        if (status == KYCStatus.Verified) {
            record.verifiedAt = block.timestamp;
        }

        emit KYCStatusUpdated(did, oldStatus, status, kycScore, block.timestamp);
    }

    function updateDataHash(
        string   calldata did,
        bytes32           newDataHash,
        string   calldata changeNote
    )
        external
        whenNotPaused
        didExists(did)
        didActive(did)
        onlyDIDOwner(did)
    {
        require(newDataHash != bytes32(0), "Identity: hash cannot be zero");
        require(newDataHash != _records[did].dataHash, "Identity: hash unchanged");

        bytes32 oldHash = _records[did].dataHash;
        _records[did].dataHash  = newDataHash;
        _records[did].updatedAt = block.timestamp;

        // Lưu version history — KHÔNG XÓA version cũ
        _dataHistory[did].push(DataVersion({
            dataHash:   newDataHash,
            timestamp:  block.timestamp,
            changeNote: changeNote
        }));

        emit DataHashUpdated(did, oldHash, newDataHash, changeNote, block.timestamp);
    }

    function revokeDID(
        string calldata did,
        string calldata reason
    )
        external
        whenNotPaused
        didExists(did)
    {

        require(
            _records[did].walletAddress == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Identity: not authorized to revoke"
        );
        require(
            _records[did].didStatus != DIDStatus.Revoked,
            "Identity: already revoked"
        );

        DIDStatus oldStatus = _records[did].didStatus;
        _records[did].didStatus  = DIDStatus.Revoked;
        _records[did].revokedAt  = block.timestamp;
        _records[did].updatedAt  = block.timestamp;

        emit DIDStatusChanged(did, oldStatus, DIDStatus.Revoked, reason, block.timestamp);
    }

    function grantAccess(
        string   calldata subjectDID,
        string   calldata verifierDID,
        string[] calldata allowedFields,
        uint256           expiresAt
    )
        external
        whenNotPaused
        didExists(subjectDID)
        didActive(subjectDID)
        onlyDIDOwner(subjectDID)
    {
        require(bytes(verifierDID).length > 0,    "Identity: verifierDID empty");
        require(allowedFields.length > 0,          "Identity: no fields specified");
        require(expiresAt > block.timestamp,       "Identity: expiry in the past");

        emit AccessGranted(subjectDID, verifierDID, allowedFields, expiresAt, block.timestamp);
    }

    function revokeAccess(
        string calldata subjectDID,
        string calldata verifierDID
    )
        external
        whenNotPaused
        didExists(subjectDID)
        onlyDIDOwner(subjectDID)
    {
        emit AccessRevoked(subjectDID, verifierDID, block.timestamp);
    }


    function reportSecurityAlert(
        string  calldata did,
        address          actor,
        string  calldata alertType
    )
        external
        onlyRole(OPERATOR_ROLE)
    {
        emit SecurityAlert(did, actor, alertType, block.timestamp);
    }

    function getIdentity(string calldata did)
        external view
        didExists(did)
        returns (IdentityRecord memory)
    {
        return _records[did];
    }

    /// @notice Lấy DID từ địa chỉ ví
    function getDIDByWallet(address wallet)
        external view
        returns (string memory)
    {
        return _walletToDID[wallet];
    }

    /// @notice Kiểm tra CCCD đã đăng ký chưa
    function isCCCDRegistered(bytes32 cccdHash)
        external view
        returns (bool)
    {
        return bytes(_cccdToDID[cccdHash]).length > 0;
    }

    /// @notice Kiểm tra DID hợp lệ và active
    function isValidDID(string calldata did)
        external view
        returns (bool)
    {
        return _records[did].exists &&
               _records[did].didStatus == DIDStatus.Active;
    }

    /// @notice Kiểm tra KYC đã verified chưa
    function isKYCVerified(string calldata did)
        external view
        returns (bool)
    {
        return _records[did].exists &&
               _records[did].kycStatus == KYCStatus.Verified;
    }

    /// @notice Lấy lịch sử phiên bản dữ liệu
    function getDataHistory(string calldata did)
        external view
        didExists(did)
        returns (DataVersion[] memory)
    {
        return _dataHistory[did];
    }

    /// @notice Xác minh tính toàn vẹn dữ liệu
    function verifyDataIntegrity(string calldata did, bytes32 hashToVerify)
        external view
        didExists(did)
        returns (bool)
    {
        return _records[did].dataHash == hashToVerify;
    }

    /// @notice Lấy nonce hiện tại của địa chỉ ví
    function getNonce(address account)
        external view
        returns (uint256)
    {
        return _nonces[account];
    }

    // ─── Admin Functions ─────────────────────────────────────

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function suspendDID(string calldata did, string calldata reason)
        external
        onlyRole(ADMIN_ROLE)
        didExists(did)
    {
        DIDStatus old = _records[did].didStatus;
        _records[did].didStatus = DIDStatus.Suspended;
        _records[did].updatedAt = block.timestamp;
        emit DIDStatusChanged(did, old, DIDStatus.Suspended, reason, block.timestamp);
    }

    function unsuspendDID(string calldata did)
        external
        onlyRole(ADMIN_ROLE)
        didExists(did)
    {
        require(_records[did].didStatus == DIDStatus.Suspended, "Identity: not suspended");
        _records[did].didStatus = DIDStatus.Active;
        _records[did].updatedAt = block.timestamp;
        emit DIDStatusChanged(did, DIDStatus.Suspended, DIDStatus.Active, "UNSUSPENDED_BY_ADMIN", block.timestamp);
    }

    // ─── UUPS upgrade authorization ──────────────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(ADMIN_ROLE)
    {}
}
