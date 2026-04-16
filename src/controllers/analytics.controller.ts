import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

class AnalyticsController {
  async getSummary(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      const data = await analyticsService.getSummary(userId);
      response.status(200).json({ success: true, data });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: (error as Error).message } });
    }
  }

  async getTopCategory(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      const data = await analyticsService.getTopCategory(userId);
      response.status(200).json({ success: true, data });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: (error as Error).message } });
    }
  }

  async getMonthlyComparison(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      const data = await analyticsService.getMonthlyComparison(userId);
      response.status(200).json({ success: true, data });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: (error as Error).message } });
    }
  }

  async getCategoryDistribution(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      const data = await analyticsService.getCategoryDistribution(userId);
      response.status(200).json({ success: true, data });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: (error as Error).message } });
    }
  }

  async getDailyExpenses(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      const data = await analyticsService.getDailyExpenses(userId);
      response.status(200).json({ success: true, data });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: (error as Error).message } });
    }
  }

  async getAiInsights(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      const data = await analyticsService.getAiInsights(userId);
      response.status(200).json({ success: true, data });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: (error as Error).message } });
    }
  }
}

export const analyticsController = new AnalyticsController();
