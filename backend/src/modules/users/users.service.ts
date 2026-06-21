import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { CreateUserDto } from './user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByPhoneOrEmail(phoneOrEmail: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.phone = :v OR u.email = :v', { v: phoneOrEmail })
      .getOne();
  }

  async create(dto: CreateUserDto): Promise<User> {
    if (dto.phone) {
      const exists = await this.findByPhone(dto.phone);
      if (exists) throw new ConflictException('Số điện thoại đã được đăng ký');
    }
    if (dto.email) {
      const exists = await this.findByEmail(dto.email);
      if (exists) throw new ConflictException('Email đã được đăng ký');
    }
    if (!dto.phone && !dto.email) {
      throw new ConflictException('Phải cung cấp số điện thoại hoặc email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create();
    if (dto.phone) user.phone = dto.phone;
    if (dto.email) user.email = dto.email;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.passwordHash = passwordHash;
    return this.userRepo.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async incrementLoginAttempts(id: string): Promise<number> {
    await this.userRepo.increment({ id }, 'loginAttempts', 1);
    const user = await this.findById(id);
    return user?.loginAttempts ?? 0;
  }

  async lockAccount(id: string, minutes = 30): Promise<void> {
    const lockedUntil = new Date(Date.now() + minutes * 60_000);
    await this.userRepo.update(id, { isLocked: true, lockedUntil });
  }

  async resetLoginAttempts(id: string): Promise<void> {
    await this.userRepo.update(id, {
      loginAttempts: 0,
      isLocked: false,
      lockedUntil: undefined,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  sanitize(user: User) {
    const { passwordHash, ...safe } = user as any;
    return safe;
  }
}
