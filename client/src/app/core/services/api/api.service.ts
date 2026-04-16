import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Category = {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  isDefault: boolean;
};

export type TransactionCategory = Pick<Category, '_id' | 'name' | 'icon' | 'type'>;

export interface Transaction {
  _id?: string;
  userId?: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId?: string | TransactionCategory | null;
  date: string | Date;
  note?: string;
}

export type Summary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

export type DailyExpensePoint = {
  day: number;
  amount: number;
};

export type CategoryDistributionItem = {
  categoryName: string;
  icon: string;
  amount: number;
};

export type Budget = {
  _id?: string;
  limit: number;
  spent: number;
  isOverLimit: boolean;
  categoryId?: Pick<Category, '_id' | 'name' | 'icon' | 'type'> | null;
};

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTransactions(): Observable<ApiResponse<Transaction[]>> {
    return this.http.get<ApiResponse<Transaction[]>>(`${this.apiUrl}/transactions`);
  }

  addTransaction(transaction: Partial<Transaction>): Observable<ApiResponse<Transaction>> {
    return this.http.post<ApiResponse<Transaction>>(`${this.apiUrl}/transactions`, transaction);
  }

  addTransactionsBulk(transactions: Partial<Transaction>[]): Observable<ApiResponse<Transaction[]>> {
    return this.http.post<ApiResponse<Transaction[]>>(`${this.apiUrl}/transactions/bulk`, { transactions });
  }

  deleteTransaction(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.apiUrl}/transactions/${id}`);
  }

  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(`${this.apiUrl}/categories`);
  }

  createCategory(category: { name: string; type: 'income' | 'expense'; icon?: string }): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(`${this.apiUrl}/categories`, category);
  }

  getSummary(): Observable<ApiResponse<Summary>> {
    return this.http.get<ApiResponse<Summary>>(`${this.apiUrl}/analytics/summary`);
  }

  getCategoryDistribution(): Observable<ApiResponse<CategoryDistributionItem[]>> {
    return this.http.get<ApiResponse<CategoryDistributionItem[]>>(`${this.apiUrl}/analytics/category-distribution`);
  }

  getDailyExpenses(): Observable<ApiResponse<DailyExpensePoint[]>> {
    return this.http.get<ApiResponse<DailyExpensePoint[]>>(`${this.apiUrl}/analytics/daily-expenses`);
  }

  getBudgets(): Observable<ApiResponse<Budget[]>> {
    return this.http.get<ApiResponse<Budget[]>>(`${this.apiUrl}/budgets`);
  }

  createBudget(budget: { categoryId?: string | null; limit: number }): Observable<ApiResponse<Budget>> {
    return this.http.post<ApiResponse<Budget>>(`${this.apiUrl}/budgets`, budget);
  }

  getAiInsights(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/analytics/ai-insights`);
  }
}
