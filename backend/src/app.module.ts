import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import configuration from './config/configuration';
import { User }     from './database/entities/user.entity';
import { Identity } from './database/entities/identity.entity';

import { AuthModule }       from './modules/auth/auth.module';
import { UsersModule }      from './modules/users/users.module';
import { KycModule }        from './modules/kyc/kyc.module';
import { AdminModule }      from './modules/admin/admin.module';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        host:        config.get('database.host'),
        port:        config.get<number>('database.port'),
        username:    config.get('database.username'),
        password:    config.get('database.password'),
        database:    config.get('database.database'),
        entities:    [User, Identity],
        synchronize: true,   // dev only — dùng migrations ở production
        logging:     false,
      }),
    }),

    HttpModule.register({ timeout: 30_000 }),
    BlockchainModule,
    UsersModule,
    AuthModule,
    AdminModule,
    KycModule,
  ],
})
export class AppModule {}
