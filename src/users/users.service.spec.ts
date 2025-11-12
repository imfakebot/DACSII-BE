import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';
import { Address } from './entities/address.entity';
import * as bcrypt from 'bcrypt';
import { EntityManager, Repository } from 'typeorm';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let accountRepository: Repository<Account>;

  // Tạo các mock repository
  const mockAccountRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockRoleRepository = {
    // Mock các phương thức cần thiết
  };

  const mockUserProfileRepository = {
    // Mock các phương thức cần thiết
  };

  const mockAddressRepository = {
    // Mock các phương thức cần thiết
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockAccountRepository,
        },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
        {
          provide: getRepositoryToken(Address),
          useValue: mockAddressRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    accountRepository = module.get<Repository<Account>>(
      getRepositoryToken(Account),
    );

    // Reset mocks trước mỗi test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAccountByEmail', () => {
    it('should return an account if found', async () => {
      const email = 'test@example.com';
      const account = { email, id: '1' } as Account;
      mockAccountRepository.findOne.mockResolvedValue(account);

      const result = await service.findAccountByEmail(email);

      expect(result).toEqual(account);
      expect(mockAccountRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null if account is not found', async () => {
      const email = 'notfound@example.com';
      mockAccountRepository.findOne.mockResolvedValue(null);

      const result = await service.findAccountByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('createUnverifiedUser', () => {
    it('should create a user within a transaction', async () => {
      const userData = {
        email: 'new@example.com',
        passwordHash: 'hashed',
        fullName: 'New User',
        verificationCode: '123456',
        expiresAt: new Date(),
        bio: null,
        gender: 'male',
        phoneNumber: '0987654321',
      };

      const mockEntityManager = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        create: jest.fn((_entity: any, data: any) => ({ ...data, id: 'new-id' })),
        save: jest.fn((entity: UserProfile | Account) => Promise.resolve(entity)),
        findOneBy: jest.fn().mockResolvedValue({ id: 'role-id', name: 'user' }),
      } as unknown as EntityManager;

      // Mock transaction để trả về mockEntityManager
      (accountRepository.manager.transaction as jest.Mock).mockImplementation(
        (cb: (entityManager: EntityManager) => Promise<Account>) => cb(mockEntityManager),
      );

      await service.createUnverifiedUser(userData);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(accountRepository.manager.transaction).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.create).toHaveBeenCalledWith(UserProfile, expect.any(Object));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.create).toHaveBeenCalledWith(Account, expect.any(Object));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.findOneBy).toHaveBeenCalledWith(Role, { name: 'user' });
    });
  });

  describe('verifyAccount', () => {
    it('should update account to be verified', async () => {
      const accountId = 'some-uuid';
      await service.verifyAccount(accountId);

      expect(mockAccountRepository.update).toHaveBeenCalledWith(accountId, {
        is_verified: true,
        verification_code: undefined,
        verification_code_expires_at: undefined,
      });
    });
  });

  describe('hashPassword', () => {
    it('should return a hashed password', async () => {
      const password = 'my-plain-password';
      const hashedPassword = 'hashed-password';
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 'salt');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.comparePassword('plain', 'hashed');
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.comparePassword('wrong', 'hashed');
      expect(result).toBe(false);
    });
  });
});
