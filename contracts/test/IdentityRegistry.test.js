const { expect }  = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("IdentityRegistry", function () {
  let registry, admin, user1, user2, operator;

  const mockDID      = "did:vnchain:0x1234567890abcdef";
  const mockDataHash = ethers.keccak256(ethers.toUtf8Bytes("NGUYEN VAN A|01/01/1990|Nam|Ha Noi"));
  const mockCCCDHash = ethers.keccak256(ethers.toUtf8Bytes("079304012345"));

  beforeEach(async () => {
    [admin, user1, user2, operator] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("IdentityRegistry");
    registry = await upgrades.deployProxy(Factory, [admin.address], { kind: "uups" });
    await registry.waitForDeployment();

    // Grant OPERATOR_ROLE
    const OPERATOR = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    await registry.connect(admin).grantRole(OPERATOR, operator.address);
  });

  describe("registerDID", () => {
    it("Đăng ký DID thành công", async () => {
      const nonce = await registry.getNonce(user1.address);
      await expect(registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce))
        .to.emit(registry, "DIDRegistered");

      const record = await registry.getIdentity(mockDID);
      expect(record.did).to.equal(mockDID);
      expect(record.walletAddress).to.equal(user1.address);
      expect(record.kycStatus).to.equal(0); // Pending
    });

    it("Không đăng ký DID trùng lặp", async () => {
      const nonce = await registry.getNonce(user1.address);
      await registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce);

      const nonce2 = await registry.getNonce(user1.address);
      await expect(
        registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce2)
      ).to.be.revertedWith("Identity: DID already registered");
    });

    it("Không đăng ký CCCD trùng từ ví khác", async () => {
      const nonce1 = await registry.getNonce(user1.address);
      await registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce1);

      const nonce2 = await registry.getNonce(user2.address);
      await expect(
        registry.connect(user2).registerDID("did:vnchain:0xabc", mockDataHash, mockCCCDHash, nonce2)
      ).to.be.revertedWith("Identity: CCCD already registered");
    });

    it("Chặn replay attack (sai nonce)", async () => {
      await expect(
        registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, 999)
      ).to.be.revertedWith("Identity: invalid nonce (replay attack)");
    });
  });

  describe("updateKYCStatus", () => {
    beforeEach(async () => {
      const nonce = await registry.getNonce(user1.address);
      await registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce);
    });

    it("Operator cập nhật KYC thành công", async () => {
      await expect(registry.connect(operator).updateKYCStatus(mockDID, 2, 9730)) // Verified, 97.30%
        .to.emit(registry, "KYCStatusUpdated");

      expect(await registry.isKYCVerified(mockDID)).to.be.true;
    });

    it("Non-operator không thể cập nhật KYC", async () => {
      await expect(
        registry.connect(user2).updateKYCStatus(mockDID, 2, 9730)
      ).to.be.reverted;
    });
  });

  describe("updateDataHash", () => {
    beforeEach(async () => {
      const nonce = await registry.getNonce(user1.address);
      await registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce);
    });

    it("Chủ DID cập nhật thông tin thành công", async () => {
      const newDataHash = ethers.keccak256(
        ethers.toUtf8Bytes("NGUYEN VAN A|02/02/1995|Nam|Da Nang")
      );

      await expect(
        registry.connect(user1).updateDataHash(mockDID, newDataHash, "PROFILE_UPDATE")
      )
        .to.emit(registry, "DataHashUpdated");

      const record = await registry.getIdentity(mockDID);
      expect(record.dataHash).to.equal(newDataHash);

      const history = await registry.getDataHistory(mockDID);
      expect(history.length).to.equal(2);
      expect(history[1].changeNote).to.equal("PROFILE_UPDATE");
      expect(history[1].dataHash).to.equal(newDataHash);
    });

    it("Không cho cập nhật nếu hash không đổi", async () => {
      await expect(
        registry.connect(user1).updateDataHash(mockDID, mockDataHash, "SAME_HASH")
      ).to.be.revertedWith("Identity: hash unchanged");
    });

    it("Không cho người khác cập nhật thông tin của DID", async () => {
      const newDataHash = ethers.keccak256(
        ethers.toUtf8Bytes("NGUYEN VAN A|02/02/1995|Nam|Da Nang")
      );

      await expect(
        registry.connect(user2).updateDataHash(mockDID, newDataHash, "PROFILE_UPDATE")
      ).to.be.revertedWith("Identity: caller is not DID owner");
    });
  });

  describe("revokeDID", () => {
    beforeEach(async () => {
      const nonce = await registry.getNonce(user1.address);
      await registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce);
    });

    it("Chủ DID tự thu hồi", async () => {
      await expect(registry.connect(user1).revokeDID(mockDID, "USER_REQUEST"))
        .to.emit(registry, "DIDStatusChanged");
      expect(await registry.isValidDID(mockDID)).to.be.false;
    });

    it("Người khác không thể thu hồi", async () => {
      await expect(
        registry.connect(user2).revokeDID(mockDID, "UNAUTHORIZED")
      ).to.be.revertedWith("Identity: not authorized to revoke");
    });
  });

  describe("verifyDataIntegrity", () => {
    it("Xác minh hash đúng", async () => {
      const nonce = await registry.getNonce(user1.address);
      await registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce);
      expect(await registry.verifyDataIntegrity(mockDID, mockDataHash)).to.be.true;
    });

    it("Phát hiện hash sai", async () => {
      const nonce = await registry.getNonce(user1.address);
      await registry.connect(user1).registerDID(mockDID, mockDataHash, mockCCCDHash, nonce);
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("TAMPERED_DATA"));
      expect(await registry.verifyDataIntegrity(mockDID, wrongHash)).to.be.false;
    });
  });
});

async function getLatestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
