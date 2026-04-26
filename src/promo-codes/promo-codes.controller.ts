import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { GeneratePromoCodeDto } from './dto/generate-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly service: PromoCodesService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider un code promo (public, pour le formulaire)' })
  validate(@Body() dto: ValidatePromoCodeDto) {
    return this.service.validate(dto.code, dto.amount, dto.itemType);
  }

  // ─── Admin ─────────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un code promo (admin)' })
  create(@Body() dto: CreatePromoCodeDto) {
    return this.service.create(dto);
  }

  @Post('generate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer un code promo aléatoire (admin)' })
  generate(@Body() dto: GeneratePromoCodeDto) {
    const trimmed = dto.code?.trim();
    const code = trimmed ? trimmed : this.service.generateCode(dto.prefix);
    return this.service.create({
      code,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue ?? 10,
      minAmount: dto.minAmount,
      maxUses: dto.maxUses,
      validFrom: dto.validFrom,
      validUntil: dto.validUntil,
      isActive: dto.isActive,
      appliesTo: dto.appliesTo,
    });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les codes promo (admin)' })
  findAll(@Query('active') active?: string) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.service.findAll({ isActive });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'un code promo (admin)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un code promo (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdatePromoCodeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un code promo (admin)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
