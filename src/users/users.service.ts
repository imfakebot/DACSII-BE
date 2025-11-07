import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(Account) private accountRepository: Repository<Account>,
        @InjectRepository(Role) private roleRepository: Repository<Role>,
        @InjectRepository(UserProfile) private userProfileRepository: Repository<UserProfile>,
    ) { }

    async findAccountByEmail(email: string): Promise<Account | null> {
        return this.accountRepository.findOne({ where: { email } });
    }

    async createUnverifiedUser(data: { email: string; passwordHash: string; fullName: string; verificationCode: string; expiresAt: Date }) {
        return this.accountRepository.manager.transaction(async (transactionalEntityManager) => {
            const newProfile = transactionalEntityManager.create(UserProfile, {
                id: uuidv4(),
                fullname: data.fullName,
            });
            await transactionalEntityManager.save(newProfile);

            const defaultRole = await this.roleRepository.findOneBy({ name: 'user' });
            if (!defaultRole) {
                throw new Error('Default role not found');
            }

            const newAccount = transactionalEntityManager.create(Account, {
                id: uuidv4(),
                email: data.email,
                passwordHash: data.passwordHash,
                verificationCode: data.verificationCode,
                expiresAt: data.expiresAt,
                profile: newProfile,
                roles: [defaultRole],
            });
            return transactionalEntityManager.save(newAccount);
        });
    }

    async updateUnverifiedAccount(id: string, data: Partial<Account>): Promise<void> {
        await this.accountRepository.update(id, data);
    }

    async verifyAccount(id: string): Promise<void> {
        await this.accountRepository.update(id, {
            isVerified: true,
            verificationCode: undefined,
            verificationCodeExpiresAt: undefined,
        });
    }

    async hashPassword(passwordHash: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(passwordHash, salt);
    }
}