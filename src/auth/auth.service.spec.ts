import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { Account } from '@/users/entities/account.entity';

describe('AuthService', () => {
  let service: AuthService;
  // let usersService: UsersService; // usersService is assigned a value but never used.
  // let mailerService: MailerService; // mailerService is assigned a value but never used.
  // let jwtService: JwtService; // jwtService is assigned a value but never used.

  // Mock implementations
  const mockUsersService = {
    findAccountByEmail: jest.fn(),
    hashPassword: jest.fn(),
    createUnverifiedUser: jest.fn(),
    updateUnverifiedAccount: jest.fn(),
    verifyAccount: jest.fn(),
    comparePassword: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // usersService = module.get<UsersService>(UsersService); // usersService is assigned a value but never used.
    // mailerService = module.get<MailerService>(MailerService); // mailerService is assigned a value but never used.
    // jwtService = module.get<JwtService>(JwtService); // jwtService is assigned a value but never used.

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initateRegistration', () => {
    const registerDto: RegisterUserDto = {
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
      phone_number: '123456789',
    };

    it('should create a new unverified user if email does not exist', async () => {
      mockUsersService.findAccountByEmail.mockResolvedValue(null);
      mockUsersService.hashPassword.mockResolvedValue('hashed_password');

      await service.initiateRegistration(registerDto);

      expect(mockUsersService.findAccountByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.hashPassword).toHaveBeenCalledWith(
        registerDto.password,
      );
      expect(mockUsersService.createUnverifiedUser).toHaveBeenCalled();
      expect(mockMailerService.sendMail).toHaveBeenCalled();
    });

    it('should update an existing unverified user', async () => {
      const existingAccount = { id: 'some-id', is_verified: false };
      mockUsersService.findAccountByEmail.mockResolvedValue(existingAccount);
      mockUsersService.hashPassword.mockResolvedValue('new_hashed_password');

      await service.initiateRegistration(registerDto);

      expect(mockUsersService.updateUnverifiedAccount).toHaveBeenCalled();
      expect(mockUsersService.createUnverifiedUser).not.toHaveBeenCalled();
      expect(mockMailerService.sendMail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already in use and verified', async () => {
      const existingAccount = { is_verified: true };
      mockUsersService.findAccountByEmail.mockResolvedValue(existingAccount);

      await expect(service.initiateRegistration(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('completeRegistration', () => {
    it('should verify account with correct code', async () => {
      const account: Partial<Account> = {
        id: 'uuid',
        is_verified: false,
        verification_code: '123456',
        verification_code_expires_at: new Date(Date.now() + 1000 * 60 * 10), // Expires in 10 minutes
      };
      mockUsersService.findAccountByEmail.mockResolvedValue(account);

      const result = await service.completeRegistration(
        'test@example.com',
        '123456',
      );

      expect(mockUsersService.verifyAccount).toHaveBeenCalledWith(account.id);
      expect(result).toEqual({
        message: 'Tài khoản của bạn đã được xác thực thành công.',
      });
    });

    it('should throw ConflictException for invalid or expired code', async () => {
      const account: Partial<Account> = {
        id: 'uuid',
        is_verified: false,
        verification_code: '123456',
        verification_code_expires_at: new Date(Date.now() - 1000), // Expired
      };
      mockUsersService.findAccountByEmail.mockResolvedValue(account);

      await expect(
        service.completeRegistration('test@example.com', 'wrong-code'),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.completeRegistration('test@example.com', '123456'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if account is not found or already verified', async () => {
      mockUsersService.findAccountByEmail.mockResolvedValue(null);
      await expect(
        service.completeRegistration('test@example.com', '123456'),
      ).rejects.toThrow(ConflictException);

      mockUsersService.findAccountByEmail.mockResolvedValue({
        is_verified: true,
      });
      await expect(
        service.completeRegistration('test@example.com', '123456'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    it('should return user data if validation is successful', async () => {
      const account = {
        id: 'uuid',
        email: 'test@example.com',
        password_hash: 'hashed',
        is_verified: true,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...result } = account;

      mockUsersService.findAccountByEmail.mockResolvedValue(account);
      mockUsersService.comparePassword.mockResolvedValue(true);

      expect(
        await service.validateUser('test@example.com', 'password'),
      ).toEqual(result);
    });

    it('should return null if account is not found or not verified', async () => {
      mockUsersService.findAccountByEmail.mockResolvedValue(null);
      expect(
        await service.validateUser('test@example.com', 'password'),
      ).toBeNull();

      mockUsersService.findAccountByEmail.mockResolvedValue({
        is_verified: false,
      });
      expect(
        await service.validateUser('test@example.com', 'password'),
      ).toBeNull();
    });

    it('should return null if password does not match', async () => {
      const account = {
        id: 'uuid',
        email: 'test@example.com',
        password_hash: 'hashed',
        is_verified: true,
      };
      mockUsersService.findAccountByEmail.mockResolvedValue(account);
      mockUsersService.comparePassword.mockResolvedValue(false);

      expect(
        await service.validateUser('test@example.com', 'wrong-password'),
      ).toBeNull();
    });
  });

  describe('login', () => {
    it('should return an access token', () => {
      const user = {
        email: 'test@example.com',
        id: 'some-id',
        user_profile_id: 'profile-id',
        role: {
          id: 'role-id',
          name: 'user',
        },
      };
      const token = 'jwt-token';
      mockJwtService.sign.mockReturnValue(token);

      const result = service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.user_profile_id,
        role: user.role.id,
      });
      expect(result).toEqual({ access_token: token });
    });
  });
});
