import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService, Budget, Category } from '../../core/services/api/api.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  budgets: Budget[] = [];
  budgetForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.budgetForm = this.fb.group({
      categoryId: [null, Validators.required],
      limit: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.errorMessage = '';
    forkJoin({
      categories: this.api.getCategories(),
      budgets: this.api.getBudgets(),
    }).subscribe({
      next: ({ categories, budgets }) => {
        this.categories = categories.data.filter((c: any) => c.type === 'expense');
        this.budgets = budgets.data;
      },
      error: () => {
        this.errorMessage = 'Bütçe verileri yüklenemedi.';
      }
    });
  }

  onSubmit() {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      this.errorMessage = 'Lütfen formdaki tüm alanları (Kategori, Limit vb.) eksiksiz doldurun.';
      return;
    }

    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.createBudget(this.budgetForm.value).subscribe({
      next: () => {
        this.successMessage = 'Bütçe başarıyla kaydedildi!';
        this.budgetForm.reset({ limit: null, categoryId: null });
        this.loadData();
        this.isSubmitting = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.data?.message || 'Bütçe kaydedilemedi.';
        this.isSubmitting = false;
      }
    });
  }

  getBudgetProgress(budget: Budget): number {
    if (!budget.limit) return 0;
    const progress = (budget.spent / budget.limit) * 100;
    return progress > 100 ? 100 : progress;
  }
}
