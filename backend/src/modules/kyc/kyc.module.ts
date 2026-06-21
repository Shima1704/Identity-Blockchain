import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { Identity } from '../../database/entities/identity.entity';
import { User } from '../../database/entities/user.entity';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Identity, User]),
    HttpModule,
    BlockchainModule,
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
