import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';
import { Address } from '../locations/entities/address.entity';
import * as bcrypt from 'bcrypt';
// SỬA: Import thêm 'UpdateResult' và xóa 'Repository'
import { EntityManager, UpdateResult } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

// Mock bcrypt
jest.mock('bcrypt');

// 1. TẠO MỘT MOCK FACTORY (Best Practice)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockRepositoryFactory = <T = any>() => ({
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  manager: {
    transaction: jest.fn(),
  },
});

describe('UsersService', () => {
  let service: UsersService;
  let accountRepository: ReturnType<typeof mockRepositoryFactory>;
  // SỬA: Xóa các repo không dùng
  // let roleRepository: ReturnType<typeof mockRepositoryFactory>;
  // let userProfileRepository: ReturnType<typeof mockRepositoryFactory>;
  // let addressRepository: ReturnType<typeof mockRepositoryFactory>;

  // Tạo các mock repository bằng factory
  const mockAccountRepository = mockRepositoryFactory();
  const mockRoleRepository = mockRepositoryFactory();
  const mockUserProfileRepository = mockRepositoryFactory();
  const mockAddressRepository = mockRepositoryFactory();

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
    accountRepository = module.get(getRepositoryToken(Account));
    // SỬA: Xóa gán các repo không dùng
    // roleRepository = module.get(getRepositoryToken(Role));
    // userProfileRepository = module.get(getRepositoryToken(UserProfile));
    // addressRepository = module.get(getRepositoryToken(Address));

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
      accountRepository.findOne.mockResolvedValue(account);

      const result = await service.findAccountByEmail(email);

      expect(result).toEqual(account);
      expect(accountRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null if account is not found', async () => {
      const email = 'notfound@example.com';
      accountRepository.findOne.mockResolvedValue(null);

      const result = await service.findAccountByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('createUnverifiedUser', () => {
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
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
    } as unknown as EntityManager;

    beforeEach(() => {
      (mockEntityManager.create as jest.Mock).mockClear();
      (mockEntityManager.save as jest.Mock).mockClear();
      (mockEntityManager.findOneBy as jest.Mock).mockClear();

      accountRepository.manager.transaction.mockImplementation(
        (cb: (entityManager: EntityManager) => Promise<unknown>) =>
          cb(mockEntityManager),
      );
    });

    it('should create a user within a transaction (Happy Path)', async () => {
      (mockEntityManager.create as jest.Mock).mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        (_entity: any, data: any) => ({ ...data, id: 'new-id' }),
      );
      (mockEntityManager.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      (mockEntityManager.findOneBy as jest.Mock).mockResolvedValue({
        id: 'role-id',
        name: 'user',
      });

      await service.createUnverifiedUser(userData);

      // SỬA: Thêm eslint-disable cho lỗi unbound-method

      expect(accountRepository.manager.transaction).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.create).toHaveBeenCalledWith(
        UserProfile,
        expect.any(Object),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Account,
        expect.any(Object),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.findOneBy).toHaveBeenCalledWith(Role, {
        name: 'User',
      });
    });

    it('should throw NotFoundException if "user" role is not found', async () => {
      (mockEntityManager.findOneBy as jest.Mock).mockResolvedValue(null);

      await expect(service.createUnverifiedUser(userData)).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.createUnverifiedUser(userData)).rejects.toThrow(
        'Default role "User" not found. Please seed the database.',
      );

      // SỬA: Thêm eslint-disable cho lỗi unbound-method
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving to database fails', async () => {
      const dbError = new Error('Database connection lost');
      (mockEntityManager.findOneBy as jest.Mock).mockResolvedValue({
        id: 'role-id',
        name: 'user',
      });
      (mockEntityManager.save as jest.Mock).mockRejectedValue(dbError);

      await expect(service.createUnverifiedUser(userData)).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('verifyAccount', () => {
    it('should update account to be verified', async () => {
      const accountId = 'some-uuid';
      // SỬA: Thay 'as any' bằng 'as UpdateResult'
      accountRepository.update.mockResolvedValue({
        affected: 1,
      } as UpdateResult);

      await service.verifyAccount(accountId);

      expect(accountRepository.update).toHaveBeenCalledWith(accountId, {
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
