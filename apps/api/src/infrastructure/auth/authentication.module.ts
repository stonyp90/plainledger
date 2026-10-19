import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GqlAuthGuard } from '../graphql/guards/gql-auth.guard';

/** One Keycloak verifier shared by controller modules and GraphQL guards. */
@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserProfileEntity]),
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        authServerUrl: config.get<string>('KEYCLOAK_URL') || 'http://localhost:8080',
        realm: config.get<string>('KEYCLOAK_REALM') || 'plainledger',
        clientId: config.get<string>('KEYCLOAK_CLIENT_ID') || 'plainledger-api',
        secret: config.get<string>('KEYCLOAK_CLIENT_SECRET') || 'change-me-in-production',
        bearerOnly: true,
        verifyTokenAudience: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtAuthGuard, GqlAuthGuard],
  exports: [KeycloakConnectModule, TypeOrmModule, JwtAuthGuard, GqlAuthGuard],
})
export class AuthenticationModule {}
