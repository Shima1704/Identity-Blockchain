// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract DataAccessControl is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct AccessPolicy {
        string   subjectDID;
        string   verifierDID;
        string[] allowedFields;   // ["full_name", "dob", "nationality", ...]
        string   purpose;
        uint256  grantedAt;
        uint256  expiresAt;       // 0 = không hết hạn
        bool     isActive;
    }

    mapping(bytes32 => AccessPolicy) private _policies;

    mapping(string => string[])      private _subjectVerifiers;

    string[] public validFields;

    event AccessGranted(
        string  indexed subjectDID,
        string  indexed verifierDID,
        string[]        allowedFields,
        string          purpose,
        uint256         expiresAt,
        uint256         timestamp
    );

    event AccessRevoked(
        string indexed subjectDID,
        string indexed verifierDID,
        uint256        timestamp
    );

    event AccessChecked(
        string indexed subjectDID,
        string indexed verifierDID,
        bool           granted,
        uint256        timestamp
    );

    modifier validDID(string calldata did) {
        require(bytes(did).length > 10, "Access: invalid DID");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);

        // Khởi tạo danh sách trường hợp lệ
        validFields = [
            "full_name", "dob", "gender", "hometown",
            "address", "nationality", "cccd_number",
            "cccd_expiry", "kyc_status", "kyc_score"
        ];
    }

    
    function grantAccess(
        string   calldata subjectDID,
        string   calldata verifierDID,
        string[] calldata allowedFields,
        string   calldata purpose,
        uint256           expiresAt
    )
        external
        validDID(subjectDID)
        validDID(verifierDID)
    {
        require(allowedFields.length > 0,     "Access: no fields specified");
        require(allowedFields.length <= 10,   "Access: too many fields");
        require(
            expiresAt == 0 || expiresAt > block.timestamp,
            "Access: expiry in past"
        );

        bytes32 key = _policyKey(subjectDID, verifierDID);

        if (!_policies[key].isActive) {
            _subjectVerifiers[subjectDID].push(verifierDID);
        }

        _policies[key] = AccessPolicy({
            subjectDID:    subjectDID,
            verifierDID:   verifierDID,
            allowedFields: allowedFields,
            purpose:       purpose,
            grantedAt:     block.timestamp,
            expiresAt:     expiresAt,
            isActive:      true
        });

        emit AccessGranted(subjectDID, verifierDID, allowedFields, purpose, expiresAt, block.timestamp);
    }


    function revokeAccess(
        string calldata subjectDID,
        string calldata verifierDID
    )
        external
        validDID(subjectDID)
    {
        bytes32 key = _policyKey(subjectDID, verifierDID);
        require(_policies[key].isActive, "Access: policy not found or inactive");

        _policies[key].isActive = false;

        emit AccessRevoked(subjectDID, verifierDID, block.timestamp);
    }


    function hasAccess(
        string calldata subjectDID,
        string calldata verifierDID,
        string calldata field
    )
        external view
        returns (bool)
    {
        bytes32 key = _policyKey(subjectDID, verifierDID);
        AccessPolicy storage policy = _policies[key];

        if (!policy.isActive) return false;
        if (policy.expiresAt > 0 && block.timestamp > policy.expiresAt) return false;

        for (uint i = 0; i < policy.allowedFields.length; i++) {
            if (keccak256(bytes(policy.allowedFields[i])) == keccak256(bytes(field))) {
                return true;
            }
        }
        return false;
    }

    function getActiveVerifiers(string calldata subjectDID)
        external view
        returns (string[] memory activeVerifiers, string[][] memory fieldsList)
    {
        string[] storage allVerifiers = _subjectVerifiers[subjectDID];
        uint256 count = 0;

        // Đếm active verifiers
        for (uint i = 0; i < allVerifiers.length; i++) {
            bytes32 key = _policyKey(subjectDID, allVerifiers[i]);
            AccessPolicy storage p = _policies[key];
            if (p.isActive && (p.expiresAt == 0 || block.timestamp <= p.expiresAt)) {
                count++;
            }
        }

        activeVerifiers = new string[](count);
        fieldsList      = new string[][](count);
        uint256 idx = 0;

        for (uint i = 0; i < allVerifiers.length; i++) {
            bytes32 key = _policyKey(subjectDID, allVerifiers[i]);
            AccessPolicy storage p = _policies[key];
            if (p.isActive && (p.expiresAt == 0 || block.timestamp <= p.expiresAt)) {
                activeVerifiers[idx] = allVerifiers[i];
                fieldsList[idx]      = p.allowedFields;
                idx++;
            }
        }
    }

    function getPolicy(string calldata subjectDID, string calldata verifierDID)
        external view
        returns (AccessPolicy memory)
    {
        return _policies[_policyKey(subjectDID, verifierDID)];
    }

    function _policyKey(string memory a, string memory b) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(a, "|", b));
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}
}
