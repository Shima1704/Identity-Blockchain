import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private operatorWallet: ethers.Wallet | null = null;
  private identityContract: ethers.Contract | null = null;

  private readonly ABI = [
    'function registerDID(string did, bytes32 dataHash, bytes32 cccdHash, uint256 nonce) external',
    'function updateKYCStatus(string did, uint8 status, uint256 kycScore) external',
    'function isValidDID(string did) external view returns (bool)',
    'function isKYCVerified(string did) external view returns (bool)',
    'function getNonce(address account) external view returns (uint256)',
    'function getIdentity(string did) external view returns (tuple(string did, address walletAddress, bytes32 dataHash, bytes32 cccdHash, uint8 didStatus, uint8 kycStatus, uint256 kycScore, uint256 createdAt, uint256 updatedAt, uint256 verifiedAt, uint256 revokedAt, bool exists))',
  ];

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const rpcUrl          = this.config.get<string>('blockchain.rpcUrl');
    const privateKey      = this.config.get<string>('blockchain.operatorPrivateKey') || '0x0000000000000000000000000000000000000000000000000000000000000001';
    const contractAddress = this.config.get<string>('blockchain.identityContract');

    try {
      // Try to connect but don't retry - just use mock data if fails
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Try one connection attempt
      try {
        await Promise.race([
          this.provider.getNetwork(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Blockchain connection failed (${rpcUrl}): ${message} — using mock mode`);
        this.provider = null;
        return;
      }
      
      this.operatorWallet = new ethers.Wallet(privateKey, this.provider);

      if (contractAddress) {
        this.identityContract = new ethers.Contract(
          contractAddress,
          this.ABI,
          this.operatorWallet,
        );
        this.logger.log(`Blockchain connected: ${rpcUrl}`);
        this.logger.log(`IdentityRegistry: ${contractAddress}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Blockchain init failed (using mock mode): ${message}`);
    }
  }

  /** Đăng ký DID mới lên chain */
  async registerDID(did: string, dataHash: string, cccdHash: string): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.identityContract || !this.operatorWallet) {
      this.logger.warn('No contract — skipping registerDID');
      return { txHash: '0x_mock_' + Date.now(), blockNumber: 0 };
    }
    try {
      const nonce = await this.identityContract.getNonce(this.operatorWallet.address);
      const tx = await this.identityContract.registerDID(
        did,
        ethers.hexlify(ethers.toUtf8Bytes(dataHash)).slice(0, 66).padEnd(66, '0'),
        ethers.hexlify(ethers.toUtf8Bytes(cccdHash)).slice(0, 66).padEnd(66, '0'),
        nonce,
      );
      const receipt = await tx.wait();
      return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`registerDID failed: ${message}`);
      throw err;
    }
  }

  /** Cập nhật trạng thái KYC lên chain  */
  async updateKYCStatus(did: string, status: number, score: number) {
    if (!this.identityContract) return null;
    try {
      const tx = await this.identityContract.updateKYCStatus(did, status, Math.round(score * 100));
      return tx.wait();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`updateKYCStatus failed: ${message}`);
    }
  }

  async isValidDID(did: string): Promise<boolean> {
    if (!this.identityContract) return false;
    return this.identityContract.isValidDID(did);
  }

  async generateDID(address?: string): Promise<string> {
    const base = address || ethers.hexlify(ethers.randomBytes(20));
    return `did:vnchain:${base}`;
  }
}
