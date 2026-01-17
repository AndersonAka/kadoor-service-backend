"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateHeroDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_hero_dto_1 = require("./create-hero.dto");
class UpdateHeroDto extends (0, mapped_types_1.PartialType)(create_hero_dto_1.CreateHeroDto) {
}
exports.UpdateHeroDto = UpdateHeroDto;
//# sourceMappingURL=update-hero.dto.js.map