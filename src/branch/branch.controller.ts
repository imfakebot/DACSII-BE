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
import { Branch } from './entities/branch.entity';
import { User } from '@/auth/decorator/users.decorator';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Account } from '@/user/entities/account.entity';

@ApiTags('Branches (Chi nhánh)')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Tạo chi nhánh mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo chi nhánh thành công.',
    type: Branch,
  })
  create(
    @Body() createBranchDto: CreateBranchDto,
    @User() creator: Account,
  ) {
    return this.branchService.create(createBranchDto, creator);
  }

  @Get()
  @ApiOperation({ summary: '(Public) Lấy danh sách tất cả chi nhánh' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chi nhánh.',
    type: [Branch],
  })
  findAll() {
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
    type: [UserProfile],
  })
  findAvailableManagers() {
    return this.branchService.findAvailableManagers();
  }

  @Get(':id')
  @ApiOperation({ summary: '(Public) Lấy thông tin chi tiết một chi nhánh' })
  @ApiResponse({ status: 200, description: 'Chi tiết chi nhánh.', type: Branch })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
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
    type: Branch,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    return this.branchService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '(Admin) Xóa một chi nhánh' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.remove(id);
  }
}
