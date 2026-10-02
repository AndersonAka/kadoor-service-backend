import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les utilisateurs staff (Admin / Manager / Commercial)' })
  list() {
    return this.adminUsersService.listStaff();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un utilisateur staff' })
  getOne(@Param('id') id: string) {
    return this.adminUsersService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un compte Admin ou Commercial' })
  create(@Body() dto: CreateStaffUserDto, @Request() req: any) {
    return this.adminUsersService.create(dto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un compte staff' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffUserDto,
    @Request() req: any,
  ) {
    return this.adminUsersService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un compte staff' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.adminUsersService.remove(id, req.user.id);
  }
}
