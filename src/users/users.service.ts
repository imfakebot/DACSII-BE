import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';
import bcrypt from 'bcrypt';
import { Address } from './entities/address.entity';

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
    async findAccountByEmail(email: string): Promise<Account | null> {
        return this.accountRepository.findOne({ where: { email } });
    }

    /**
     * Tạo một người dùng mới với tài khoản chưa được xác thực.
     * Phương thức này thực hiện trong một transaction để đảm bảo tính toàn vẹn dữ liệu
     * giữa việc tạo địa chỉ (nếu có), hồ sơ người dùng và tài khoản.
     * @param data Dữ liệu cần thiết để tạo người dùng, bao gồm thông tin cá nhân và mã xác thực.
     * @returns Promise giải quyết thành đối tượng `Account` vừa được tạo.
     * @throws {Error} Nếu vai trò 'user' mặc định không được tìm thấy.
     */
    async createUnverifiedUser(data: {
        email: string;
        passwordHash: string;
        fullName: string;
        verificationCode: string;
        expiresAt: Date;
        bio: string | null;
        gender: string | null;
        phoneNumber: string;
        street?: string;
        ward_id?: number;
        city_id?: number;
    }) {
        return this.accountRepository.manager.transaction(async (transactionalEntityManager) => {
            let addressId: string | undefined = undefined;

            // Create address if provided
            if (data.street && data.ward_id && data.city_id) {
                const newAddress = transactionalEntityManager.create(Address, {
                    street: data.street,
                    ward_id: data.ward_id,
                    city_id: data.city_id,
                });
                await transactionalEntityManager.save(newAddress);
                addressId = newAddress.id;
            }

            const newProfile = transactionalEntityManager.create(UserProfile, {
                full_name: data.fullName,
                phone_number: data.phoneNumber,
                gender: data.gender,
                bio: data.bio,
                address: addressId ? { id: addressId } : undefined,
            });
            await transactionalEntityManager.save(newProfile);

            const defaultRole = await transactionalEntityManager.findOneBy(Role, { name: 'user' });
            if (!defaultRole) {
                throw new Error('Default role not found');
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
            verification_code: undefined,
            verification_code_expires_at: undefined,
        });
    }
    /**
     * Băm mật khẩu bằng bcrypt.
     * @param passwordHash Mật khẩu ở dạng chuỗi thuần.
     * @returns Promise giải quyết thành chuỗi mật khẩu đã được băm.
     */
    async hashPassword(passwordHash: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(passwordHash, salt);
    }

    /**
     * So sánh một mật khẩu thuần với một chuỗi đã được băm.
     * @param passwordHash Mật khẩu ở dạng chuỗi thuần cần so sánh.
     * @param hash Chuỗi đã được băm để so sánh.
     * @returns Promise giải quyết thành `true` nếu mật khẩu khớp, ngược lại là `false`.
     */
    comparePassword(passwordHash: string, hash: string): Promise<boolean> {
        return bcrypt.compare(passwordHash, hash);
    }
}