import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService, Summary } from '../../core/services/api/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  summary: Summary = {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0
  };
  aiInsights: string[] = [];
  overLimitBudgets: any[] = [];
  errorMessage = '';

  private destroyRef = inject(DestroyRef);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getSummary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        if (res.success) {
          this.summary = res.data;
        }
      },
      error: () => {
        this.errorMessage = 'Dashboard verileri yüklenemedi.';
      }
    });

    this.api.getBudgets().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        if (res.success) {
          this.overLimitBudgets = res.data
            .filter(b => b.isOverLimit)
            .map(b => ({
              name: b.categoryId?.name || 'Genel Bütçe',
              percentage: Math.round(((b.spent - b.limit) / b.limit) * 100)
            }));
        }
      }
    });

    this.api.getAiInsights().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        if (res.success) {
          this.aiInsights = res.data;
        }
      },
      error: () => {
        this.errorMessage = 'AI analiz verileri yüklenemedi.';
      }
    });
  }
}
