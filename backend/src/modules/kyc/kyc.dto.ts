import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CCCD scan is multipart/form-data — the DTO describes the form fields.
 * Actual files are injected via @UploadedFiles() from Multer.
 */
export class ScanCCCDDto {
  // front_image and back_image are file uploads — handled by Multer interceptor
}

/**
 * Face verification is multipart/form-data.
 * selfie is a file upload — handled by Multer interceptor.
 */
export class VerifyFaceDto {
  // selfie is a file upload — handled by Multer interceptor
}

/** Payload to complete KYC after both CCCD scan and face verify have passed */
export class CompleteKYCDto {
  @ApiPropertyOptional({
    description: 'Optional Ethereum wallet address for DID generation',
    example: '0xAbCd1234...',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;
}
