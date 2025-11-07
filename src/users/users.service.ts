import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';
import bcrypt from 'bcrypt';
import { Address } from './entities/address.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(Account) private accountRepository: Repository<Account>,
        @InjectRepository(Role) private roleRepository: Repository<Role>,
        @InjectRepository(UserProfile) private userProfileRepository: Repository<UserProfile>,
        @InjectRepository(Address) private addressRepository: Repository<Address>,
    ) { }

    async findAccountByEmail(email: string): Promise<Account | null> {
        return this.accountRepository.findOne({ where: { email } });
    }

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

    async updateUnverifiedAccount(id: string, data: Partial<Account>): Promise<void> {
        await this.accountRepository.update(id, data);
    }

    async verifyAccount(id: string): Promise<void> {
        await this.accountRepository.update(id, {
            is_verified: true,
            verification_code: undefined,
            verification_code_expires_at: undefined,
        });
    }

    async hashPassword(passwordHash: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(passwordHash, salt);
    }
}