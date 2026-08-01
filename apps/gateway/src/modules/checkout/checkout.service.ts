import { Injectable } from '@nestjs/common';
import axios from 'axios';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3001';

@Injectable()
export class CheckoutService {
  async create(body: { idempotencyKey: string; productId: string; quantity: number }) {
    const { data } = await axios.post(`${ORDER_SERVICE_URL}/checkout`, body);
    return data;
  }
}
