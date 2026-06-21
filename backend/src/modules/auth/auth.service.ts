import {
  Injectable, UnauthorizedException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './auth.dto';
import { User } from '../../database/entities/user.entity';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /** Đăng ký tài khoản mới */
  async register(dto: RegisterDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Phải cung cấp số điện thoại hoặc email');
    }

    // Kiểm tra xem account đã tồn tại chưa
    const existing = dto.phone
      ? await this.usersService.findByPhone(dto.phone)
      : await this.usersService.findByEmail(dto.email!);

    if (existing) {
      // Nếu đã tồn tại → thử validate password, nếu đúng → cho tiếp tục KYC
      const isValid = await this.usersService.validatePassword(existing, dto.password);
      if (isValid) {
        // Password đúng → tài khoản này của họ, auto-login và tiếp tục
        const payload = {
          sub:   existing.id,
          phone: existing.phone,
          email: existing.email,
          role:  existing.role,
        };
        return {
          message: 'Tài khoản đã tồn tại. Tiếp tục xác thực KYC.',
          user: this.usersService.sanitize(existing),
          access_token: this.jwtService.sign(payload),
          already_exists: true,
        };
      }
      // Password sai → báo lỗi trùng
      const field = dto.phone ? 'Số điện thoại' : 'Email';
      throw new ConflictException(`${field} này đã được đăng ký với tài khoản khác`);
    }

    const user = await this.usersService.create({
      lastName:  dto.lastName,
      firstName: dto.firstName,
      phone:     dto.phone,
      email:     dto.email,
      password:  dto.password,
    });

    // Auto-login sau khi tạo tài khoản
    const payload = {
      sub:   user.id,
      phone: user.phone,
      email: user.email,
      role:  user.role,
    };

    return {
      message: 'Đăng ký thành công. Vui lòng tiếp tục xác thực CCCD và khuôn mặt.',
      user: this.usersService.sanitize(user),
      access_token: this.jwtService.sign(payload),
      already_exists: false,
    };
  }

  /** Đăng nhập - Handle cả user và admin */
  async login(phoneOrEmail: string, password: string) {
    // Check admin login first
    if (phoneOrEmail === 'admin' && password === 'admin@123') {
      const payload = {
        sub: 'admin',
        username: 'admin',
        role: 'admin',
        isAdmin: true,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: 'admin',
          username: 'admin',
          role: 'admin',
          isAdmin: true,
        },
        isAdmin: true,
      };
    }

    // Regular user login
    const user = await this.usersService.findByPhoneOrEmail(phoneOrEmail);
    if (!user) throw new UnauthorizedException('Số điện thoại/email hoặc mật khẩu không đúng');

    // Kiểm tra bị khóa
    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
        throw new UnauthorizedException(
          `Tài khoản bị khóa. Vui lòng thử lại sau ${minutes} phút.`,
        );
      }
      // Lock expired — auto unlock
      await this.usersService.resetLoginAttempts(user.id);
    }

    const isValid = await this.usersService.validatePassword(user, password);
    if (!isValid) {
      const attempts = await this.usersService.incrementLoginAttempts(user.id);
      if (attempts >= MAX_ATTEMPTS) {
        await this.usersService.lockAccount(user.id, LOCK_MINUTES);
        throw new UnauthorizedException(
          `Sai mật khẩu quá ${MAX_ATTEMPTS} lần. Tài khoản bị khóa ${LOCK_MINUTES} phút.`,
        );
      }
      throw new UnauthorizedException(
        `Sai mật khẩu. Còn ${MAX_ATTEMPTS - attempts} lần trước khi bị khóa.`,
      );
    }

    // Đăng nhập thành công
    await this.usersService.resetLoginAttempts(user.id);
    await this.usersService.updateLastLogin(user.id);

    const payload = {
      sub:   user.id,
      phone: user.phone,
      email: user.email,
      role:  user.role,
      isAdmin: false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: this.usersService.sanitize(user),
      isAdmin: false,
    };
  }

  /** Lấy thông tin user hiện tại */
  async me(user: User) {
    return this.usersService.sanitize(user);
  }
}
