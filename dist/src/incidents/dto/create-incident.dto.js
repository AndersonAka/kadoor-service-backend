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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateIncidentDto = exports.IncidentType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var IncidentType;
(function (IncidentType) {
    IncidentType["ACCIDENT"] = "ACCIDENT";
    IncidentType["PANNE"] = "PANNE";
    IncidentType["SINISTRE"] = "SINISTRE";
    IncidentType["VOL"] = "VOL";
    IncidentType["DOMMAGE"] = "DOMMAGE";
    IncidentType["AUTRES"] = "AUTRES";
})(IncidentType || (exports.IncidentType = IncidentType = {}));
class CreateIncidentDto {
    type;
    title;
    description;
    location;
    date;
    firstName;
    lastName;
    email;
    phone;
    vehicleId;
    apartmentId;
    images;
}
exports.CreateIncidentDto = CreateIncidentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: IncidentType, description: 'Type d\'incident' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(IncidentType),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Titre de l\'incident' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Description détaillée de l\'incident' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Lieu de l\'incident', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de l\'incident (ISO string)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Prénom' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nom' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Numéro de téléphone', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID du véhicule concerné', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de l\'appartement concerné', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIncidentDto.prototype, "apartmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'URLs des images', required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateIncidentDto.prototype, "images", void 0);
//# sourceMappingURL=create-incident.dto.js.map