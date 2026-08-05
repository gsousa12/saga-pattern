import { Injectable, HttpException } from '@nestjs/common';
import { DEFAULTS } from '@orchestrator/constants';
import axios from 'axios';

const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || DEFAULTS.NOTIFICATION_SERVICE_URL;

@Injectable()
export class NotificationsService {
  async findAll(idempotencyKey: string) {
    try {
      const { data } = await axios.get(
        `${NOTIFICATION_SERVICE_URL}/notifications/${idempotencyKey}`,
      );
      return data;
    } catch (err) {
      // oxlint-disable-next-line import/no-named-as-default-member
      if (axios.isAxiosError(err) && err.response) {
        throw new HttpException(
          {
            message: 'Notification service error',
            status: err.response.status,
            detail: err.response.data,
          },
          err.response.status,
        );
      }
      throw new HttpException({ message: 'Notification service unavailable' }, 503);
    }
  }
}
