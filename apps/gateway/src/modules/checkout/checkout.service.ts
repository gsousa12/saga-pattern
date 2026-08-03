import { Injectable } from '@nestjs/common';
import { DEFAULTS } from '@orchestrator/constants';
import type { CheckoutBody } from '@orchestrator/schemas';
import axios from 'axios';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || DEFAULTS.ORDER_SERVICE_URL;

@Injectable()
export class CheckoutService {
  async create(body: CheckoutBody) {
    const { data } = await axios.post(`${ORDER_SERVICE_URL}/checkout`, body);
    return data;
  }
}
