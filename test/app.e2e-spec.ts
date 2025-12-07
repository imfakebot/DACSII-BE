import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../src/user/entities/account.entity';
import { UserProfile } from '../src/user/entities/users-profile.entity';
import { RegisterUserDto } from '../src/auth/dto/register-user.dto';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accountRepository: Repository<Account>;
  let userProfileRepository: Repository<UserProfile>;

  const registerDto: RegisterUserDto = {
    email: 'e2e-test@example.com',
    password: 'StrongPassword123!',
    full_name: 'E2E Test User',
    phone_number: '0987654321',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    accountRepository = moduleFixture.get<Repository<Account>>(
      getRepositoryToken(Account),
    );
    userProfileRepository = moduleFixture.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
  });

  beforeEach(async () => {
    await accountRepository.delete({});
    await userProfileRepository.delete({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Registration Flow', () => {
    it('/auth/register/initiate (POST) - should initiate registration and send code', () => {
      return request(app.getHttpServer())
        .post('/auth/register/initiate')
        .send(registerDto)
        .expect(200)
        .then((res: request.Response) => {
          expect((res.body as { message: string }).message).toContain(
            'Mã xác thực đã được gửi',
          );
        });
    });

    it('/auth/register/initiate (POST) - should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register/initiate')
        .send({ ...registerDto, email: 'not-an-email' })
        .expect(400)
        .then((res: request.Response) => {
          expect(
            (res.body as { message: string[] }).message,
          ).toContain('Định dạng email không hợp lệ.');
        });
    });

    it('/auth/register/complete (POST) - should verify account with correct code', async () => {
      await request(app.getHttpServer())
        .post('/auth/register/initiate')
        .send(registerDto);

      const account = await accountRepository.findOneBy({
        email: registerDto.email,
      });
      expect(account).toBeDefined();
      expect(account?.verification_code).toBeTruthy();

      return request(app.getHttpServer())
        .post('/auth/register/complete')
        .send({
          email: registerDto.email,
          verificationCode: account?.verification_code,
        })
        .expect(200)
        .then((res: request.Response) => {
          expect((res.body as { message: string }).message).toEqual(
            'Tài khoản của bạn đã được xác thực thành công.',
          );
        });
    });

    it('/auth/register/complete (POST) - should fail with incorrect code', async () => {
      await request(app.getHttpServer())
        .post('/auth/register/initiate')
        .send(registerDto);

      return request(app.getHttpServer())
        .post('/auth/register/complete')
        .send({ email: registerDto.email, verificationCode: 'WRONGCODE' })
        .expect(409)
        .then((res: request.Response) => {
          expect((res.body as { message: string }).message).toEqual(
            'Mã xác thực không hợp lệ hoặc đã hết hạn.',
          );
        });
    });
  });

  describe('Login Flow', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register/initiate')
        .send(registerDto);
      const account = await accountRepository.findOneBy({
        email: registerDto.email,
      });
      await request(app.getHttpServer())
        .post('/auth/register/complete')
        .send({
          email: registerDto.email,
          verificationCode: account?.verification_code,
        });
    });

    it('/auth/login/initiate (POST) - should succeed with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login/initiate')
        .send({ email: registerDto.email, password: registerDto.password })
        .expect(200)
        .then((res: request.Response) => {
          expect((res.body as { message: string }).message).toContain(
            'Mật khẩu chính xác. Một mã xác thực đã được gửi đến email của bạn.',
          );
        });
    });

    it('/auth/login/initiate (POST) - should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login/initiate')
        .send({ email: registerDto.email, password: 'wrong-password' })
        .expect(401);
    });

    it('/auth/login/complete (POST) - should login with correct code and return tokens', async () => {
      await request(app.getHttpServer())
        .post('/auth/login/initiate')
        .send({ email: registerDto.email, password: registerDto.password });

      const account = await accountRepository.findOneBy({
        email: registerDto.email,
      });
      expect(account?.verification_code).toBeDefined();

      return request(app.getHttpServer())
        .post('/auth/login/complete')
        .send({
          email: registerDto.email,
          verificationCode: account?.verification_code,
        })
        .expect(200)
        .then((res: request.Response) => {
          const body = res.body as {
            accessToken: string;
            user: { email: string };
          };
          expect(body).toHaveProperty('accessToken');
          expect(body).toHaveProperty('user');
          expect(body.user.email).toEqual(registerDto.email);
          const cookies = res.headers['set-cookie'] as string[];
          expect(
            cookies.some((c: string) => c.startsWith('refresh_token=')),
          ).toBe(true);
        });
    });

    it('/auth/login/complete (POST) - should fail with incorrect code', async () => {
      await request(app.getHttpServer())
        .post('/auth/login/initiate')
        .send({ email: registerDto.email, password: registerDto.password });

      return request(app.getHttpServer())
        .post('/auth/login/complete')
        .send({ email: registerDto.email, verificationCode: 'WRONGCODE' })
        .expect(401)
        .then((res: request.Response) => {
          expect((res.body as { message: string }).message).toEqual(
            'Sai mã xác thực hoặc đã hết hạn.',
          );
        });
    });
  });
});
