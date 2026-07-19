import { Controller, Get, Param, Res, Request, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('invoice/:bookingId')
  @ApiOperation({ summary: 'Générer une facture PDF pour une réservation' })
  @ApiParam({ name: 'bookingId', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Facture PDF générée avec succès', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  async getInvoice(@Param('bookingId') bookingId: string, @Request() req: any, @Res() res: Response) {
    try {
      const pdfBuffer = await this.documentsService.generateInvoice(bookingId, req.user.id, req.user.role);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facture-${bookingId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new NotFoundException('Erreur lors de la génération de la facture');
    }
  }

  @Get('contract/:bookingId')
  @ApiOperation({ summary: 'Générer un contrat PDF pour une réservation' })
  @ApiParam({ name: 'bookingId', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Contrat PDF généré avec succès', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  async getContract(@Param('bookingId') bookingId: string, @Request() req: any, @Res() res: Response) {
    try {
      const pdfBuffer = await this.documentsService.generateContract(bookingId, req.user.id, req.user.role);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contrat-${bookingId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new NotFoundException('Erreur lors de la génération du contrat');
    }
  }

  @Get('receipt/:bookingId')
  @ApiOperation({ summary: 'Générer un reçu PDF pour une réservation' })
  @ApiParam({ name: 'bookingId', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Reçu PDF généré avec succès', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  async getReceipt(@Param('bookingId') bookingId: string, @Request() req: any, @Res() res: Response) {
    try {
      const pdfBuffer = await this.documentsService.generateReceipt(bookingId, req.user.id, req.user.role);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="recu-${bookingId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new NotFoundException('Erreur lors de la génération du reçu');
    }
  }
}
