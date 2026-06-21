import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Thiếu token xác thực');
    }

    try {
      const payload = this.jwtService.verify(token);
      
      // Kiểm tra xem token có phải là admin token không
      if (payload.role !== 'admin' || payload.username !== 'admin') {
        throw new UnauthorizedException('Không có quyền truy cập (yêu cầu admin)');
      }

      // Gắn payload vào request để sử dụng ở các phương thức sau
      request.user = payload;
      return true;
    } catch (error: any) {
      this.logger.error(`AdminGuard error: ${error.message}`);
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  private extractToken(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
