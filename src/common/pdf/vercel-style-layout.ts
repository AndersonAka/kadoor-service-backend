'use strict';

import type PDFDocument from 'pdfkit';

/** Coordonnées émetteur — Kadoor Service (Côte d'Ivoire). */
export const KADOOR_ISSUER = {
  name: 'Kadoor Service',
  handle: '@kadoorservice',
  lines: ['Abidjan, Côte d\'Ivoire', 'Côte d\'Ivoire'],
  email: 'contact@kadoorservice.com',
  phone: '+225 07 16 67 32 12',
  website: 'www.kadoorservice.com',
  helpUrl: 'https://www.kadoorservice.com/contact',
} as const;

export const PDF_COLORS = {
  text: '#0a0a0a',
  muted: '#666666',
  border: '#eaeaea',
  tableRule: '#ebebeb',
  brand: '#c21c21',
  brandSoft: '#fdecec',
  white: '#ffffff',
  payBtn: '#c21c21',
} as const;

type Doc = InstanceType<typeof PDFDocument>;

export function formatNumberFr(n: number): string {
  return Number(n || 0)
    .toLocaleString('fr-FR', { maximumFractionDigits: 0 })
    .replace(/[\u00A0\u202F]/g, ' ');
}

export function formatAmountFcfa(n: number): string {
  return `${formatNumberFr(n)} FCFA`;
}

/** Date longue FR, sans espaces insécables (Helvetica WinAnsi). */
export function formatDateFrLong(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date
    .toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace(/[\u00A0\u202F]/g, ' ');
}

export function formatDateFrShort(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date
    .toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/[\u00A0\u202F]/g, ' ');
}

/** Référence courte type Vercel (XXXX-XXXX). */
export function shortDocRef(id: string, prefix = ''): string {
  const clean = String(id || '').replace(/-/g, '').toUpperCase();
  const a = clean.slice(0, 4) || '0000';
  const b = clean.slice(4, 8) || '0000';
  return prefix ? `${prefix}${a}-${b}` : `${a}-${b}`;
}

export function pageMetrics(doc: Doc) {
  const margin = 40;
  return {
    margin,
    pageWidth: doc.page.width,
    pageHeight: doc.page.height,
    contentWidth: doc.page.width - margin * 2,
    left: margin,
    right: doc.page.width - margin,
  };
}

/** Bandeau noir fin en haut — signature visuelle type Vercel. */
export function drawTopBar(doc: Doc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, 4).fill('#000000');
  doc.restore();
}

export function drawDocumentTitle(doc: Doc, title: string, y = 34): number {
  const { left } = pageMetrics(doc);
  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor(PDF_COLORS.text)
    .text(title, left, y, { lineBreak: false });
  return y + 42;
}

export function drawMetaRows(
  doc: Doc,
  rows: Array<{ label: string; value: string }>,
  yStart: number,
): number {
  const { left } = pageMetrics(doc);
  const labelW = 130;
  let y = yStart;

  for (const row of rows) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_COLORS.muted)
      .text(row.label, left, y, { width: labelW, lineBreak: false });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_COLORS.text)
      .text(row.value, left + labelW, y, { lineBreak: false });
    y += 14;
  }
  return y + 18;
}

export interface BillToParty {
  name: string;
  lines?: string[];
  email?: string | null;
  phone?: string | null;
}

/**
 * Deux colonnes libres (sans cartes) : émetteur à gauche, « Facturé à » à droite.
 */
