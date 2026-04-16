import { Request, Response } from 'express';
import { budgetService } from '../services/budget.service';
import { isBadRequestError, isValidObjectId } from '../utils/validation';

class BudgetController {
  async getBudgets(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      
      const budgets = await budgetService.getBudgets(userId);
      response.status(200).json({ success: true, data: budgets });
    } catch (error) {
      response.status(500).json({ success: false, data: { message: (error as Error).message } });
    }
  }

  async createBudget(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) { response.status(401).json({ success: false, data: { message: 'Unauthorized' } }); return; }
      
      const { limit, categoryId } = request.body;
      if (limit === undefined || typeof limit !== 'number' || limit < 0) {
        response.status(400).json({ success: false, data: { message: 'Valid non-negative limit is required.' } });
        return;
      }

      if (categoryId !== undefined && categoryId !== null && categoryId !== '' && !isValidObjectId(String(categoryId))) {
        response.status(400).json({ success: false, data: { message: 'Invalid category id.' } });
        return;
      }

      const budget = await budgetService.createBudget(userId, { limit, categoryId });
      response.status(201).json({ success: true, data: budget });
    } catch (error) {
      const message = (error as Error).message;
      const status = isBadRequestError(error) ? 400 : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }
}

export const budgetController = new BudgetController();
