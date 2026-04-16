import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { ApiService, CategoryDistributionItem, DailyExpensePoint } from '../../core/services/api/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('pieChartCanvas') pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;

  pieChart?: Chart;
  lineChart?: Chart;
  categoryData: CategoryDistributionItem[] = [];
  dailyData: DailyExpensePoint[] = [];
  errorMessage = '';

  private readonly destroy$ = new Subject<void>();

  constructor(private api: ApiService) {}

  ngAfterViewInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pieChart?.destroy();
    this.lineChart?.destroy();
  }

  loadData() {
    this.errorMessage = '';
    forkJoin({
      cat: this.api.getCategoryDistribution(),
      daily: this.api.getDailyExpenses()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.categoryData = res.cat.data;
          this.dailyData = res.daily.data;
          this.initPieChart();
          this.initLineChart();
        },
        error: () => {
          this.errorMessage = 'Rapor verileri yuklenemedi.';
        }
      });
  }

  initPieChart() {
    this.pieChart?.destroy();

    const ctx = this.pieChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const bgColors = ['#0058be', '#006c49', '#b61722', '#6b4c9a', '#e88f0a', '#10898d', '#555555'];

    this.pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.categoryData.map((d) => d.categoryName),
        datasets: [{
          data: this.categoryData.map((d) => d.amount),
          backgroundColor: bgColors.slice(0, this.categoryData.length),
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 14 } } },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${context.raw} TL`
            }
          }
        }
      }
    });
  }

  initLineChart() {
    this.lineChart?.destroy();

    const ctx = this.lineChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(182, 23, 34, 0.4)');
    gradient.addColorStop(1, 'rgba(182, 23, 34, 0.0)');

    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.dailyData.map((d) => `${d.day}. Gun`),
        datasets: [{
          label: 'Gunluk Giderler',
          data: this.dailyData.map((d) => d.amount),
          borderColor: '#b61722',
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: '#b61722',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Harcama: ${context.raw} TL`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
  }
}
