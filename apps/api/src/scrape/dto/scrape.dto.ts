import { IsUrl } from 'class-validator';

export class ScrapeDto {
  @IsUrl(
    {
      require_protocol: true,
      protocols: ['https'],
    },
    { message: 'Only HTTPS URLs are allowed' },
  )
  url!: string;
}
