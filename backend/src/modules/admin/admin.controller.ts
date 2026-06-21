import { Controller, Post, Get, Body, UseGuards, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './admin.dto';
import { AdminGuard } from './admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** POST /api/admin/login - Đăng nhập admin */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  /** GET /api/admin/dashboard - Xem thống kê dashboard (cần JWT admin) */
  @Get('dashboard')
  @UseGuards(AdminGuard)
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  /** GET /api/admin/users - Danh sách tất cả người dùng (cần JWT admin) */
  @Get('users')
  @UseGuards(AdminGuard)
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  /** GET /api/admin/users/:userId - Chi tiết người dùng (cần JWT admin) */
  @Get('users/:userId')
  @UseGuards(AdminGuard)
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  /** GET /api/admin/blockchain - Danh sách bản ghi blockchain (cần JWT admin) */
  @Get('blockchain')
  @UseGuards(AdminGuard)
  async getBlockchainRecords() {
    return this.adminService.getBlockchainRecords();
  }
}
