export class CreateHeroDto {
  titleFr: string;
  titleEn: string;
  subtitleFr: string;
  subtitleEn: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string;
  order?: number;
  isActive?: boolean;
}
