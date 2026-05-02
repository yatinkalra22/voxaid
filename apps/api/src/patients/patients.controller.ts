import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service.js';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  async findAll() {
    const patients = await this.patientsService.findAll();
    return { ok: true, data: patients };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const patient = await this.patientsService.findOne(id);
    if (!patient) {
      throw new NotFoundException({ ok: false, error: { code: 'NOT_FOUND', message: 'Patient not found' } });
    }
    return { ok: true, data: patient };
  }
}
