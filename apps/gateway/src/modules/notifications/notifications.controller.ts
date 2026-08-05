import { Controller, Get, Param } from '@nestjs/common';

// oxlint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(':idempotencyKey')
  async findAll(@Param('idempotencyKey') idempotencyKey: string) {
    return this.notificationsService.findAll(idempotencyKey);
  }
}
