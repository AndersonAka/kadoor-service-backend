import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PromoCodesService } from './promo-codes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PromoCodesService', () => {
  let service: PromoCodesService;

  const mockPrisma = {
    promoCode: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string) => (key === 'PROMO_VALIDITY_TIMEZONE' ? 'Africa/Abidjan' : undefined)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PromoCodesService>(PromoCodesService);
    jest.clearAllMocks();
  });

  describe('computeDiscount', () => {
    it('returns percent of amount, rounded', () => {
      const r = service.computeDiscount({ discountType: 'PERCENT', discountValue: 15 }, 10_000);
      expect(r).toBe(1500);
    });

    it('caps percent at 100', () => {
      const r = service.computeDiscount({ discountType: 'PERCENT', discountValue: 150 }, 10_000);
      expect(r).toBe(10_000);
    });

    it('returns fixed amount', () => {
      const r = service.computeDiscount({ discountType: 'FIXED', discountValue: 5000 }, 10_000);
      expect(r).toBe(5000);
    });

    it('caps fixed amount to total', () => {
      const r = service.computeDiscount({ discountType: 'FIXED', discountValue: 99_999 }, 10_000);
      expect(r).toBe(10_000);
    });
  });

  describe('validate', () => {
    it('returns invalid when code not found', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue(null);
      const r = await service.validate('NOPE', 10_000);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/introuvable/i);
    });

    it('returns invalid when not active', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: '1', code: 'X', isActive: false, discountType: 'PERCENT', discountValue: 10, appliesTo: 'ALL',
      });
      const r = await service.validate('X', 10_000);
      expect(r.valid).toBe(false);
    });

    it('returns invalid when expired', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: '1', code: 'X', isActive: true, validUntil: new Date('2020-01-01'),
        discountType: 'PERCENT', discountValue: 10, appliesTo: 'ALL', usedCount: 0,
      });
      const r = await service.validate('X', 10_000);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/expir/i);
    });

    it('returns invalid when below minAmount', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: '1', code: 'X', isActive: true, minAmount: 50_000,
        discountType: 'PERCENT', discountValue: 10, appliesTo: 'ALL', usedCount: 0,
      });
      const r = await service.validate('X', 10_000);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/minimum/i);
    });

    it('returns invalid when itemType mismatch', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: '1', code: 'X', isActive: true, appliesTo: 'VEHICLE',
        discountType: 'PERCENT', discountValue: 10, usedCount: 0,
      });
      const r = await service.validate('X', 10_000, 'APARTMENT');
      expect(r.valid).toBe(false);
    });

    it('returns valid with discount when applicable', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: '1', code: 'KAD20', isActive: true, appliesTo: 'ALL',
        discountType: 'PERCENT', discountValue: 20, usedCount: 0,
      });
      const r = await service.validate('kad20', 50_000, 'VEHICLE');
      expect(r.valid).toBe(true);
      expect(r.promo?.discount).toBe(10_000);
      expect(r.promo?.finalAmount).toBe(40_000);
    });

    it('validFrom: jour calendaire fuseau métier (évite « pas encore actif » le jour J en Europe)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-02T23:00:00.000Z')); // 03/05 01:00 à Paris (CEST)
      const parisConfig = {
        get: jest.fn((k: string) => (k === 'PROMO_VALIDITY_TIMEZONE' ? 'Europe/Paris' : undefined)),
      };
      const mod = await Test.createTestingModule({
        providers: [
          PromoCodesService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: ConfigService, useValue: parisConfig },
        ],
      }).compile();
      const svc = mod.get(PromoCodesService);
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: '1',
        code: 'X',
        isActive: true,
        validFrom: new Date('2026-05-03T00:00:00.000Z'),
        discountType: 'PERCENT',
        discountValue: 10,
        appliesTo: 'ALL',
        usedCount: 0,
      });
      const r = await svc.validate('X', 10_000);
      expect(r.valid).toBe(true);
      jest.useRealTimers();
    });
  });

  describe('generateCode', () => {
    it('generates an 8-character code without prefix', () => {
      const code = service.generateCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('prefixes when given', () => {
      const code = service.generateCode('kad');
      expect(code.startsWith('KAD-')).toBe(true);
    });
  });
});
