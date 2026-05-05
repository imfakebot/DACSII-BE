import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Role } from '@/auth/enums/role.enum';
import { User } from '@/auth/decorator/users.decorator';
import { Account } from '@/user/entities/account.entity';
import { BranchResponseDto } from './dto/branch-response.dto';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import { MessageResponseDto } from '@/common/dto/message-response.dto';

@ApiTags('Branches (Chi nhánh)')
@Controller('branches')
export class BranchController {
  private readonly logger = new Logger(BranchController.name);
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Tạo chi nhánh mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo chi nhánh thành công.',
    type: BranchResponseDto,
  })
  create(@Body() createBranchDto: CreateBranchDto, @User() creator: Account): Promise<BranchResponseDto> {
    this.logger.log(
      `Admin ${creator.id} creating branch with DTO: ${JSON.stringify(
        createBranchDto,
      )}`,
    );
    return this.branchService.create(createBranchDto, creator);
  }

  @Get()
  @ApiOperation({ summary: '(Public) Lấy danh sách tất cả chi nhánh' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chi nhánh.',
    type: [BranchResponseDto],
  })
  findAll(): Promise<BranchResponseDto[]> {
    this.logger.log('Fetching all branches');
    return this.branchService.findAll();
  }

  @Get('available-managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '(Admin) Lấy danh sách các quản lý chưa được gán chi nhánh',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các quản lý khả dụng.',
    type: [UserProfileResponseDto],
  })
  findAvailableManagers(): Promise<UserProfileResponseDto[]> {
    this.logger.log('Fetching available managers');
    return this.branchService.findAvailableManagers();
  }

  @Get(':id')
  @ApiOperation({ summary: '(Public) Lấy thông tin chi tiết một chi nhánh' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết chi nhánh.',
    type: BranchResponseDto,
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BranchResponseDto> {
    this.logger.log(`Fetching branch with id ${id}`);
    return this.branchService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Cập nhật thông tin chi nhánh' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công.',
    type: BranchResponseDto,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ): Promise<BranchResponseDto> {
    this.logger.log(
      `Updating branch ${id} with DTO: ${JSON.stringify(updateBranchDto)}`,
    );
    return this.branchService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '(Admin) Xóa một chi nhánh' })
  @ApiResponse({ status: 200, type: MessageResponseDto, description: 'Xóa thành công.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<MessageResponseDto> {
    this.logger.log(`Deleting branch ${id}`);
    return this.branchService.remove(id);
  }
}
