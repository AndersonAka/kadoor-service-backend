import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import type { Response } from 'express';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('invoice/:bookingId')
  @ApiOperation({ summary: 'Générer une facture PDF pour une réservation' })
  @ApiParam({ name: 'bookingId', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Facture PDF générée avec succès', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  async getInvoice(@Param('bookingId') bookingId: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.documentsService.generateInvoice(bookingId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facture-${bookingId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
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
  async getContract(@Param('bookingId') bookingId: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.documentsService.generateContract(bookingId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contrat-${bookingId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
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
  async getReceipt(@Param('bookingId') bookingId: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.documentsService.generateReceipt(bookingId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="recu-${bookingId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Erreur lors de la génération du reçu');
    }
  }
}
