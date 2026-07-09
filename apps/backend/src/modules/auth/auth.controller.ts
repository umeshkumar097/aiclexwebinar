import { BadRequestException, Query,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { Req } from '@nestjs/common';

import { RATE_LIMIT } from '@zonvo/constants';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: RATE_LIMIT.AUTH_REGISTER })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
  ): Promise<{ userId: string; email: string; message: string }> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, ipAddress, userAgent);
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: RATE_LIMIT.AUTH_LOGIN })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns token pair' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
  ): Promise<unknown> {
    return this.authService.login(dto, {
      ipAddress: req.ip,
      browser: req.headers['user-agent'],
    });
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: FastifyRequest,
  ): Promise<unknown> {
    return this.authService.refresh(dto.refreshToken, { ipAddress: req.ip });
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logout(user.sessionId, user.userId);
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: RATE_LIMIT.AUTH_FORGOT_PASSWORD })
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 202, description: 'If email exists, reset link will be sent' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: FastifyRequest,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto, req.ip);
    return { message: 'If an account with this email exists, you will receive a reset link.' };
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────────

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: { token: string }): Promise<{ message: string }> {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully. Your account is now active.' };
  }

  // ─── Resend Verification ──────────────────────────────────────────────────────

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: RATE_LIMIT.AUTH_FORGOT_PASSWORD })
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() dto: { email: string }): Promise<{ message: string }> {
    await this.authService.resendVerificationEmail(dto.email);
    return { message: 'If your account exists and is unverified, a verification email has been sent.' };
  }

  // ─── Me ──────────────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    const managedBy = await this.authService.getManagedBy(user.userId);
    return { ...user, managedByEmail: managedBy };
  }

  // ─── Change Password ─────────────────────────────────────────────────────────

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.userId, dto, user.sessionId);
    return { message: 'Password changed successfully. Other sessions have been signed out.' };
  }

  // ─── Device Sessions ─────────────────────────────────────────────────────────

  @Get('devices')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List active device sessions' })
  async getDeviceSessions(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.authService.getDeviceSessions(user.userId, user.sessionId);
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a device session' })
  async revokeDeviceSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.authService.revokeDeviceSession(user.userId, sessionId);
  }

  // ─── Invitations ─────────────────────────────────────────────────────────────

  @Get('invitation-info')
  @ApiOperation({ summary: 'Get info about an invitation token' })
  async getInvitationInfo(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Token is required');
    return this.authService.getInvitationInfo(token);
  }

  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation and login' })
  async acceptInvite(
    @Body('token') token: string,
    @Body('password') password: string | undefined,
    @Body('agreementVersion') agreementVersion: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    if (!token) throw new BadRequestException('Token is required');
    const tokens = await this.authService.acceptInvite(
      token,
      password,
      req.ip,
      req.headers['user-agent'],
      agreementVersion || '1.0',
    );
    return tokens;
  }

}