export function drawPartiesColumns(
  doc: Doc,
  billTo: BillToParty,
  yStart: number,
): number {
  const { left, contentWidth } = pageMetrics(doc);
  const colW = (contentWidth - 24) / 2;
  const rightX = left + colW + 24;

  // Émetteur
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(PDF_COLORS.text)
    .text(KADOOR_ISSUER.name, left, yStart, { width: colW, lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(PDF_COLORS.muted)
    .text(` ${KADOOR_ISSUER.handle}`, left + doc.widthOfString(KADOOR_ISSUER.name) + 2, yStart + 2, {
      lineBreak: false,
    });

  let leftY = yStart + 16;
  for (const line of KADOOR_ISSUER.lines) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_COLORS.text)
      .text(line, left, leftY, { width: colW });
    leftY += 13;
  }
  doc.text(KADOOR_ISSUER.email, left, leftY, { width: colW });
  leftY += 13;
  doc.text(KADOOR_ISSUER.phone, left, leftY, { width: colW });
  leftY += 13;

  // Facturé à
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(PDF_COLORS.muted)
    .text('Facturé à', rightX, yStart, { width: colW, lineBreak: false });

  let rightY = yStart + 16;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(PDF_COLORS.text)
    .text(billTo.name || 'Client', rightX, rightY, { width: colW });
  rightY += 15;

  for (const line of billTo.lines || []) {
    if (!line) continue;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_COLORS.text)
      .text(line, rightX, rightY, { width: colW });
    rightY += 13;
  }
  if (billTo.email) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_COLORS.text)
      .text(billTo.email, rightX, rightY, { width: colW });
    rightY += 13;
  }
  if (billTo.phone) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_COLORS.text)
      .text(billTo.phone, rightX, rightY, { width: colW });
    rightY += 13;
  }

  return Math.max(leftY, rightY) + 22;
}

/** Bannière montant due / payé (gros titre style Vercel). */
export function drawAmountBanner(doc: Doc, text: string, y: number): number {
  const { left, contentWidth } = pageMetrics(doc);
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(PDF_COLORS.text)
    .text(text, left, y, { width: contentWidth });
  return y + 28;
}

/** Bouton « Payer en ligne » (équivalent du CTA Vercel). */
export function drawPayOnlineButton(
  doc: Doc,
  label: string,
  url: string | null,
  y: number,
): number {
  const { left } = pageMetrics(doc);
  const padX = 14;
  const padY = 8;
  doc.font('Helvetica-Bold').fontSize(10);
  const textW = doc.widthOfString(label);
  const w = textW + padX * 2;
  const h = 28;

  doc.save();
  doc.roundedRect(left, y, w, h, 6).fill(PDF_COLORS.payBtn);
  doc
    .fillColor(PDF_COLORS.white)
    .text(label, left + padX, y + padY, { lineBreak: false });
  doc.restore();

  if (url) {
    doc.link(left, y, w, h, url);
  }
  return y + h + 18;
}

export interface LineItemRow {
  description: string;
  subtitle?: string;
  qty: string | number;
  unitPrice: string;
  amount: string;
}

export function drawItemsTable(
  doc: Doc,
  rows: LineItemRow[],
  yStart: number,
): number {
  const { left, contentWidth } = pageMetrics(doc);
  const colDesc = { x: left, w: contentWidth - 200 };
  const colQty = { x: left + colDesc.w, w: 40 };
  const colUnit = { x: colQty.x + colQty.w, w: 80 };
  const colAmt = { x: colUnit.x + colUnit.w, w: 80 };

  let y = yStart;

  // Header
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(PDF_COLORS.muted);
  doc.text('Description', colDesc.x, y);
  doc.text('Qté', colQty.x, y, { width: colQty.w, align: 'right' });
  doc.text('Prix unitaire', colUnit.x, y, { width: colUnit.w, align: 'right' });
  doc.text('Montant', colAmt.x, y, { width: colAmt.w, align: 'right' });
  y += 14;

  doc
    .save()
    .strokeColor(PDF_COLORS.border)
    .lineWidth(1)
    .moveTo(left, y)
    .lineTo(left + contentWidth, y)
    .stroke()
    .restore();
  y += 12;

  for (const row of rows) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_COLORS.text)
      .text(row.description, colDesc.x, y, { width: colDesc.w - 8 });
    const descH = doc.heightOfString(row.description, { width: colDesc.w - 8 });

    doc.text(String(row.qty), colQty.x, y, { width: colQty.w, align: 'right' });
    doc.text(row.unitPrice, colUnit.x, y, { width: colUnit.w, align: 'right' });
    doc.text(row.amount, colAmt.x, y, { width: colAmt.w, align: 'right' });

    let rowH = Math.max(16, descH);
    if (row.subtitle) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(PDF_COLORS.muted)
        .text(row.subtitle, colDesc.x, y + descH + 2, { width: colDesc.w - 8 });
      rowH = descH + 14;
    }
    y += rowH + 14;
  }

  return y + 4;
}

