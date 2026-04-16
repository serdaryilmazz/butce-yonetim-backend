import { Request, Response } from 'express';

import { healthService } from '../services/health.service';

class HealthController {
  getStatus(_request: Request, response: Response): void {
    const status = healthService.getStatus();

    response.status(200).json({
      success: true,
      data: status,
    });
  }

  getReadiness(_request: Request, response: Response): void {
    const status = healthService.getStatus();

    response.status(status.ready ? 200 : 503).json({
      success: status.ready,
      data: status,
    });
  }
}

export const healthController = new HealthController();
