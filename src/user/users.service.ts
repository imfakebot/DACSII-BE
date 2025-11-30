import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Sửa lại cách import bcrypt để tương thích tốt hơn
import { Account } from './entities/account.entity';
import { Role } from './entities/role.entity';
import { Gender, UserProfile } from './entities/users-profile.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { AccountStatus } from './enum/account-status.enum';
import { AuthProvider } from './enum/auth-provider.enum';

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
  ) { }

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
   * @returns {Promise<Account>} Promise giải quyết thành đối tượng `Account` vừa được tạo.
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
   * @returns {Promise<Account>} Promise giải quyết thành đối tượng `Account` vừa được tạo.
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
          password_hash: null,
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
      verification_code: null,
      verification_code_expires_at: null,
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

  /**
   * Tìm hồ sơ người dùng (UserProfile) dựa trên ID của tài khoản (Account).
   * @param accountId ID của tài khoản liên quan.
   * @returns Promise giải quyết thành đối tượng `UserProfile` nếu tìm thấy, ngược lại là `null`.
   */
  async findProfileByAccountId(accountId: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({
      where: { account: { id: accountId } },
      relations: ['account', 'account.role'],
    });
  }
  /**
   * Tìm một tài khoản bằng ID của nó.
   * @param id ID của tài khoản cần tìm.
   * @returns Promise giải quyết thành đối tượng `Account` nếu tìm thấy, ngược lại là `null`.
   */
  async findAccountById(
    id: string,
    relations: string[] = [],
  ): Promise<Account | null> {
    if (!id) {
      throw new NotFoundException('ID người dùng không hợp lệ.');
    }
    return this.accountRepository.findOne({ where: { id }, relations });
  }

  /**
   * Cập nhật thông tin của một tài khoản.
   * @param id ID của tài khoản cần cập nhật.
   * @param data Dữ liệu cần cập nhật (một phần của đối tượng Account).
   * @returns {Promise<void>}
   */
  async updateAccount(id: string, data: Partial<Account>) {
    await this.accountRepository.update(id, data);
  }

  /**
   * @method updateProfile
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

    // 2. Cập nhật các trường một cách tường minh thay vì dùng spread operator
    if (data.full_name) {
      userProfile.full_name = data.full_name;
    }
    if (data.phone_number) {
      userProfile.phone_number = data.phone_number;
    }
    if (data.gender) {
      userProfile.gender = data.gender as Gender;
    }
    if (data.date_of_birth) {
      userProfile.date_of_birth = data.date_of_birth;
    }
    if (data.bio) {
      userProfile.bio = data.bio;
    }

    // 3. Quan trọng: Đánh dấu hồ sơ đã hoàn thành
    userProfile.is_profile_complete = true;

    // 4. Lưu lại các thay đổi vào UserProfile
    await this.userProfileRepository.save(userProfile);

    return { message: 'Cập nhật hồ sơ thành công.' };
  }

  /**
   * Băm một token (dùng cho việc tìm kiếm sau này, nhưng tên hàm có thể gây nhầm lẫn).
   * @param token Token thuần cần được băm.
   * @returns Promise giải quyết thành chuỗi token đã được băm.
   */
  async findAccountByHashedResetToken(token: string): Promise<string> {
    const hashedToken = await bcrypt.hash(token, 10);
    return hashedToken;
  }

  /**
   * Tìm tài khoản bằng token đặt lại mật khẩu còn hiệu lực.
   * @param token Token thuần nhận được từ client.
   */
  async findAccountByValidResetToken(token: string): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: {
        password_reset_token: token, // So sánh token thuần
        password_reset_expires: MoreThan(new Date()), // Đảm bảo chưa hết hạn
      },
    });
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

  /**
   * Lấy danh sách tất cả người dùng với phân trang.
   * @param page Số trang hiện tại.
   * @param limit Số lượng kết quả trên mỗi trang.
   * @returns Promise giải quyết thành một đối tượng chứa dữ liệu người dùng và tổng số lượng.
   */
  async findAllUser(page: number, limit: number) {
    const [user, total] = await this.accountRepository.findAndCount({
      relations: ['userProfile', 'role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return {
      data: user,
      total,
    };
  }

  /**
   * Khóa (treo) tài khoản của một người dùng.
   * @param id ID của tài khoản cần khóa.
   * @returns Promise giải quyết thành một đối tượng chứa thông báo thành công.
   */
  async banUser(id: string) {
    await this.accountRepository.update(id, {
      status: AccountStatus.SUSPENDED,
    });

    return { message: 'Đã khóa tài khoản thành công' };
  }

  async findProfileByPhoneNumber(phone: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({
      where: {
        phone_number: phone,
      },
    });
  }

  /**
  * @method updateAvatar
  * Cập nhật đường dẫn ảnh đại diện cho người dùng.
  * @param accountId ID của tài khoản người dùng.
  * @param avatarPath Đường dẫn đến file ảnh đã được lưu trên server.
  * @returns Hồ sơ người dùng sau khi cập nhật.
  */
  async updateAvatar(
    accountId: string,
    avatarPath: string,
  ): Promise<UserProfile> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['userProfile'],
    });

    if (!account || !account.userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    // Giả sử bạn có một cột 'avatar_url' trong bảng 'user_profiles'
    account.userProfile.avatar_url = `/${avatarPath.replace(/\\/g, '/')}`; // Chuẩn hóa đường dẫn

    return this.userProfileRepository.save(account.userProfile);
  }
}
