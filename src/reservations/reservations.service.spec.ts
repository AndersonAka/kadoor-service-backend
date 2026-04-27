import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaystackService } from './paystack.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { SettingsService } from '../settings/settings.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { NotFoundException } from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prismaService: PrismaService;
  let emailService: EmailService;

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

  const mockPaystackService = {
    initializeTransaction: jest.fn(),
    verifyTransaction: jest.fn(),
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
        'PAYSTACK_SECRET_KEY': 'test-key',
        'FRONTEND_URL': 'http://localhost:3000',
      };
      return config[key];
    }),
  };

  const mockSettingsService = {
    findByKey: jest.fn().mockResolvedValue(null), // retourne null → valeurs par défaut utilisées
  };

  const mockPromoCodesService = {
    validate: jest.fn().mockResolvedValue({ valid: false, reason: 'no code' }),
    incrementUsage: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: VehiclesService,
          useValue: mockVehiclesService,
        },
        {
          provide: ApartmentsService,
          useValue: mockApartmentsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PaystackService,
          useValue: mockPaystackService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: PromoCodesService,
          useValue: mockPromoCodesService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    // Reset all mocks before each test
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
        paystackReference: 'ref-123',
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
      mockPaystackService.verifyTransaction.mockResolvedValue({ status: 'success' });

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
      expect(mockPaystackService.verifyTransaction).not.toHaveBeenCalled();
    });
  });
});
