import { Controller, Post, Body, Get, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @ApiOperation({ summary: "S'abonner à la newsletter" })
  @ApiBody({ type: SubscribeNewsletterDto })
  @ApiResponse({ status: 201, description: 'Abonnement réussi' })
  @ApiResponse({ status: 409, description: 'Email déjà abonné' })
  subscribe(@Body() subscribeDto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(subscribeDto);
  }

  @Delete('unsubscribe/:email')
  @ApiOperation({ summary: "Se désabonner de la newsletter" })
  @ApiResponse({ status: 200, description: 'Désabonnement réussi' })
  @ApiResponse({ status: 404, description: 'Email non trouvé' })
  unsubscribe(@Param('email') email: string) {
    return this.newsletterService.unsubscribe(email);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les abonnés (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des abonnés' })
  findAll() {
    return this.newsletterService.findAll();
  }
}
