// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract CredentialRegistry is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    enum VCStatus { Active, Revoked, Expired, Suspended }

    struct CredentialRecord {
        string    vcId;           // urn:uuid:...
        string    vcType;         // IdentityCredential, AgeCredential...
        string    issuerDID;
        string    subjectDID;
        bytes32   credentialHash;
        VCStatus  status;
        uint256   issuedAt;
        uint256   expiresAt;
        uint256   revokedAt;
        bool      exists;
    }

    mapping(string  => CredentialRecord) private _credentials; 
    mapping(string  => string[])         private _subjectVCs;  

    event CredentialIssued(
        string indexed vcId,
        string indexed subjectDID,
        string         issuerDID,
        string         vcType,
        bytes32        credentialHash,
        uint256        expiresAt,
        uint256        timestamp
    );

    event CredentialRevoked(
        string indexed vcId,
        string indexed subjectDID,
        string         reason,
        uint256        timestamp
    );

    event CredentialStatusChanged(
        string   indexed vcId,
        VCStatus          oldStatus,
        VCStatus          newStatus,
        uint256           timestamp
    );

    modifier vcExists(string calldata vcId) {
        require(_credentials[vcId].exists, "VC: not found");
        _;
    }

    constructor() { _disableInitializers(); }

    function initialize(address admin) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
    }

    function issueCredential(
        string  calldata vcId,
        string  calldata vcType,
        string  calldata issuerDID,
        string  calldata subjectDID,
        bytes32          credentialHash,
        uint256          expiresAt
    )
        external
        onlyRole(ISSUER_ROLE)
    {
        require(!_credentials[vcId].exists,       "VC: already exists");
        require(bytes(vcId).length > 0,            "VC: empty vcId");
        require(credentialHash != bytes32(0),       "VC: empty hash");
        require(expiresAt > block.timestamp || expiresAt == 0, "VC: expiry in past");

        _credentials[vcId] = CredentialRecord({
            vcId:            vcId,
            vcType:          vcType,
            issuerDID:       issuerDID,
            subjectDID:      subjectDID,
            credentialHash:  credentialHash,
            status:          VCStatus.Active,
            issuedAt:        block.timestamp,
            expiresAt:       expiresAt,
            revokedAt:       0,
            exists:          true
        });

        _subjectVCs[subjectDID].push(vcId);

        emit CredentialIssued(vcId, subjectDID, issuerDID, vcType, credentialHash, expiresAt, block.timestamp);
    }


    function revokeCredential(string calldata vcId, string calldata reason)
        external
        onlyRole(ISSUER_ROLE)
        vcExists(vcId)
    {
        require(_credentials[vcId].status == VCStatus.Active, "VC: not active");

        VCStatus old = _credentials[vcId].status;
        _credentials[vcId].status    = VCStatus.Revoked;
        _credentials[vcId].revokedAt = block.timestamp;

        emit CredentialRevoked(vcId, _credentials[vcId].subjectDID, reason, block.timestamp);
        emit CredentialStatusChanged(vcId, old, VCStatus.Revoked, block.timestamp);
    }


    function verifyCredential(string calldata vcId, bytes32 hashToVerify)
        external view
        vcExists(vcId)
        returns (bool valid, string memory reason)
    {
        CredentialRecord storage vc = _credentials[vcId];

        if (vc.status == VCStatus.Revoked)   return (false, "REVOKED");
        if (vc.status == VCStatus.Suspended) return (false, "SUSPENDED");
        if (vc.expiresAt > 0 && block.timestamp > vc.expiresAt) return (false, "EXPIRED");
        if (vc.credentialHash != hashToVerify) return (false, "HASH_MISMATCH");

        return (true, "VALID");
    }

    function getCredential(string calldata vcId)
        external view
        vcExists(vcId)
        returns (CredentialRecord memory)
    {
        return _credentials[vcId];
    }

    function getSubjectCredentials(string calldata subjectDID)
        external view
        returns (string[] memory)
    {
        return _subjectVCs[subjectDID];
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}
}
