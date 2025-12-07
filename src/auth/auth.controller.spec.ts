import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginCompleteDto } from './dto/login-complete.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;

  // Create a mock for AuthService
  const mockAuthService = {
    initiateRegistration: jest.fn(),
    completeRegistration: jest.fn(),
    loginInitiate: jest.fn(),
    loginComplete: jest.fn(),
  };

  // Create a mock for ConfigService
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'test';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateRegistration', () => {
    it('should call authService.initiateRegistration with the correct DTO', async () => {
      const registerDto: RegisterUserDto = {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
        phone_number: '0987654321',
      };
      mockAuthService.initiateRegistration.mockResolvedValue({
        message: 'Success',
      });

      const result = await controller.initiateRegistration(registerDto);

      expect(mockAuthService.initiateRegistration).toHaveBeenCalledWith(
        registerDto,
      );
      expect(result).toEqual({ message: 'Success' });
    });
  });

  describe('loginInitiate', () => {
    it('should call authService.loginInitiate with email and password', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password',
      };
      mockAuthService.loginInitiate.mockResolvedValue({ message: 'OTP sent' });

      const result = await controller.loginInitiate(loginDto);

      expect(mockAuthService.loginInitiate).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result).toEqual({ message: 'OTP sent' });
    });
  });

  describe('loginComplete', () => {
    it('should call authService.loginComplete and set a cookie', async () => {
      const loginCompleteDto: LoginCompleteDto = {
        email: 'test@example.com',
        verificationCode: '123456',
      };
      const loginData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-id', email: 'test@example.com' },
      };
      mockAuthService.loginComplete.mockResolvedValue(loginData);

      // Mock Express Response
      const mockResponse = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.loginComplete(
        loginCompleteDto,
        mockResponse,
      );

      expect(mockAuthService.loginComplete).toHaveBeenCalledWith(
        loginCompleteDto.email,
        loginCompleteDto.verificationCode,
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        loginData.refreshToken,
        expect.any(Object),
      );
      expect(result).toEqual({
        accessToken: loginData.accessToken,
        user: loginData.user,
      });
    });
  });

  describe('completeRegistration', () => {
    it('should call authService.completeRegistration with email and code', async () => {
      const verifyDto: VerifyEmailDto = {
        email: 'test@example.com',
        verificationCode: '123456',
      };
      mockAuthService.completeRegistration.mockResolvedValue({
        message: 'Verified',
      });

      const result = await controller.completeRegistration(verifyDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockAuthService.completeRegistration).toHaveBeenCalledWith(
        verifyDto.email,
        verifyDto.verificationCode,
      );
      expect(result).toEqual({ message: 'Verified' });
    });
  });
});