export function drawTotalsStack(
  doc: Doc,
  rows: Array<{ label: string; value: string; emphasize?: boolean }>,
  yStart: number,
): number {
  const { left, contentWidth } = pageMetrics(doc);
  const boxW = 260;
  const boxX = left + contentWidth - boxW;
  let y = yStart;

  // Trait au-dessus des totaux (demi-largeur droite, comme Vercel)
  doc
    .save()
    .strokeColor(PDF_COLORS.tableRule)
    .lineWidth(1)
    .moveTo(boxX, y)
    .lineTo(left + contentWidth, y)
    .stroke()
    .restore();
  y += 12;

  for (const row of rows) {
    doc
      .font(row.emphasize ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(row.emphasize ? 11 : 10)
      .fillColor(PDF_COLORS.text)
      .text(row.label, boxX, y, { width: boxW * 0.5 });
    doc
      .font(row.emphasize ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(row.emphasize ? 11 : 10)
      .fillColor(PDF_COLORS.text)
      .text(row.value, boxX + boxW * 0.45, y, {
        width: boxW * 0.55,
        align: 'right',
      });
    y += row.emphasize ? 18 : 16;

    doc
      .save()
      .strokeColor(PDF_COLORS.tableRule)
      .lineWidth(0.8)
      .moveTo(boxX, y - 4)
      .lineTo(left + contentWidth, y - 4)
      .stroke()
      .restore();
  }

  return y + 10;
}

export interface PaymentHistoryRow {
  method: string;
  date: string;
  amount: string;
  receiptNumber: string;
}

export function drawPaymentHistory(
  doc: Doc,
  rows: PaymentHistoryRow[],
  yStart: number,
): number {
  const { left, contentWidth } = pageMetrics(doc);
  let y = yStart;

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(PDF_COLORS.text)
    .text('Historique des paiements', left, y);
  y += 22;

  const cols = [
    { label: 'Mode de paiement', x: left, w: contentWidth * 0.32 },
    { label: 'Date', x: left + contentWidth * 0.32, w: contentWidth * 0.22 },
    { label: 'Montant payé', x: left + contentWidth * 0.54, w: contentWidth * 0.22 },
    { label: 'N° de reçu', x: left + contentWidth * 0.76, w: contentWidth * 0.24 },
  ];

  doc.font('Helvetica').fontSize(9).fillColor(PDF_COLORS.muted);
  for (const c of cols) {
    doc.text(c.label, c.x, y, { width: c.w });
  }
  y += 12;
  doc
    .save()
    .strokeColor(PDF_COLORS.border)
    .lineWidth(1)
    .moveTo(left, y)
    .lineTo(left + contentWidth, y)
    .stroke()
    .restore();
  y += 10;

  for (const row of rows) {
    const values = [row.method, row.date, row.amount, row.receiptNumber];
    doc.font('Helvetica').fontSize(10).fillColor(PDF_COLORS.text);
    cols.forEach((c, i) => {
      doc.text(values[i], c.x, y, { width: c.w });
    });
    y += 18;
  }

  return y + 12;
}

export function drawHelpFooter(doc: Doc, pageLabel: string) {
  const { left, contentWidth, pageHeight, margin } = pageMetrics(doc);
  const y = pageHeight - margin - 28;

  doc
    .save()
    .strokeColor(PDF_COLORS.border)
    .lineWidth(1)
    .moveTo(left, y)
    .lineTo(left + contentWidth, y)
    .stroke()
    .restore();

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(PDF_COLORS.muted)
    .text(
      `Pour en savoir plus ou discuter de votre facture, consultez ${KADOOR_ISSUER.helpUrl}`,
      left,
      y + 8,
      { width: contentWidth * 0.72, lineBreak: false },
    );
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(PDF_COLORS.muted)
    .text(pageLabel, left + contentWidth * 0.72, y + 8, {
      width: contentWidth * 0.28,
      align: 'right',
      lineBreak: false,
    });
}

/** Pied de page numéroté sur toutes les pages (bufferPages: true). */
export function stampFootersOnAllPages(doc: Doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    drawHelpFooter(doc, `Page ${i + 1} sur ${range.count}`);
  }
}
