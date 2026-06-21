import {
  Controller, Post, Get, UseGuards,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus,
  Param, Res, BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiConsumes, ApiBody, ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';

import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { CCCDData } from './kyc.types';

const multerStorage = diskStorage({
  destination: join(process.cwd(), 'src', 'uploads', 'cccd'),
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

const faceStorage = diskStorage({
  destination: join(process.cwd(), 'src', 'uploads', 'faces'),
  filename: (_req, file, cb) => {
    cb(null, `selfie_${uuidv4()}${extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Chỉ chấp nhận file JPEG, PNG hoặc PDF'), false);
};

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('cccd/scan')
  @ApiOperation({ summary: 'Quét CCCD bằng PaddleOCR — Bước 1' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 200, description: 'Trích xuất thông tin CCCD thành công' })
  @UseInterceptors(FileInterceptor('file', {
    storage: multerStorage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async scanCCCD(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string; data: CCCDData; warning: string | null }> {
    return this.kycService.scanCCCD(file, user.id);
  }

  @Post('face/verify')
  @ApiOperation({ summary: 'Xác minh khuôn mặt — Bước 2' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { selfie: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 200, description: 'Khuôn mặt khớp với CCCD' })
  @ApiResponse({ status: 400, description: 'Khuôn mặt không khớp hoặc liveness thất bại' })
  @UseInterceptors(FileInterceptor('selfie', {
    storage: faceStorage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async verifyFace(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.kycService.verifyFace(file, user.id);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn tất KYC, ghi DID lên Blockchain — Bước 3' })
  @ApiResponse({ status: 200, description: 'KYC hoàn tất, DID đã được tạo' })
  async complete(@CurrentUser() user: User) {
    return this.kycService.completeKYC(user.id);
  }

  @Get('status')
  @ApiOperation({ summary: 'Lấy trạng thái KYC của user hiện tại' })
  async status(@CurrentUser() user: User) {
    return this.kycService.getStatus(user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin cá nhân đã giải mã từ CCCD' })
  async profile(@CurrentUser() user: User) {
    return this.kycService.getProfile(user.id);
  }

  @Get('cccd-images/:filename')
  @ApiOperation({ summary: 'Serve CCCD image file with security checks' })
  async serveCCCDImage(
    @Param('filename') filename: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    // 1. Validate filename format to prevent directory traversal
    const filenameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!filenameRegex.test(filename)) {
      throw new BadRequestException('Invalid filename format');
    }

    // 2. Verify user has permission to access this CCCD image
    const identity = await this.kycService.getIdentityByUserId(user.id);
    if (
      !identity ||
      (identity.cccdFrontFilename !== filename && identity.cccdBackFilename !== filename)
    ) {
      throw new ForbiddenException('User does not have permission to access this image');
    }

    // 3. Construct file path and check if file exists
    const filepath = join(process.cwd(), 'src', 'uploads', 'cccd', filename);
    if (!fs.existsSync(filepath)) {
      throw new NotFoundException('Image file not found');
    }

    // 4. Serve file with proper headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(filepath);
  }
}
