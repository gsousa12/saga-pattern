import { Injectable } from '@nestjs/common';
import { DEFAULTS } from '@orchestrator/constants';
import axios from 'axios';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || DEFAULTS.ORDER_SERVICE_URL;

@Injectable()
export class CheckoutService {
  async create(body: { idempotencyKey: string; productId: string; quantity: number }) {
    const { data } = await axios.post(`${ORDER_SERVICE_URL}/checkout`, body);
    return data;
  }
}
