import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// SỬA 1: Thay đổi cách import 'supertest' để hoạt động ổn định hơn
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './../src/users/entities/account.entity';
import { UserProfile } from './../src/users/entities/users-profile.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accountRepository: Repository<Account>;
  let userProfileRepository: Repository<UserProfile>;

  const registerDto = {
    email: 'e2e-test@example.com',
    password: 'StrongPassword123!',
    full_name: 'E2E Test User',
    phoneNumber: '0987654321',
  };

  // 1. Khởi động ứng dụng (chỉ một lần)
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Áp dụng ValidationPipe y hệt như trong main.ts
    // Điều này RẤT QUAN TRỌNG để test lỗi validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Lấy repository để dọn dẹp DB
    accountRepository = moduleFixture.get<Repository<Account>>(
      getRepositoryToken(Account),
    );
    userProfileRepository = moduleFixture.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
  });

  // 2. Dọn dẹp Database TRƯỚC MỖI test case
  beforeEach(async () => {
    // Phải xóa Account trước vì nó có khóa ngoại tới UserProfile
    await accountRepository.clear();
    await userProfileRepository.clear();
  });

  // 3. Đóng ứng dụng (chỉ một lần)
  afterAll(async () => {
    await app.close();
  });

  // 4. Bắt đầu viết Test Cases
  describe('/auth/register (POST)', () => {
    it('should register a new user and return 201', () => {
      // SỬA 2: Thêm 'as any' để fix lỗi 'no-unsafe-argument' (Warning)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return (
        request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201) // Mong đợi 201 Created
          // SỬA 3: Cung cấp type cụ thể cho 'res' và sửa lại 'expect'
          .then((res: { body: { message: string } }) => {
            // Kiểm tra response body
            expect(res.body.message).toEqual(
              expect.stringContaining('Mã xác thực đã được gửi đến'),
            );
          })
      );
    });

    it('should return 400 Bad Request for invalid DTO (invalid email)', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return (
        request(app.getHttpServer())
          .post('/auth/register')
          .send({ ...registerDto, email: 'not-an-email' })
          .expect(400) // Mong đợi 400 Bad Request
          // SỬA 4: Cung cấp type cụ thể cho 'res' (lỗi validation trả về string[])
          .then((res: { body: { message: string[] } }) => {
            // Kiểm tra message lỗi từ ValidationPipe
            expect(res.body.message).toContain('email must be an email');
          })
      );
    });

    it('should return 400 Bad Request for missing required field (full_name)', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { full_name, ...badDto } = registerDto;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(badDto)
        .expect(400);
    });

    it('should return 409 Conflict if email is already in use', async () => {
      // 1. Đăng ký thành công lần 1
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // 2. Đăng ký thất bại lần 2 (với cùng email)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return (
        request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(409) // Mong đợi 409 Conflict
          // SỬA 5: Cung cấp type cụ thể cho 'res'
          .then((res: { body: { message: string } }) => {
            expect(res.body.message).toEqual('Email này đã được sử dụng.');
          })
      );
    });
  });

  describe('/auth/verify-email (POST)', () => {
    it('should return 409 Conflict for incorrect verification code', async () => {
      // 1. Đăng ký user trước
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // 2. Thử verify với code sai
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return (
        request(app.getHttpServer())
          .post('/auth/verify-email')
          .send({
            email: registerDto.email,
            verificationCode: 'wrong-code',
          })
          .expect(409) // Mong đợi 409 Conflict
          // SỬA 6: Cung cấp type cụ thể cho 'res'
          .then((res: { body: { message: string } }) => {
            expect(res.body.message).toEqual(
              'Mã xác thực không hợp lệ hoặc đã hết hạn.',
            ); // SỬA 7: Thêm dấu ')' bị thiếu
          })
      );
    });

    it('should verify account successfully with correct code (Happy Path)', async () => {
      // 1. Đăng ký user
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // 2. Lấy code từ DB (Đây là cách E2E test hoạt động)
      const account = await accountRepository.findOneBy({
        email: registerDto.email,
      });
      expect(account).toBeDefined(); // SỬA 6: Thêm kiểm tra null
      const correctCode = account!.verification_code; // SỬA 7: Thêm '!' (non-null assertion)

      // 3. Verify với code đúng
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return (
        request(app.getHttpServer())
          .post('/auth/verify-email')
          .send({
            email: registerDto.email,
            verificationCode: correctCode,
          })
          .expect(200) // Mong đợi 200 OK
          // SỬA 8: Cung cấp type cụ thể cho 'res'
          .then((res: { body: { message: string } }) => {
            expect(res.body.message).toEqual(
              'Tài khoản của bạn đã được xác thực thành công.',
            );
          })
      );
    });
  });

  describe('/auth/login (POST)', () => {
    // Chúng ta cần một user đã được verify để test login
    beforeEach(async () => {
      // 1. Đăng ký user
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // 2. Lấy code và verify user đó ngay lập tức
      const account = await accountRepository.findOneBy({
        email: registerDto.email,
      });
      expect(account).toBeDefined(); // SỬA 9: Thêm kiểm tra null
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: registerDto.email,
          verificationCode: account!.verification_code, // SỬA 10: Thêm '!'
        })
        .expect(200);
    });

    it('should login successfully and return JWT token (Happy Path)', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return (
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto.email,
            password: registerDto.password,
          })
          .expect(201) // Mong đợi 201 Created (do hàm login của bạn trả về)
          // SỬA 9: Cung cấp type cụ thể cho 'res'
          .then((res: { body: { access_token: string } }) => {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body.access_token).toBeTruthy();
          })
      );
    });

    it('should return 401 Unauthorized for wrong password', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: 'wrong-password',
        })
        .expect(401); // Mong đợi 401 Unauthorized
    });

    it('should return 401 Unauthorized for non-existent user', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ghost@example.com',
          password: 'password',
        })
        .expect(401);
    });
  });
});
