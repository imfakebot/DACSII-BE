import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export interface GeocodeAddress {
  street: string;
  ward: string;
  city: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(private readonly httpService: HttpService) {}

  async geocode(
    address: GeocodeAddress,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const addressString = `${address.street}, ${address.ward}, ${address.city}, Vietnam`;
    this.logger.log(`Geocoding address: ${addressString}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<NominatimResponse[]>(this.nominatimUrl, {
          params: {
            q: addressString,
            format: 'json',
            limit: 1,
            'accept-language': 'vi',
          },
          headers: {
            'User-Agent': 'DACSII-Backend/1.0', // Nominatim requires a User-Agent
          },
        }),
      );

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        if (!isNaN(latitude) && !isNaN(longitude)) {
          this.logger.log(
            `Geocoding successful for "${addressString}": Lat: ${latitude}, Lon: ${longitude}`,
          );
          return { latitude, longitude };
        }
      }

      this.logger.warn(
        `Could not geocode address: ${addressString}. No results found.`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error during geocoding for "${addressString}"`, error);
      return null;
    }
  }
}
