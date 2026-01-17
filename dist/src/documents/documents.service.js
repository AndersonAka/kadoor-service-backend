"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
let DocumentsService = class DocumentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateInvoice(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                vehicle: true,
                apartment: true,
                user: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException(`Réservation avec l'ID ${bookingId} non trouvée`);
        }
        return this.createInvoicePDF(booking);
    }
    async generateContract(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                vehicle: true,
                apartment: true,
                user: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException(`Réservation avec l'ID ${bookingId} non trouvée`);
        }
        return this.createContractPDF(booking);
    }
    async generateReceipt(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                vehicle: true,
                apartment: true,
                user: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException(`Réservation avec l'ID ${bookingId} non trouvée`);
        }
        return this.createReceiptPDF(booking);
    }
    async createInvoicePDF(booking) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.fontSize(20).text('FACTURE', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`N° Facture: ${booking.id}`, { align: 'right' });
            doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}`, {
                align: 'right',
            });
            doc.moveDown();
            doc.fontSize(14).text('Informations Client', { underline: true });
            doc.fontSize(10);
            doc.text(`Nom: ${booking.user.firstName || ''} ${booking.user.lastName || ''}`);
            doc.text(`Email: ${booking.user.email}`);
            if (booking.user.phone) {
                doc.text(`Téléphone: ${booking.user.phone}`);
            }
            doc.moveDown();
            doc.fontSize(14).text('Détails de la Réservation', { underline: true });
            doc.fontSize(10);
            if (booking.vehicle) {
                doc.text(`Véhicule: ${booking.vehicle.title}`);
                doc.text(`Type: ${booking.vehicle.type}`);
                if (booking.vehicle.location) {
                    doc.text(`Localisation: ${booking.vehicle.location}`);
                }
            }
            else if (booking.apartment) {
                doc.text(`Appartement: ${booking.apartment.title}`);
                doc.text(`Adresse: ${booking.apartment.address}`);
                doc.text(`Ville: ${booking.apartment.city}`);
            }
            doc.moveDown();
            doc.text(`Période: ${new Date(booking.startDate).toLocaleDateString('fr-FR')} - ${new Date(booking.endDate).toLocaleDateString('fr-FR')}`);
            const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
                (1000 * 60 * 60 * 24));
            doc.text(`Durée: ${days} jour(s)`);
            doc.moveDown();
            doc.fontSize(14).text('Montant', { underline: true });
            doc.fontSize(10);
            if (booking.vehicle) {
                doc.text(`Prix par jour: ${booking.vehicle.pricePerDay.toFixed(2)} FCFA`);
                doc.text(`Nombre de jours: ${days}`);
            }
            else if (booking.apartment) {
                doc.text(`Prix par nuit: ${booking.apartment.pricePerNight.toFixed(2)} FCFA`);
                doc.text(`Nombre de nuits: ${days}`);
            }
            doc.moveDown();
            doc.fontSize(16).text(`Total: ${booking.totalPrice.toFixed(2)} FCFA`, {
                align: 'right',
            });
            doc.moveDown();
            doc.fontSize(10).text(`Statut: ${booking.status}`, { align: 'right' });
            doc.moveTo(50, doc.page.height - 50).lineTo(doc.page.width - 50, doc.page.height - 50).stroke();
            doc.fontSize(8).text('KADOOR SERVICE - Facture générée automatiquement', {
                align: 'center',
            });
            doc.end();
        });
    }
    async createContractPDF(booking) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.fontSize(20).text('CONTRAT DE LOCATION', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`N° Contrat: ${booking.id}`, { align: 'right' });
            doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}`, {
                align: 'right',
            });
            doc.moveDown();
            doc.fontSize(14).text('PARTIES', { underline: true });
            doc.fontSize(10);
            doc.text('LOUEUR: KADOOR SERVICE');
            doc.moveDown();
            doc.text('LOCATAIRE:');
            doc.text(`Nom: ${booking.user.firstName || ''} ${booking.user.lastName || ''}`);
            doc.text(`Email: ${booking.user.email}`);
            if (booking.user.phone) {
                doc.text(`Téléphone: ${booking.user.phone}`);
            }
            doc.moveDown();
            doc.fontSize(14).text('OBJET', { underline: true });
            doc.fontSize(10);
            if (booking.vehicle) {
                doc.text(`Location du véhicule: ${booking.vehicle.title}`);
                doc.text(`Type: ${booking.vehicle.type}`);
            }
            else if (booking.apartment) {
                doc.text(`Location de l'appartement: ${booking.apartment.title}`);
                doc.text(`Adresse: ${booking.apartment.address}, ${booking.apartment.city}`);
            }
            doc.moveDown();
            doc.fontSize(14).text('PÉRIODE', { underline: true });
            doc.fontSize(10);
            doc.text(`Du ${new Date(booking.startDate).toLocaleDateString('fr-FR')} au ${new Date(booking.endDate).toLocaleDateString('fr-FR')}`);
            doc.moveDown();
            doc.fontSize(14).text('MONTANT', { underline: true });
            doc.fontSize(10);
            doc.text(`Montant total: ${booking.totalPrice.toFixed(2)} FCFA`);
            doc.moveDown();
            doc.fontSize(14).text('CONDITIONS GÉNÉRALES', { underline: true });
            doc.fontSize(10);
            doc.text('1. Le locataire s\'engage à utiliser le bien loué conformément à sa destination.');
            doc.text('2. Le locataire est responsable des dommages causés au bien loué.');
            doc.text('3. Le paiement doit être effectué avant le début de la location.');
            doc.text('4. Toute annulation doit être effectuée selon les conditions prévues.');
            doc.moveDown();
            doc.moveDown();
            doc.text('Signature du locataire:', { underline: true });
            doc.moveDown(3);
            doc.text('_________________________');
            doc.moveDown();
            doc.text('Signature du loueur:', { underline: true });
            doc.moveDown(3);
            doc.text('_________________________');
            doc.end();
        });
    }
    async createReceiptPDF(booking) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.fontSize(20).text('REÇU DE PAIEMENT', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`N° Reçu: ${booking.id}`, { align: 'right' });
            doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}`, {
                align: 'right',
            });
            doc.moveDown();
            doc.fontSize(10);
            doc.text(`Reçu de: ${booking.user.firstName || ''} ${booking.user.lastName || ''}`);
            doc.text(`Email: ${booking.user.email}`);
            doc.moveDown();
            if (booking.vehicle) {
                doc.text(`Pour: Location véhicule - ${booking.vehicle.title}`);
            }
            else if (booking.apartment) {
                doc.text(`Pour: Location appartement - ${booking.apartment.title}`);
            }
            doc.moveDown();
            doc.fontSize(16).text(`Montant reçu: ${booking.totalPrice.toFixed(2)} FCFA`, {
                align: 'center',
            });
            doc.moveDown();
            doc.fontSize(10).text(`Statut: ${booking.status}`, { align: 'right' });
            doc.moveTo(50, doc.page.height - 50).lineTo(doc.page.width - 50, doc.page.height - 50).stroke();
            doc.fontSize(8).text('KADOOR SERVICE - Reçu généré automatiquement', {
                align: 'center',
            });
            doc.end();
        });
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map