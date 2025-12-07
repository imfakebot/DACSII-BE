import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Account } from './entities/account.entity';
import { Role } from '../auth/enums/role.enum';
import { UserProfile } from './entities/users-profile.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { AccountStatus } from './enum/account-status.enum';
import { AuthProvider } from './enum/auth-provider.enum';
import { Gender } from './enum/gender.enum';
import { Branch } from '@/branch/entities/branch.entity';
import { Role as RoleEntity } from './entities/role.entity'; // Import Role entity
import { CreateEmployeeDto } from './dto/create-employee.dto';

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
 * Kiểu dữ liệu cho việc cập nhật tài khoản chưa xác thực,
 * bao gồm cả dữ liệu cho hồ sơ người dùng.
 */
type UpdateUnverifiedAccountPayload = Partial<Account> & {
  profile_data?: {
    full_name?: string;
    phone_number?: string;
    gender?: Gender | null;
  };
};

/**
 * UsersService chịu trách nhiệm xử lý logic nghiệp vụ liên quan đến người dùng,
 * bao gồm tạo, tìm kiếm, và quản lý tài khoản, hồ sơ người dùng.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  /**
   * @param accountRepository Repository để tương tác với bảng 'accounts'.
   * @param roleRepository Repository để tương tác với bảng 'roles'.
   * @param userProfileRepository Repository để tương tác với bảng 'user_profiles'.
   * @param addressRepository Repository để tương tác với bảng 'addresses'.
   */
  constructor(
    @InjectRepository(Account) private accountRepository: Repository<Account>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(RoleEntity) // Inject RoleRepository
    private roleRepository: Repository<RoleEntity>,
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
    this.logger.log(`Finding account by email: ${email}`);
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
    this.logger.log(`Creating unverified user for email: ${data.email}`);
    return this.accountRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Tìm vai trò 'User'
        const userRole = await transactionalEntityManager.findOneBy(RoleEntity, {
          name: Role.User,
        });
        if (!userRole) throw new Error("Vai trò 'User' mặc định không tồn tại.");

        const newProfile = transactionalEntityManager.create(UserProfile, {
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          gender: data.gender,
          bio: data.bio,
        });

        await transactionalEntityManager.save(newProfile);

        const newAccount = transactionalEntityManager.create(Account, {
          email: data.email,
          password_hash: data.passwordHash,
          verification_code: data.verificationCode,
          verification_code_expires_at: data.expiresAt,
          userProfile: newProfile,
          role: userRole,
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
    this.logger.log(`Creating OAuth user for email: ${data.email}`);
    return this.accountRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Tìm vai trò 'User'
        const userRole = await transactionalEntityManager.findOneBy(RoleEntity, {
          name: Role.User,
        });
        if (!userRole) throw new Error("Vai trò 'User' mặc định không tồn tại.");

        const newProfile = transactionalEntityManager.create(UserProfile, {
          full_name: data.fullName,
        });
        await transactionalEntityManager.save(newProfile);

        const newAccount = transactionalEntityManager.create(Account, {
          email: data.email,
          provider: data.provider,
          is_verified: true, // Tài khoản OAuth được coi là đã xác thực
          password_hash: null,
          userProfile: newProfile,
          role: userRole,
        });

        return transactionalEntityManager.save(newAccount);
      },
    );
  }

  /**
   * Cập nhật thông tin cho một tài khoản chưa được xác thực.
   * Thường dùng để cập nhật mã xác thực mới và thời gian hết hạn.
   * SỬA ĐỔI: Hàm này giờ đây chạy trong một transaction để cập nhật cả Account và UserProfile,
   * giải quyết vấn đề số điện thoại bị "kẹt" khi người dùng đăng ký lại.
   * @param id ID của tài khoản cần cập nhật.
   * @param data Dữ liệu cần cập nhật, có thể bao gồm cả `profile_data`.
   */
  async updateUnverifiedAccount(
    id: string,
    data: UpdateUnverifiedAccountPayload,
  ): Promise<void> {
    this.logger.log(`Updating unverified account for id: ${id}`);
    const { profile_data, ...accountData } = data;

    await this.accountRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Nếu có profile_data, tìm và cập nhật UserProfile
        if (profile_data) {
          const account = await transactionalEntityManager.findOne(Account, {
            where: { id },
            relations: ['userProfile'],
          });
          if (account && account.userProfile) {
            await transactionalEntityManager.update(
              UserProfile,
              account.userProfile.id,
              profile_data,
            );
          }
        }
        // Cập nhật Account
        await transactionalEntityManager.update(Account, id, accountData);
      },
    );
  }

  /**
   * Xác thực một tài khoản.
   * Cập nhật trạng thái `is_verified` thành `true` và xóa thông tin mã xác thực.
   * @param id ID của tài khoản cần xác thực.
   */
  async verifyAccount(id: string): Promise<void> {
    this.logger.log(`Verifying account for id: ${id}`);
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
  async findProfileByAccountId(
    accountId: string,
    relations: string[] = [],
  ): Promise<UserProfile | null> {
    this.logger.log(`Finding profile by account id: ${accountId}`);
    return this.userProfileRepository.findOne({
      where: { account: { id: accountId } },
      relations: [...new Set(['account', 'branch', ...relations])],
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
    this.logger.log(`Finding account by id: ${id}`);
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
    this.logger.log(`Updating account for id: ${id}`);
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
    this.logger.log(
      `Updating profile for account id: ${accountId} with data: ${JSON.stringify(
        data,
      )}`,
    );
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
    this.logger.log('Finding account by valid reset token');
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
    this.logger.log(`Updating last login for account id: ${accountId}`);
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
    this.logger.log(`Finding all users for page: ${page}, limit: ${limit}`);
    const [user, total] = await this.accountRepository.findAndCount({
      relations: ['userProfile', 'role', 'userProfile.branch'],
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
    this.logger.log(`Banning user with id: ${id}`);
    await this.accountRepository.update(id, {
      status: AccountStatus.SUSPENDED,
    });

    return { message: 'Đã khóa tài khoản thành công' };
  }

  /**
   * Mở khóa (unban) tài khoản của một người dùng.
   * @param id ID của tài khoản cần mở khóa.
   * @returns Promise giải quyết thành một đối tượng chứa thông báo thành công.
   */
  async unbanUser(id: string) {
    this.logger.log(`Unbanning user with id: ${id}`);
    const account = await this.accountRepository.findOneBy({ id });
    if (!account) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }
    await this.accountRepository.update(id, {
      status: AccountStatus.ACTIVE,
    });

    return { message: 'Đã mở khóa tài khoản thành công' };
  }

  async findProfileByPhoneNumber(phone: string): Promise<UserProfile | null> {
    this.logger.log(`Finding profile by phone number: ${phone}`);
    return this.userProfileRepository.findOne({
      where: {
        phone_number: phone,
      },
      relations: ['account'], // Tải kèm thông tin tài khoản để kiểm tra
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
    this.logger.log(`Updating avatar for account id: ${accountId}`);
    if (!avatarPath) {
      throw new Error('Thiếu đường dẫn');
    }
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

  /**
   * @method changePassword
   * @description Thay đổi mật khẩu cho người dùng đã đăng nhập.
   * @param accountId ID của tài khoản người dùng.
   * @param oldPassword Mật khẩu cũ để xác thực.
   * @param newPassword Mật khẩu mới.
   * @returns Một thông báo thành công.
   * @throws {NotFoundException} Nếu không tìm thấy tài khoản.
   * @throws {BadRequestException} Nếu tài khoản là tài khoản OAuth hoặc mật khẩu mới trùng mật khẩu cũ.
   * @throws {UnauthorizedException} Nếu mật khẩu cũ không đúng.
   */
  async changePassword(
    accountId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Changing password for account id: ${accountId}`);
    const account = await this.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    if (!account.password_hash) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng mạng xã hội không thể đổi mật khẩu.',
      );
    }

    const isPasswordMatching = await this.comparePassword(
      oldPassword,
      account.password_hash,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Mật khẩu cũ không chính xác.');
    }
    account.password_hash = await this.hashPassword(newPassword);
    await this.accountRepository.save(account);
    return { message: 'Đổi mật khẩu thành công.' };
  }

  /**
   * Tìm một hồ sơ người dùng đã được xác thực bằng số điện thoại.
   * @param phone Số điện thoại cần tìm.
   * @returns Promise giải quyết thành đối tượng `UserProfile` nếu tìm thấy, ngược lại là `null`.
   */
  async findVerifiedProfileByPhoneNumber(
    phone: string,
  ): Promise<UserProfile | null> {
    this.logger.log(`Finding verified profile by phone number: ${phone}`);
    return this.userProfileRepository.findOne({
      where: {
        phone_number: phone,
        account: { is_verified: true }, // Chỉ tìm các tài khoản đã xác thực
      },
      relations: ['account'], // Tải kèm thông tin tài khoản để kiểm tra
    });
  }

  /**
   * Tạo tài khoản nhân viên (Staff hoặc Branch Manager).
   * - Nếu Admin gọi: Tạo Branch Manager (yêu cầu branchId).
   * - Nếu Manager gọi: Tạo Staff (tự động lấy branchId của Manager).
   */
  async createEmployee(
    requesterId: string,
    data: CreateEmployeeDto,
  ): Promise<Account> {
    this.logger.log(
      `Creating employee with requester id: ${requesterId} and data: ${JSON.stringify(
        data,
      )}`,
    );
    // 1. Lấy thông tin người đang thực hiện request (kèm Role và Branch)
    const requester = await this.accountRepository.findOne({
      where: { id: requesterId },
      relations: ['role', 'userProfile', 'userProfile.branch'],
    });

    if (!requester) {
      throw new NotFoundException('Người thực hiện không tồn tại.');
    }

    const requesterRoleName = requester.role.name;
    let targetRoleName: Role;

    // 2. Phân quyền và xác định vai trò của nhân viên mới
    if (requesterRoleName === String(Role.Admin)) {
      targetRoleName = Role.Manager;
    } else if (requesterRoleName === String(Role.Manager)) {
      if (!requester.userProfile?.branch?.id) {
        throw new ForbiddenException(
          'Tài khoản của bạn phải được gán vào một chi nhánh để thực hiện hành động này.',
        );
      }
      targetRoleName = Role.Staff;
    } else {
      throw new ForbiddenException('Bạn không có quyền tạo tài khoản nhân viên.');
    }

    // 3. Kiểm tra Email đã tồn tại chưa
    const existingUser = await this.accountRepository.findOneBy({
      email: data.email,
    });
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng.');
    }

    // 4. Kiểm tra số điện thoại
    if (data.phoneNumber) {
      const existingPhone = await this.userProfileRepository.findOneBy({
        phone_number: data.phoneNumber,
      });
      if (existingPhone) {
        throw new ConflictException('Số điện thoại đã được sử dụng.');
      }
    }

    // 5. Hash mật khẩu
    const hashedPassword = await this.hashPassword(data.password);

    // 6. Thực hiện Transaction lưu DB
    return this.accountRepository.manager.transaction(async (manager) => {
      // 6.1 Lấy Role từ DB (để đảm bảo vai trò tồn tại)
      const targetRoleEntity = await manager.findOneBy(RoleEntity, {
        name: targetRoleName,
      });
      if (!targetRoleEntity)
        throw new NotFoundException(`Vai trò '${targetRoleName}' không tồn tại.`);

      // Logic lấy Branch ID
      const targetBranchId =
        requesterRoleName === String (Role.Admin)
          ? data.branchId
          : requester.userProfile?.branch?.id;

      if (!targetBranchId) {
        throw new BadRequestException('Không xác định được chi nhánh làm việc.');
      }

      // 6.2 Lấy Branch từ DB
      const branch = await manager.findOne(Branch, {
        where: { id: targetBranchId },
      });
      if (!branch) throw new NotFoundException('Chi nhánh không tồn tại.');

      // 6.3 Tạo UserProfile
      const newProfile = manager.create(UserProfile, {
        full_name: data.fullName,
        phone_number: data.phoneNumber,
        gender: data.gender || null,
        bio: data.bio || null,
        is_profile_complete: true, // Nhân viên thì coi như profile đã xong
        branch: branch, // Gán quan hệ Branch vào đây (Quan trọng!)
      });
      await manager.save(newProfile);

      // 6.4 Tạo Account
      const newAccount = manager.create(Account, {
        email: data.email,
        password_hash: hashedPassword,
        is_verified: true, // Tài khoản nội bộ được xác thực luôn
        status: AccountStatus.ACTIVE,
        userProfile: newProfile,
        role: targetRoleEntity, // Gán thực thể Role
      });

      const savedAccount = await manager.save(newAccount);

      // (Tùy chọn) Nếu tạo Manager, cập nhật lại bảng Branch để set người này làm manager_id
      if (targetRoleName === Role.Manager) {
        // Lưu ý: Logic này sẽ ghi đè manager cũ nếu có
        await manager.update(Branch, targetBranchId, {
          manager_id: newProfile.id,
        });
      }

      return savedAccount;
    });
  }
}
