import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User } from '@prisma/client';
import { Request } from 'express';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '@/users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      return null;
    }
    const isPasswordValid = await argon2.verify(user.passwordHash, pass);
    if (isPasswordValid) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await argon2.hash(registerDto.password);
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        passwordHash,
      },
    });

    const token = crypto.randomUUID();
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // In a real scenario, an email is sent here.
    return { token, user: new UserResponseDto(user) };
  }

  async login(user: User, req: Request): Promise<{ user: UserResponseDto; accessToken: string; refreshToken: string }> {
    if (user.twoFactorEnabled) {
      // Logic handled in controller: return token for 2FA validation
      // But standard login here
    }

    const { accessToken, refreshToken } = await this.generateTokens(user.id, req);
    return {
      user: new UserResponseDto(user),
      accessToken,
      refreshToken,
    };
  }

  async googleLogin(profile: { email: string; name: string; picture: string; providerId: string }): Promise<User> {
    return this.socialLogin({ ...profile, provider: 'google' });
  }

  async socialLogin(profile: {
    email: string;
    name: string;
    picture?: string;
    providerId: string;
    provider: string;
  }): Promise<User> {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.picture,
          emailVerifiedAt: new Date(),
        },
      });
    }

    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerId,
        },
      },
    });

    if (!account) {
      await this.prisma.account.create({
        data: {
          userId: user.id,
          provider: profile.provider,
          providerAccountId: profile.providerId,
        },
      });
    }

    return user;
  }

  async verifyEmail(token: string) {
    const verification = await this.prisma.verificationToken.findUnique({ where: { token } });
    if (!verification || verification.expiresAt < new Date() || verification.usedAt) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: new Date() },
    });

    await this.prisma.verificationToken.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Email successfully verified' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      return { message: 'If an account exists, a reset link has been sent' };
    }

    const token = crypto.randomUUID();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      },
    });

    // In a real app, send an email here.
    return { token, message: 'Password reset token generated' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { token: resetPasswordDto.token } });
    if (!reset || reset.expiresAt < new Date() || reset.usedAt) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await argon2.hash(resetPasswordDto.password);
    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Password successfully reset' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Cannot change password for this account type');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, changePasswordDto.oldPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid old password');
    }

    const passwordHash = await argon2.hash(changePasswordDto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password successfully changed' };
  }

  async refreshToken(userId: string, refreshToken: string, req: Request) {
    const hashedToken = await argon2.hash(refreshToken);
    // Here we should verify the hashed token exists, but let's use a simplified approach since we receive plain token
    // Actually, refresh tokens are often just stored in the DB plain, or we hash the one we store and verify.
    // Given Prisma, we will verify the session exists.
    
    // In our schema, session stores refreshToken as plain string or hash? The schema says refreshToken String.
    // Usually it's hashed. Let's assume we find it by user ID and compare.
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } }
    });
    
    let validSession = null;
    for (const session of sessions) {
      if (await argon2.verify(session.refreshToken, refreshToken)) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate refresh token
    await this.prisma.session.delete({ where: { id: validSession.id } });
    return this.generateTokens(userId, req);
  }

  async logout(userId: string, refreshToken: string) {
    if (!refreshToken) return;
    const sessions = await this.prisma.session.findMany({ where: { userId } });
    for (const session of sessions) {
      if (await argon2.verify(session.refreshToken, refreshToken)) {
        await this.prisma.session.delete({ where: { id: session.id } });
        break;
      }
    }
  }

  async generateTokens(userId: string, req: Request) {
    const payload = { sub: userId };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'secretKey',
      expiresIn: '15m',
    });

    const plainRefreshToken = crypto.randomBytes(32).toString('hex');
    const hashedRefreshToken = await argon2.hash(plainRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: hashedRefreshToken,
        expiresAt,
        userAgent: req.headers['user-agent']?.substring(0, 255),
        ipAddress: req.ip,
      },
    });

    return {
      accessToken,
      refreshToken: plainRefreshToken,
    };
  }
}
