import { CategoryEntity, CategoryType } from '../models/category.model';
import { logger } from '../utils/logger';

export class CategoryService {
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async seedDefaultCategories(): Promise<void> {
    try {
      const count = await CategoryEntity.countDocuments({ isDefault: true });
      if (count === 0) {
        const defaultCategories = [
          { name: 'Maaş', type: 'income', isDefault: true },
          { name: 'Burs', type: 'income', isDefault: true },
          { name: 'Kira', type: 'expense', isDefault: true },
          { name: 'Yemek', type: 'expense', isDefault: true },
          { name: 'Fatura', type: 'expense', isDefault: true },
          { name: 'Ulaşım', type: 'expense', isDefault: true },
          { name: 'Eğlence', type: 'expense', isDefault: true },
        ];
        await CategoryEntity.insertMany(defaultCategories);
        logger.info('Default categories seeded successfully.');
      }
    } catch (error) {
      logger.error('Failed to seed default categories', error);
    }
  }

  async getCategories(userId: string) {
    return CategoryEntity.find({
      $or: [{ isDefault: true }, { userId }],
    });
  }

  async createCategory(userId: string, data: { name: string; type: CategoryType; icon?: string }) {
    const normalizedName = data.name.trim();
    const existing = await CategoryEntity.findOne({
      type: data.type,
      $or: [{ isDefault: true }, { userId }],
      name: { $regex: `^${this.escapeRegex(normalizedName)}$`, $options: 'i' },
    });

    if (existing) {
      throw new Error('Bu isimde bir kategori zaten mevcut.');
    }

    const category = new CategoryEntity({
      ...data,
      name: normalizedName,
      isDefault: false,
      userId,
    });
    await category.save();
    return category;
  }

  async deleteCategory(userId: string, categoryId: string) {
    const category = await CategoryEntity.findOneAndDelete({ _id: categoryId, userId, isDefault: false });
    if (!category) {
      throw new Error('Category not found or you do not have permission to delete it.');
    }
    return category;
  }
}

export const categoryService = new CategoryService();
