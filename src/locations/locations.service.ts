import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Repository } from 'typeorm';
import { Ward } from './entities/ward.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(City) private cityRepository: Repository<City>,
    @InjectRepository(Ward) private wardRepository: Repository<Ward>,
  ) {}

  async findAll(): Promise<City[]> {
    return this.cityRepository.find();
  }

  async findWardsByCityId(cityId: number): Promise<Ward[]> {
    return this.wardRepository.find({ where: { city: { id: cityId } } });
  }
}
