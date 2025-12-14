import { Controller, Get } from '@nestjs/common';
import { RfidEventService } from './rfid-event.service';

@Controller('rfid-events')
export class RfidEventController {
  constructor(private service: RfidEventService) {}

  @Get('history')
  history() {
    return this.service.history();
  }
}
