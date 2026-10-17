import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GeniusPayService } from '../payments/providers/geniuspay/geniuspay.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { SettingsService } from '../settings/settings.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException } from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const mockPrismaService = {
    booking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
    },
    apartment: {
      findUnique: jest.fn(),
    },
  };

  const mockEmailService = {
    sendReservationConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    sendReservationConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  const mockGeniusPayService = {
    createPayment: jest.fn(),
    getPayment: jest.fn(),
  };

  const mockVehiclesService = {
    findOne: jest.fn(),
  };

  const mockApartmentsService = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        GENIUSPAY_API_KEY: 'pk_sandbox_test',
        GENIUSPAY_API_SECRET: 'sk_sandbox_test',
        WEB_APP_URL: 'http://localhost:3000',
        WEB_APP_DEFAULT_LOCALE: 'fr',
      };
      return config[key];
    }),
  };

  const mockSettingsService = {
    findByKey: jest.fn().mockResolvedValue(null),
  };

  const mockPromoCodesService = {
    validate: jest.fn().mockResolvedValue({ valid: false, reason: 'no code' }),
    incrementUsage: jest.fn().mockResolvedValue(undefined),
  };

  const mockInAppNotifications = {
    notifyNewReservation: jest.fn().mockResolvedValue(undefined),
    notifyReservationConfirmed: jest.fn().mockResolvedValue(undefined),
    notifyReservationCancelled: jest.fn().mockResolvedValue(undefined),
    notifyPaymentReceived: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: VehiclesService, useValue: mockVehiclesService },
        { provide: ApartmentsService, useValue: mockApartmentsService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: InAppNotificationsService, useValue: mockInAppNotifications },
        { provide: GeniusPayService, useValue: mockGeniusPayService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: PromoCodesService, useValue: mockPromoCodesService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a booking when found', async () => {
      const mockBooking = {
        id: 'booking-123',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-05'),
        totalPrice: 50000,
        status: 'CONFIRMED',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.findOne('booking-123');

      expect(result).toEqual(mockBooking);
      expect(mockPrismaService.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('computeInsurance (VehicleTypePricing only)', () => {
    it('applies discount then adds insurance from type grid', () => {
      const typePricing = {
        insuranceAmount: 20_000,
        insuranceDiscountPercent: 10,
      } as import('@prisma/client').VehicleTypePricing;

      const r = (service as any).computeInsurance(100_000, typePricing);
      expect(r.insuranceDiscount).toBe(10_000);
      expect(r.insurancePrice).toBe(20_000);
      expect(r.totalWithInsurance).toBe(110_000);
    });
  });

  describe('verifyPayment', () => {
    it('should confirm booking and send emails on successful payment', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: 'PENDING',
        paymentReference: 'MTX-123',
        userId: 'user-1',
      };

      const mockConfirmedBooking = {
        ...mockBooking,
        status: 'CONFIRMED',
        vehicle: { id: 'vehicle-1', title: 'Mercedes' },
        apartment: null,
        user: { id: 'user-1', email: 'test@example.com', firstName: 'John', lastName: 'Doe', phone: null },
      };

      mockPrismaService.booking.findUnique
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockConfirmedBooking);
      mockPrismaService.booking.updateMany.mockResolvedValue({ count: 1 });
      mockGeniusPayService.getPayment.mockResolvedValue({ status: 'success' });

      const result = await service.verifyPayment('booking-123');

      expect(result.status).toBe('success');
      expect(mockPrismaService.booking.updateMany).toHaveBeenCalledWith({
        where: { id: 'booking-123', status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      });
      expect(mockEmailService.sendReservationConfirmation).toHaveBeenCalledWith(
        mockConfirmedBooking,
        'test@example.com',
      );
    });

    it('should return early if booking already confirmed', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: 'CONFIRMED',
      };
      const mockFull = {
        ...mockBooking,
        vehicle: null,
        apartment: null,
        user: { id: 'user-1', email: 'test@example.com', firstName: 'John', lastName: 'Doe', phone: null },
      };

      mockPrismaService.booking.findUnique.mockResolvedValueOnce(mockBooking).mockResolvedValueOnce(mockFull);

      const result = await service.verifyPayment('booking-123');

      expect(result.status).toBe('success');
      expect(result.message).toBe('Paiement déjà confirmé');
      expect(mockGeniusPayService.getPayment).not.toHaveBeenCalled();
    });
  });
});
