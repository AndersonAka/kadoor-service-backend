import { DocumentsService } from './documents.service';
import type { Response } from 'express';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    getInvoice(bookingId: string, res: Response): Promise<void>;
    getContract(bookingId: string, res: Response): Promise<void>;
    getReceipt(bookingId: string, res: Response): Promise<void>;
}
