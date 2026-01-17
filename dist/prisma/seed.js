"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
require("dotenv/config");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
}
const pool = new pg_1.Pool({ connectionString: databaseUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Cleaning up existing data...');
    await prisma.booking.deleteMany();
    await prisma.review.deleteMany();
    await prisma.user.deleteMany();
    await prisma.heroSlide.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.apartment.deleteMany();
    console.log('Seeding Admin User...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@kadoorservice.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'KADOOR',
            role: client_1.Role.ADMIN,
        },
    });
    console.log(`Admin user created: ${adminUser.email} (password: admin123)`);
    console.log('Seeding HeroSlides...');
    const slides = [
        {
            titleFr: "Louez votre véhicule idéal",
            titleEn: "Rent your ideal vehicle",
            subtitleFr: "Une large gamme de voitures pour tous vos besoins.",
            subtitleEn: "A wide range of cars for all your needs.",
            imageUrl: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1920",
            buttonText: "Voir les véhicules",
            buttonLink: "/vehicles",
            order: 1,
            isActive: true,
        },
        {
            titleFr: "Trouvez l'appartement de vos rêves",
            titleEn: "Find your dream apartment",
            subtitleFr: "Des appartements confortables à Abidjan, Paris et Montréal.",
            subtitleEn: "Comfortable apartments in Abidjan, Paris and Montreal.",
            imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920",
            buttonText: "Voir les appartements",
            buttonLink: "/apartments",
            order: 2,
            isActive: true,
        },
        {
            titleFr: "Offrez des moments inoubliables",
            titleEn: "Offer unforgettable moments",
            subtitleFr: "Découvrez nos chèques cadeaux personnalisés.",
            subtitleEn: "Discover our personalized gift vouchers.",
            imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1920",
            buttonText: "Nos chèques cadeaux",
            buttonLink: "/gifts",
            order: 3,
            isActive: true,
        },
    ];
    for (const slide of slides) {
        await prisma.heroSlide.create({ data: slide });
    }
    console.log('Seeding Vehicles...');
    const vehicles = [
        {
            title: "Toyota Land Cruiser Prado",
            description: "Véhicule tout-terrain de luxe, idéal pour les longs trajets et le confort urbain.",
            type: "SUV",
            make: "Toyota",
            model: "Land Cruiser Prado",
            year: 2022,
            fuel: "Diesel",
            transmission: "Automatique",
            seats: 7,
            location: "Douala, Littoral",
            pricePerDay: 75000,
            images: ["https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800"],
            features: ["Climatisation", "GPS", "Cuir", "4x4"],
        },
        {
            title: "Mercedes-Benz Classe C",
            description: "Berline élégante alliant performance et raffinement.",
            type: "Berline",
            make: "Mercedes-Benz",
            model: "Classe C",
            year: 2021,
            fuel: "Essence",
            transmission: "Automatique",
            seats: 5,
            location: "Yaoundé, Centre",
            pricePerDay: 60000,
            images: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"],
            features: ["Climatisation", "Bluetooth", "Toit ouvrant"],
        },
        {
            title: "Ford Ranger Wildtrak",
            description: "Pick-up puissant et polyvalent pour tous vos besoins logistiques.",
            type: "Pick-up",
            make: "Ford",
            model: "Ranger Wildtrak",
            year: 2023,
            fuel: "Diesel",
            transmission: "Automatique",
            seats: 5,
            location: "Douala, Littoral",
            pricePerDay: 50000,
            images: ["https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800"],
            features: ["4x4", "Crochet de remorquage", "Régulateur de vitesse"],
        },
    ];
    for (const vehicle of vehicles) {
        await prisma.vehicle.create({ data: vehicle });
    }
    console.log('Seeding Apartments...');
    const apartments = [
        {
            title: "Appartement de Luxe - Plateau",
            description: "Superbe appartement avec vue sur la lagune, entièrement équipé.",
            address: "Rue du Commerce",
            city: "Abidjan",
            pricePerNight: 120000,
            bedrooms: 3,
            bathrooms: 2,
            area: 120,
            images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
            features: ["WIFI", "Piscine", "Sécurité 24/7", "Parking"],
        },
        {
            title: "Studio Moderne - Cocody Angré",
            description: "Studio cosy et fonctionnel dans un quartier calme.",
            address: "Cité des Arts",
            city: "Abidjan",
            pricePerNight: 45000,
            bedrooms: 1,
            bathrooms: 1,
            area: 45,
            images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"],
            features: ["Climatisation", "Cuisine équipée", "WIFI"],
        },
        {
            title: "Penthouse - Riviera Golf",
            description: "Haut standing, terrasse panoramique, finitions exceptionnelles.",
            address: "Boulevard de France",
            city: "Abidjan",
            pricePerNight: 250000,
            bedrooms: 4,
            bathrooms: 4,
            area: 300,
            images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"],
            features: ["Vue Panoramique", "Domotique", "Gym", "Jacuzzi"],
        },
    ];
    for (const apartment of apartments) {
        await prisma.apartment.create({ data: apartment });
    }
    console.log('Seed completed successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map