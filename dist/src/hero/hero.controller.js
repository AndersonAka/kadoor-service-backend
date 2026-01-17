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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroController = void 0;
const common_1 = require("@nestjs/common");
const hero_service_1 = require("./hero.service");
const create_hero_dto_1 = require("./dto/create-hero.dto");
const update_hero_dto_1 = require("./dto/update-hero.dto");
let HeroController = class HeroController {
    heroService;
    constructor(heroService) {
        this.heroService = heroService;
    }
    create(createHeroDto) {
        return this.heroService.create(createHeroDto);
    }
    findAll() {
        return this.heroService.findAll();
    }
    findOne(id) {
        return this.heroService.findOne(+id);
    }
    update(id, updateHeroDto) {
        return this.heroService.update(+id, updateHeroDto);
    }
    remove(id) {
        return this.heroService.remove(+id);
    }
};
exports.HeroController = HeroController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_hero_dto_1.CreateHeroDto]),
    __metadata("design:returntype", void 0)
], HeroController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HeroController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HeroController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_hero_dto_1.UpdateHeroDto]),
    __metadata("design:returntype", void 0)
], HeroController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HeroController.prototype, "remove", null);
exports.HeroController = HeroController = __decorate([
    (0, common_1.Controller)('hero'),
    __metadata("design:paramtypes", [hero_service_1.HeroService])
], HeroController);
//# sourceMappingURL=hero.controller.js.map