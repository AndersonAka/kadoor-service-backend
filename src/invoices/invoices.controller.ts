import { Body, Controller, Get, Param, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  findMine(@Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.invoicesService.findMine(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/:id')
  findMineOne(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.invoicesService.findMineOne(userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/:id/pdf')
  async getMinePdf(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    const userId = req.user?.id || req.user?.userId;
    await this.invoicesService.findMineOne(userId, id);
    const pdf = await this.invoicesService.generateInvoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.send(pdf);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/initiate-payment')
  initiatePayment(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    const userEmail = req.user?.email;
    return this.invoicesService.initiatePayment(userId, userEmail, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-payment/:id')
  verifyPayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body?: { reference?: string },
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.invoicesService.verifyPayment(userId, id, body?.reference);
  }
}
