import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Sửa lại cách import bcrypt để tương thích tốt hơn

import { Account } from './entities/account.entity';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';
import { Address } from '../locations/entities/address.entity';

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
    gender: string | null;
    phoneNumber: string;
    // Các trường địa chỉ là tùy chọn
    street?: string;
    ward_id?: number;
    city_id?: number;
};

/**
 * Kiểu dữ liệu cho việc tạo người dùng qua OAuth.
 */
type CreateOAuthUserPayload = {
    email: string;
    fullName: string;
    provider: string;
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
        @InjectRepository(UserProfile) private userProfileRepository: Repository<UserProfile>,
        @InjectRepository(Address) private addressRepository: Repository<Address>,
    ) { }

    /**
    * Tìm kiếm một tài khoản dựa trên địa chỉ email.
    * @param email Email của tài khoản cần tìm.
    * @returns Promise giải quyết thành đối tượng `Account` nếu tìm thấy, ngược lại là `null`.
    */
    async findAccountByEmail(email: string, relations: string[] = []): Promise<Account | null> {
        return this.accountRepository.findOne({ where: { email }, relations });
    }

    /**
    * Tạo một người dùng mới với tài khoản chưa được xác thực.
    * Phương thức này thực hiện trong một transaction để đảm bảo tính toàn vẹn dữ liệu
    * giữa việc tạo địa chỉ (nếu có), hồ sơ người dùng và tài khoản.
    * @param data Dữ liệu cần thiết để tạo người dùng, bao gồm thông tin cá nhân và mã xác thực.
    * @returns Promise giải quyết thành đối tượng `Account` vừa được tạo.
    * @throws {Error} Nếu vai trò 'user' mặc định không được tìm thấy.
    */
    async createUnverifiedUser(data: CreateUnverifiedUserDto): Promise<Account> {
        return this.accountRepository.manager.transaction(async (transactionalEntityManager) => {
            let addressId: string | undefined = undefined;

            // Chỉ tạo địa chỉ nếu có đủ thông tin
            if (data.street && data.ward_id && data.city_id) {
                const newAddress = transactionalEntityManager.create(Address, {
                    street: data.street,
                    ward_id: data.ward_id,
                    city_id: data.city_id,
                });
                const savedAddress = await transactionalEntityManager.save(newAddress);
                addressId = savedAddress.id;
            }

            const newProfile = transactionalEntityManager.create(UserProfile, {
                full_name: data.fullName,
                phone_number: data.phoneNumber,
                gender: data.gender,
                bio: data.bio,
                // TypeORM có thể nhận một object chỉ có id để tạo mối quan hệ
                address: addressId ? { id: addressId } : undefined,
            });
            await transactionalEntityManager.save(newProfile);

            const defaultRole = await transactionalEntityManager.findOneBy(Role, { name: 'User' });
            if (!defaultRole) {
                // Trong môi trường thực tế, nên dùng một loại exception cụ thể hơn, ví dụ InternalServerErrorException của NestJS
                throw new Error('Default role "User" not found. Please seed the database.');
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
        });
    }

    /**
    * Tạo một tài khoản mới cho người dùng đăng nhập qua OAuth.
    * Tài khoản này sẽ được đánh dấu là đã xác thực ngay lập tức và không có mật khẩu.
    * @param data Dữ liệu người dùng từ OAuth provider.
    * @returns Promise giải quyết thành đối tượng `Account` vừa được tạo.
    * @throws {Error} Nếu vai trò 'user' mặc định không được tìm thấy.
    */
    async createOAuthUser(data: CreateOAuthUserPayload): Promise<Account> {
        return this.accountRepository.manager.transaction(async (transactionalEntityManager) => {
            const newProfile = transactionalEntityManager.create(UserProfile, {
                full_name: data.fullName,
            });
            await transactionalEntityManager.save(newProfile);

            const defaultRole = await transactionalEntityManager.findOneBy(Role, { name: 'User' });
            if (!defaultRole) {
                throw new Error('Default role "User" not found. Please seed the database.');
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
        });
    }

    /**
    * Cập nhật thông tin cho một tài khoản chưa được xác thực.
    * Thường dùng để cập nhật mã xác thực mới và thời gian hết hạn.
    * @param id ID của tài khoản cần cập nhật.
    * @param data Dữ liệu cần cập nhật (một phần của đối tượng Account).
    */
    async updateUnverifiedAccount(id: string, data: Partial<Account>): Promise<void> {
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
        return this.accountRepository.findOne({ where: { id } });
    }

    async updateAccount(id: string, data: Partial<Account>) {
        await this.accountRepository.update(id, data);
    }
}