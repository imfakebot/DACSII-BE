import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginUserDto } from './dto/login-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Tạo một đối tượng giả lập cho AuthService
  const mockAuthService = {
    initateRegistration: jest.fn(),
    completeRegistration: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Xóa các mock trước mỗi test để đảm bảo tính độc lập
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
      mockAuthService.initateRegistration.mockResolvedValue({
        message: 'Success',
      });

      const result = await controller.initiateRegistration(registerDto);

      expect(mockAuthService.initateRegistration).toHaveBeenCalledWith(
        registerDto,
      );
      expect(result).toEqual({ message: 'Success' });
    });
  });

  describe('login', () => {
    it('should call authService.login with the user object', () => {
      const user = {
        id: 'some-id',
        email: 'test@example.com',
        user_profile_id: 'profile-id',
        role: {
          id: 'role-id',
          name: 'user',
        },
        // Add other properties from AuthenticatedUser if necessary for the test
        // For example, if 'id' is required, add id: 'some-id'
      };
      // LoginUserDto không được sử dụng trực tiếp trong logic nhưng vẫn cần cho validation và swagger
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password',
      };
      const token = { access_token: 'jwt-token' };
      mockAuthService.login.mockReturnValue(token);

      const result = controller.login(user, loginDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(authService.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(token);
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
      expect(authService.completeRegistration).toHaveBeenCalledWith(
        verifyDto.email,
        verifyDto.verificationCode,
      );
      expect(result).toEqual({ message: 'Verified' });
    });
  });
});
