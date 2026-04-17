import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaystackService } from './paystack.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
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
    sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
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

  describe('verifyPayment', () => {
    it('should confirm booking and send emails on successful payment', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: 'PENDING',
        paystackReference: 'ref-123',
        user: { id: 'user-1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
      };

      const mockConfirmedBooking = {
        ...mockBooking,
        status: 'CONFIRMED',
        vehicle: { id: 'vehicle-1', title: 'Mercedes' },
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockConfirmedBooking);
      mockPaystackService.verifyTransaction.mockResolvedValue({ status: 'success' });

      const result = await service.verifyPayment('booking-123');

      expect(result.status).toBe('success');
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        data: { status: 'CONFIRMED' },
        include: expect.any(Object),
      });
      expect(mockEmailService.sendReservationConfirmation).toHaveBeenCalledWith(
        mockConfirmedBooking,
        'test@example.com',
      );
      expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(
        mockConfirmedBooking,
        'test@example.com',
      );
    });

    it('should return early if booking already confirmed', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: 'CONFIRMED',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.verifyPayment('booking-123');

      expect(result.status).toBe('success');
      expect(result.message).toBe('Paiement déjà confirmé');
      expect(mockPaystackService.verifyTransaction).not.toHaveBeenCalled();
    });
  });
});
