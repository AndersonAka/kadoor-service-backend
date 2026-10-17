import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', '..', 'docs', 'exemplaire facture et contrat');

function formatAmountFcfa(n) {
  return (
    Number(n || 0)
      .toLocaleString('fr-FR', { maximumFractionDigits: 0 })
      .replace(/[\u00A0\u202F]/g, ' ') + ' FCFA'
  );
}

function makeDoc(title, outfile, kind) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(path.join(outDir, outfile));
    doc.pipe(stream);
    const left = 40;
    const contentWidth = 612 - 80;
    doc.rect(0, 0, 612, 4).fill('#000');
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#0a0a0a').text(title, left, 34);
    let y = 76;
    const meta =
      kind === 'invoice'
        ? [
            ['N° de facture', 'KS-82A5-0023'],
            ["Date d'émission", '14 septembre 2026'],
            ["Date d'échéance", '20 septembre 2026'],
          ]
        : [
            ['N° de facture', 'KS-82A5-0023'],
            ['N° de reçu', 'R-2389-3651'],
            ['Date de paiement', '29 septembre 2026'],
          ];
    for (const [l, v] of meta) {
      doc.font('Helvetica').fontSize(10).fillColor('#666').text(l, left, y, {
        width: 130,
        lineBreak: false,
      });
      doc.fillColor('#0a0a0a').text(v, left + 130, y, { lineBreak: false });
      y += 14;
    }
    y += 18;
    doc.font('Helvetica-Bold').fontSize(11).text('Kadoor Service', left, y);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#666')
      .text(' @kadoorservice', left + 95, y + 2, { lineBreak: false });
    let ly = y + 16;
    for (const line of [
      "Abidjan, Côte d'Ivoire",
      "Côte d'Ivoire",
      'contact@kadoorservice.com',
      '+225 07 16 67 32 12',
    ]) {
      doc.font('Helvetica').fontSize(10).fillColor('#0a0a0a').text(line, left, ly);
      ly += 13;
    }
    const rx = left + (contentWidth - 24) / 2 + 24;
    doc.font('Helvetica').fontSize(10).fillColor('#666').text('Facturé à', rx, y);
    let ry = y + 16;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0a0a0a').text('Jean Dupont', rx, ry);
    ry += 15;
    for (const line of ['Cocody, Abidjan', "Côte d'Ivoire", 'jean.dupont@email.com']) {
      doc.font('Helvetica').fontSize(10).text(line, rx, ry);
      ry += 13;
    }
    y = Math.max(ly, ry) + 22;
    const banner =
      kind === 'invoice'
        ? `${formatAmountFcfa(185000)} à payer le 20 septembre 2026`
        : `${formatAmountFcfa(185000)} payé le 29 septembre 2026`;
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#0a0a0a')
      .text(banner, left, y, { width: contentWidth });
    y += 28;
    if (kind === 'invoice') {
      doc.roundedRect(left, y, 110, 28, 6).fill('#c21c21');
      doc
        .fillColor('#fff')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Payer en ligne', left + 14, y + 8, { lineBreak: false });
      y += 46;
    } else {
      y += 8;
    }
    const colDesc = { x: left, w: contentWidth - 200 };
    const colQty = { x: left + contentWidth - 200, w: 40 };
    const colUnit = { x: left + contentWidth - 160, w: 80 };
    const colAmt = { x: left + contentWidth - 80, w: 80 };
    doc.font('Helvetica').fontSize(9).fillColor('#666');
    doc.text('Description', colDesc.x, y);
    doc.text('Qté', colQty.x, y, { width: 40, align: 'right' });
    doc.text('Prix unitaire', colUnit.x, y, { width: 80, align: 'right' });
    doc.text('Montant', colAmt.x, y, { width: 80, align: 'right' });
    y += 14;
    doc.moveTo(left, y).lineTo(left + contentWidth, y).strokeColor('#eaeaea').stroke();
    y += 12;
    doc.font('Helvetica').fontSize(10).fillColor('#0a0a0a');
    doc.text('Location véhicule — Toyota RAV4', colDesc.x, y, { width: colDesc.w - 8 });
    doc.text('3', colQty.x, y, { width: 40, align: 'right' });
    doc.text(formatAmountFcfa(55000), colUnit.x, y, { width: 80, align: 'right' });
    doc.text(formatAmountFcfa(165000), colAmt.x, y, { width: 80, align: 'right' });
    y += 14;
    doc
      .fontSize(9)
      .fillColor('#666')
      .text('14 sept. 2026 – 17 sept. 2026', colDesc.x, y);
    y += 24;
    doc
      .fontSize(10)
      .fillColor('#0a0a0a')
      .text('Assurance complémentaire', colDesc.x, y, { width: colDesc.w - 8 });
    doc.text('1', colQty.x, y, { width: 40, align: 'right' });
    doc.text(formatAmountFcfa(20000), colUnit.x, y, { width: 80, align: 'right' });
    doc.text(formatAmountFcfa(20000), colAmt.x, y, { width: 80, align: 'right' });
    y += 30;
    const boxW = 260;
    const boxX = left + contentWidth - boxW;
    doc.moveTo(boxX, y).lineTo(left + contentWidth, y).strokeColor('#ebebeb').stroke();
    y += 12;
    const totalRows = [
      ['Sous-total', formatAmountFcfa(185000), false],
      ['Total', formatAmountFcfa(185000), true],
      [kind === 'invoice' ? 'Montant dû' : 'Montant payé', formatAmountFcfa(185000), true],
    ];
    for (const [lab, val, bold] of totalRows) {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 11 : 10)
        .fillColor('#0a0a0a')
        .text(lab, boxX, y, { width: boxW * 0.5 });
      doc.text(val, boxX + boxW * 0.45, y, { width: boxW * 0.55, align: 'right' });
      y += bold ? 18 : 16;
      doc.moveTo(boxX, y - 4).lineTo(left + contentWidth, y - 4).stroke();
    }
    if (kind === 'receipt') {
      y += 16;
      doc.font('Helvetica-Bold').fontSize(12).text('Historique des paiements', left, y);
      y += 22;
      doc.font('Helvetica').fontSize(9).fillColor('#666');
      const headers = ['Mode de paiement', 'Date', 'Montant payé', 'N° de reçu'];
      const xs = [
        left,
        left + contentWidth * 0.32,
        left + contentWidth * 0.54,
        left + contentWidth * 0.76,
      ];
      const ws = [
        contentWidth * 0.32,
        contentWidth * 0.22,
        contentWidth * 0.22,
        contentWidth * 0.24,
      ];
      headers.forEach((t, i) => doc.text(t, xs[i], y, { width: ws[i] }));
      y += 12;
      doc.moveTo(left, y).lineTo(left + contentWidth, y).strokeColor('#eaeaea').stroke();
      y += 10;
      doc.fontSize(10).fillColor('#0a0a0a');
      const vals = [
        'GeniusPay — MTX-2389',
        '29 septembre 2026',
        formatAmountFcfa(185000),
        'R-2389-3651',
      ];
      vals.forEach((t, i) => doc.text(t, xs[i], y, { width: ws[i] }));
    }
    const fy = 792 - 40 - 28;
    doc.moveTo(left, fy).lineTo(left + contentWidth, fy).strokeColor('#eaeaea').stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#666')
      .text(
        'Pour en savoir plus ou discuter de votre facture, consultez https://www.kadoorservice.com/contact',
        left,
        fy + 8,
        { width: contentWidth * 0.72, lineBreak: false },
      );
    doc.text('Page 1 sur 1', left + contentWidth * 0.72, fy + 8, {
      width: contentWidth * 0.28,
      align: 'right',
      lineBreak: false,
    });
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

await makeDoc('Facture', 'Facture-Kadoor-exemple.pdf', 'invoice');
await makeDoc('Reçu', 'Recu-Kadoor-exemple.pdf', 'receipt');
console.log(
  'OK',
  fs.readdirSync(outDir).filter((f) => f.includes('Kadoor')),
);
