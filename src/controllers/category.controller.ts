import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { isBadRequestError, isValidObjectId } from '../utils/validation';

class CategoryController {
  async getCategories(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }
      const categories = await categoryService.getCategories(userId);
      response.status(200).json({ success: true, data: categories });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch categories.';
      response.status(500).json({ success: false, data: { message } });
    }
  }

  async createCategory(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }

      const { name, type, icon } = request.body;
      if (!name || typeof name !== 'string' || !type) {
        response.status(400).json({ success: false, data: { message: 'Name and type are required.' } });
        return;
      }

      if (type !== 'income' && type !== 'expense') {
        response.status(400).json({ success: false, data: { message: 'Invalid category type.' } });
        return;
      }

      const category = await categoryService.createCategory(userId, {
        name,
        type,
        icon,
      });
      response.status(201).json({ success: true, data: category });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category.';
      const status = message.includes('zaten mevcut') ? 400 : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }

  async deleteCategory(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.user?.id;
      if (!userId) {
        response.status(401).json({ success: false, data: { message: 'Unauthorized' } });
        return;
      }

      const categoryId = request.params.id as string;
      if (!isValidObjectId(categoryId)) {
        response.status(400).json({ success: false, data: { message: 'Invalid category id.' } });
        return;
      }

      await categoryService.deleteCategory(userId, categoryId);
      response.status(200).json({ success: true, data: { message: 'Category deleted successfully.' } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category.';
      const status = message.includes('permission') || message.includes('not found') ? 404 : isBadRequestError(error) ? 400 : 500;
      response.status(status).json({ success: false, data: { message } });
    }
  }
}

export const categoryController = new CategoryController();
