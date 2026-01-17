"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateApartmentDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_apartment_dto_1 = require("./create-apartment.dto");
class UpdateApartmentDto extends (0, mapped_types_1.PartialType)(create_apartment_dto_1.CreateApartmentDto) {
}
exports.UpdateApartmentDto = UpdateApartmentDto;
//# sourceMappingURL=update-apartment.dto.js.map