import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminVehiclesController } from './admin-vehicles.controller';
import { AdminApartmentsController } from './admin-apartments.controller';
import { AdminReservationsController } from './admin-reservations.controller';
import { AdminClientsController } from './admin-clients.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ApartmentsModule } from '../apartments/apartments.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    VehiclesModule,
    ApartmentsModule,
    ReservationsModule,
    UsersModule,
  ],
  providers: [AdminService, AdminUsersService],
  controllers: [
    AdminController,
    AdminVehiclesController,
    AdminApartmentsController,
    AdminReservationsController,
    AdminClientsController,
    AdminUsersController,
  ],
  exports: [AdminService, AdminUsersService],
})
export class AdminModule {}
