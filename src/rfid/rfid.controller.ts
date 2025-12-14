import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RfidService } from './rfid.service';
import { CreateRfidDto } from './dto/create-rfid.dto';
import { RfidQueryDto } from './dto/query-rfid.dto';
import { UpdateRfidDto } from './dto/update-rfid.dto';
import { RfidStatus } from '@prisma/client';

@Controller('rfids')
export class RfidController {
  constructor(private readonly service: RfidService) {}

  @Post()
  create(@Body() dto: CreateRfidDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() q: RfidQueryDto) {
    return this.service.findAll(q);
  }

  @Get(':uid')
  findOne(@Param('uid') uid: string) {
    return this.service.findOne(uid);
  }

  @Patch(':uid')
  update(@Param('uid') uid: string, @Body() dto: UpdateRfidDto) {
    return this.service.update(uid, dto);
  }

  @Patch(':uid/status/:status')
  setStatus(@Param('uid') uid: string, @Param('status') status: RfidStatus) {
    return this.service.setStatus(uid, status);
  }

  @Delete(':uid')
  remove(@Param('uid') uid: string) {
    return this.service.remove(uid);
  }
}
