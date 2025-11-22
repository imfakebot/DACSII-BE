import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, Not, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Sửa lại cách import bcrypt để tương thích tốt hơn
import { Account, AuthProvider } from './entities/account.entity';
import { Role } from './entities/role.entity';
import { Gender, UserProfile } from './entities/users-profile.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

/**
 * Kiểu dữ liệu cho việc tạo người dùng chưa xác thực.
 * Được định nghĩa riêng để code sạch sẽ hơn.
 */
type CreateUnverifiedUserDto = {
  email: string;
  passwordHash: string;
  fullName: string;
  verificationCode: string;
  expiresAt: Date;
  bio: string | null;
  gender: Gender | null;
  phoneNumber: string;
};

/**
 * Kiểu dữ liệu cho việc tạo người dùng qua OAuth.
 */
type CreateOAuthUserPayload = {
  email: string;
  fullName: string;
  provider: AuthProvider;
};

/**
 * UsersService chịu trách nhiệm xử lý logic nghiệp vụ liên quan đến người dùng,
 * bao gồm tạo, tìm kiếm, và quản lý tài khoản, hồ sơ người dùng.
 */
@Injectable()
export class UsersService {
  /**
   * @param accountRepository Repository để tương tác với bảng 'accounts'.
   * @param roleRepository Repository để tương tác với bảng 'roles'.
   * @param userProfileRepository Repository để tương tác với bảng 'user_profiles'.
   * @param addressRepository Repository để tương tác với bảng 'addresses'.
   */
  constructor(
    @InjectRepository(Account) private accountRepository: Repository<Account>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  /**
   * Tìm kiếm một tài khoản dựa trên địa chỉ email.
   * @param email Email của tài khoản cần tìm.
   * @returns Promise giải quyết thành đối tượng `Account` nếu tìm thấy, ngược lại là `null`.
   */
  async findAccountByEmail(
    email: string,
    relations: string[] = [],
  ): Promise<Account | null> {
    return this.accountRepository.findOne({ where: { email }, relations });
  }

  /**
   * Tạo một tài khoản người dùng mới nhưng chưa được xác thực.
   * Quá trình này bao gồm việc tạo hồ sơ người dùng (UserProfile), địa chỉ (Address, nếu có),
   * và tài khoản (Account) trong một giao dịch cơ sở dữ liệu duy nhất để đảm bảo tính toàn vẹn dữ liệu.
   * Tài khoản mới sẽ có vai trò 'User' mặc định và một mã xác thực.
   * @param data Dữ liệu cần thiết để tạo người dùng, bao gồm thông tin tài khoản, hồ sơ và địa chỉ tùy chọn.
   * @returns Promise giải quyết thành đối tượng `Account` vừa được tạo.
   * @throws {Error} Nếu vai trò 'User' mặc định không được tìm thấy trong cơ sở dữ liệu.
   */
  async createUnverifiedUser(data: CreateUnverifiedUserDto): Promise<Account> {
    return this.accountRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const newProfile = transactionalEntityManager.create(UserProfile, {
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          gender: data.gender,
          bio: data.bio,
        });

        await transactionalEntityManager.save(newProfile);

        const defaultRole = await transactionalEntityManager.findOneBy(Role, {
          name: 'User',
        });
        if (!defaultRole) {
          throw new Error(
            'Default role "User" not found. Please seed the database.',
          );
        }

        const newAccount = transactionalEntityManager.create(Account, {
          email: data.email,
          password_hash: data.passwordHash,
          verification_code: data.verificationCode,
          verification_code_expires_at: data.expiresAt,
          userProfile: newProfile,
          role: defaultRole,
        });

        return transactionalEntityManager.save(newAccount);
      },
    );
  }
  /**
   * Tạo một tài khoản mới cho người dùng đăng nhập qua OAuth.
   * Tài khoản này sẽ được đánh dấu là đã xác thực ngay lập tức và không có mật khẩu.
   * @param data Dữ liệu người dùng từ OAuth provider.
   * @returns Promise giải quyết thành đối tượng `Account` vừa được tạo.
   * @throws {Error} Nếu vai trò 'user' mặc định không được tìm thấy.
   */
  async createOAuthUser(data: CreateOAuthUserPayload): Promise<Account> {
    return this.accountRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const newProfile = transactionalEntityManager.create(UserProfile, {
          full_name: data.fullName,
        });
        await transactionalEntityManager.save(newProfile);

        const defaultRole = await transactionalEntityManager.findOneBy(Role, {
          name: 'User',
        });
        if (!defaultRole) {
          throw new Error(
            'Default role "User" not found. Please seed the database.',
          );
        }

        const newAccount = transactionalEntityManager.create(Account, {
          email: data.email,
          provider: data.provider,
          is_verified: true, // Tài khoản OAuth được coi là đã xác thực
          password_hash: undefined, // Dùng undefined để TypeORM hiểu là NULL
          userProfile: newProfile,
          role: defaultRole,
        });

        return transactionalEntityManager.save(newAccount);
      },
    );
  }

  /**
   * Cập nhật thông tin cho một tài khoản chưa được xác thực.
   * Thường dùng để cập nhật mã xác thực mới và thời gian hết hạn.
   * @param id ID của tài khoản cần cập nhật.
   * @param data Dữ liệu cần cập nhật (một phần của đối tượng Account).
   */
  async updateUnverifiedAccount(
    id: string,
    data: Partial<Account>,
  ): Promise<void> {
    await this.accountRepository.update(id, data);
  }

  /**
   * Xác thực một tài khoản.
   * Cập nhật trạng thái `is_verified` thành `true` và xóa thông tin mã xác thực.
   * @param id ID của tài khoản cần xác thực.
   */
  async verifyAccount(id: string): Promise<void> {
    await this.accountRepository.update(id, {
      is_verified: true,
      verification_code: undefined, // Dùng undefined để TypeORM bỏ qua cột này hoặc đặt về NULL nếu cột là nullable
      verification_code_expires_at: undefined,
    });
  }

  /**
   * Băm mật khẩu bằng bcrypt.
   * @param password Mật khẩu ở dạng chuỗi thuần.
   * @returns Promise giải quyết thành chuỗi mật khẩu đã được băm.
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  /**
   * So sánh một mật khẩu thuần với một chuỗi đã được băm.
   * @param password Mật khẩu ở dạng chuỗi thuần cần so sánh.
   * @param hash Chuỗi đã được băm để so sánh.
   * @returns Promise giải quyết thành `true` nếu mật khẩu khớp, ngược lại là `false`.
   */
  comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async findProfileByAccountId(accountId: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({
      where: { account: { id: accountId } },
      relations: ['address'],
    });
  }

  async findAccountById(id: string) {
    return this.accountRepository.findOne({ where: { id }, relations: ['userProfile','role'] });
  }

  async updateAccount(id: string, data: Partial<Account>) {
    // TypeORM bỏ qua các trường undefined; nếu tất cả đều undefined sẽ gây lỗi UpdateValuesMissingError.
    // Chuyển undefined -> null khi mục đích là xoá giá trị và lọc bỏ key không có thay đổi thực sự.
    const sanitizedEntries = Object.entries(data)
      .filter(([_, v]) => v !== undefined) // loại bỏ undefined để tránh update rỗng
      .map(([k, v]) => [k, v === undefined ? null : v]);
    const sanitized: Record<string, any> = Object.fromEntries(sanitizedEntries);
    if (Object.keys(sanitized).length === 0) {
      return; // Không có gì để cập nhật -> bỏ qua
    }
    await this.accountRepository.update(id, sanitized);
  }

  /**
   * SỬA ĐỔI: Cập nhật các thông tin hồ sơ cơ bản của người dùng (không bao gồm địa chỉ)
   * và đánh dấu hồ sơ là đã hoàn thành.
   * @param accountId ID của tài khoản người dùng (lấy từ token).
   * @param data Dữ liệu hồ sơ cần cập nhật từ DTO.
   * @returns Một thông báo thành công.
   */
  async updateProfile(
    accountId: string,
    data: UpdateUserProfileDto,
  ): Promise<{ message: string }> {
    // 1. Tìm tài khoản và userProfile liên quan
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['userProfile'], // Chỉ cần join userProfile
    });

    if (!account || !account.userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    const userProfile = account.userProfile;

    // 2. Cập nhật các trường thông tin của UserProfile
    // DTO của bạn cũng không cần các trường street, ward_id, city_id.
    // Ép kiểu `data.gender` thành `Gender` vì DTO nhận `string` nhưng entity cần `Gender` enum.
    this.userProfileRepository.merge(userProfile, {
      ...data,
      gender: data.gender as Gender,
    });

    // 3. Quan trọng: Đánh dấu hồ sơ đã hoàn thành
    userProfile.is_profile_complete = true;

    // 4. Lưu lại các thay đổi vào UserProfile
    await this.userProfileRepository.save(userProfile);

    return { message: 'Cập nhật hồ sơ thành công.' };
  }

  async findAccountByHashedResetToken(token: string): Promise<string> {
    const hashedToken = await bcrypt.hash(token, 10);
    return hashedToken;
  }

  /**
   * Tìm tài khoản bằng token đặt lại mật khẩu còn hiệu lực.
   * @param token Token thuần nhận được từ client.
   */
  async findAccountByValidResetToken(rawToken: string): Promise<Account | null> {
    // Vì token được lưu dưới dạng hash với salt khác nhau mỗi lần, không thể tìm trực tiếp bằng WHERE.
    // Lấy tất cả các account còn hạn token rồi dùng bcrypt.compare.
    const candidates = await this.accountRepository.find({
      where: {
        password_reset_expires: MoreThan(new Date()),
        password_reset_token: Not(IsNull()),
      },
    });
    for (const acc of candidates) {
      if (acc.password_reset_token && await bcrypt.compare(rawToken, acc.password_reset_token)) {
        return acc;
      }
    }
    return null;
  }

  /**
   * Cập nhật thời gian đăng nhập cuối cùng cho một tài khoản.
   * @param accountId ID của tài khoản vừa đăng nhập thành công.
   */
  async updateLastLogin(accountId: string): Promise<void> {
    await this.accountRepository.update(accountId, {
      last_login: new Date(),
    });
  }
}
