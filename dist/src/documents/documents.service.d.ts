import { PrismaService } from '../prisma/prisma.service';
export declare class DocumentsService {
    private prisma;
    constructor(prisma: PrismaService);
    generateInvoice(bookingId: string): Promise<Buffer>;
    generateContract(bookingId: string): Promise<Buffer>;
    generateReceipt(bookingId: string): Promise<Buffer>;
    private createInvoicePDF;
    private createContractPDF;
    private createReceiptPDF;
}
