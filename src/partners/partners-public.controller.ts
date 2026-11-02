import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PartnersService } from './partners.service';
import { ApplyPartnerDto } from './dto/apply-partner.dto';

@ApiTags('partners')
@Controller('partners')
export class PartnersPublicController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post('apply')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Inscription publique « Devenir partenaire » (sans mot de passe)' })
  apply(@Body() dto: ApplyPartnerDto) {
    return this.partnersService.apply(dto);
  }
}
