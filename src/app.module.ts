import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { MeiliSearchModule } from 'nestjs-meilisearch';

import { AuthorizationGuard } from '@/common/guards/authorization.guard';
import { RightsGuard } from '@/common/guards/rights.guard';
import { ValidationPipe } from '@/common/pipes/validation.pipe';
import { VKInterceptor } from '@/common/interceptors/vk.interceptor';
import { CacheModule } from '@/common/cache/cache.module';
import { HelpersModule } from '@/common/helpers/helpers.module';
import { ThrottlerGuard } from '@/common/guards/trottler.guard';
import { ThrottlerStorageModule } from '@/common/throttler/throttler-storage.module';
import { ThrottlerStorageService } from '@/common/throttler/throttler-storage.service';

import { AppService } from '@/app.service';
import { UsersModule } from '@/users/users.module';
import { User } from '@/users/entities/user.entity';
import { Settings } from '@/users/entities/settings.entity';
import { SlangsModule } from '@/slangs/slangs.module';
import { BookmarksModule } from '@/bookmarks/bookmarks.module';
import { AdminModule } from '@/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        database: configService.get('POSTGRES_DB'),
        synchronize: configService.get('POSTGRES_SYNCHRONIZE') === 'true',
        entities: ['dist/**/*.entity{.ts,.js}'],
        logging: process.env.NODE_ENV !== 'production'
      }),
      inject: [ConfigService]
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, ThrottlerStorageModule],
      inject: [ConfigService, ThrottlerStorageService],
      useFactory: (
        configService: ConfigService,
        throttlerStorage: ThrottlerStorageService
      ) => ({
        ttl: configService.get('THROTTLE_TTL'),
        limit: configService.get('THROTTLE_LIMIT'),
        storage: throttlerStorage
      })
    }),
    MeiliSearchModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.get('MEILI_HTTP_ADDR') ?? '',
        apiKey: configService.get('MEILI_MASTER_KEY')
      })
    }),
    TypeOrmModule.forFeature([User, Settings]),
    CacheModule,
    HelpersModule,
    UsersModule,
    SlangsModule,
    BookmarksModule,
    AdminModule
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard
    },
    {
      provide: APP_GUARD,
      useClass: RightsGuard
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: VKInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor
    }
  ]
})
export class AppModule {}
