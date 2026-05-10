import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryAdminInvoicesDto } from './dto/query-admin-invoices.dto';

@Controller('admin/invoices')
@UseGuards(AuthGuard('jwt'))
export class AdminInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query() query: QueryAdminInvoicesDto) {
    return this.invoicesService.findAllAdmin(query.status);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @Request() req: any) {
    const adminId = req.user?.id || req.user?.userId;
    return this.invoicesService.create(adminId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOneAdmin(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.updateDraft(id, dto);
  }

  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.invoicesService.send(id);
  }

  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string) {
    return this.invoicesService.markPaid(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.invoicesService.cancel(id);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.invoicesService.generateInvoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.send(pdf);
  }
}
