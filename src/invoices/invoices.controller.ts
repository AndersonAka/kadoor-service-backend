import { Body, Controller, Get, Headers, Param, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request as ExpressRequest, Response } from 'express';
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
  verifyPayment(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.invoicesService.verifyPayment(userId, id);
  }

  @Post('paystack/webhook')
  handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: ExpressRequest & { rawBody?: Buffer },
    @Body() body: any,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    return this.invoicesService.handleWebhook(signature, rawBody, body);
  }
}
