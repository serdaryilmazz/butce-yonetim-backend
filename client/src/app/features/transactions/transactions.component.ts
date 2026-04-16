import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService, Category, Transaction } from '../../core/services/api/api.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.css'
})
export class TransactionsComponent implements OnInit, OnDestroy {
  private readonly maxTransactionAmount = 10_000_000;
  private readonly maxNoteLength = 180;
  private readonly maxCategoryNameLength = 50;
  transactions: Transaction[] = [];
  categories: Category[] = [];
  txForm: FormGroup;
  categoryForm: FormGroup;
  isSubmitting = false;
  isCreatingCategory = false;
  errorMessage = '';
  successMessage = '';
  showDeleteModal = false;
  txToDelete: string | null = null;
  showCategoryModal = false;
  categoryErrorMessage = '';
  transactionFilters = {
    type: 'all' as 'all' | 'income' | 'expense',
    categoryId: 'all',
    month: '',
    query: '',
  };
  readonly transactionsPerPage = 4;
  currentTransactionsPage = 1;
  showFilterMonthPicker = false;
  filterMonthCursor = new Date();
  
  // History Wizard Logic
  showWizard = false;
  wizardMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  wizardAmounts: Record<string, number> = {};
  wizardDays: Record<string, number> = {};
  wizardAmountTouched: Record<string, boolean> = {};
  wizardDayTouched: Record<string, boolean> = {};
  isSavingBulk = false;
  showWizardDatePicker = false;
  showWizardCloseConfirm = false;
  private wizardInitialSnapshot: string | null = null;
  private wizardPendingInit = false;
  wizardSections = {
    expenseOpen: false,
    incomeOpen: false,
  };
  wizardCategoryQuery = '';
  wizardHideZero = false;

  get wizardMonthName(): string {
    const [year, month] = this.wizardMonth.split('-').map(Number);
    return `${this.months[month - 1]} ${year}`;
  }

  get wizardEntries() {
    const entries = Object.entries(this.wizardAmounts)
      .map(([catId, amount]) => {
        const category = this.categories.find(c => c._id === catId);
        const day = this.wizardDays[catId] || 15;
        return category
          ? { catId, name: category.name, type: category.type, amount: Number(amount || 0), day }
          : null;
      })
      .filter((x): x is { catId: string; name: string; type: 'income' | 'expense'; amount: number; day: number } => !!x)
      .filter(x => x.amount > 0)
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'expense' ? -1 : 1));

    return entries;
  }

  get wizardPreviewCount(): number {
    return this.wizardEntries.length;
  }

  get wizardPreviewTotals() {
    let income = 0;
    let expense = 0;
    for (const e of this.wizardEntries) {
      if (e.type === 'income') income += e.amount;
      else expense += e.amount;
    }
    return { income, expense, net: income - expense };
  }

  private getWizardQueryNormalized(): string {
    return this.wizardCategoryQuery.trim().toLowerCase();
  }

  private shouldShowWizardCategory(catId: string, type: 'income' | 'expense'): boolean {
    const cat = this.categories.find(c => c._id === catId && c.type === type);
    if (!cat) return false;

    if (this.wizardHideZero) {
      const amount = Number(this.wizardAmounts[catId] ?? 0);
      if (!(amount > 0)) return false;
    }

    const q = this.getWizardQueryNormalized();
    if (!q) return true;
    return cat.name.toLowerCase().includes(q);
  }

  get wizardFilteredExpenseCategories(): Category[] {
    return this.categories.filter(c => this.shouldShowWizardCategory(c._id, 'expense'));
  }

  get wizardFilteredIncomeCategories(): Category[] {
    return this.categories.filter(c => this.shouldShowWizardCategory(c._id, 'income'));
  }

  get wizardExpenseTotal(): number {
    return this.wizardEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  }

  get wizardIncomeTotal(): number {
    return this.wizardEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  }

  get wizardExpenseCount(): number {
    return this.wizardEntries.filter(e => e.type === 'expense').length;
  }

  get wizardIncomeCount(): number {
    return this.wizardEntries.filter(e => e.type === 'income').length;
  }

  toggleWizardSection(section: 'expense' | 'income') {
    if (section === 'expense') this.wizardSections.expenseOpen = !this.wizardSections.expenseOpen;
    else this.wizardSections.incomeOpen = !this.wizardSections.incomeOpen;
  }

  private takeWizardSnapshot() {
    const amounts: Record<string, number> = {};
    const days: Record<string, number> = {};
    for (const c of this.categories) {
      amounts[c._id] = Number(this.wizardAmounts[c._id] || 0);
      days[c._id] = Number(this.wizardDays[c._id] || 15);
    }
    this.wizardInitialSnapshot = JSON.stringify({ month: this.wizardMonth, amounts, days });
  }

  private get hasWizardUnsavedChanges(): boolean {
    if (!this.showWizard) return false;
    if (!this.wizardInitialSnapshot) return this.wizardEntries.length > 0;
    const amounts: Record<string, number> = {};
    const days: Record<string, number> = {};
    for (const c of this.categories) {
      amounts[c._id] = Number(this.wizardAmounts[c._id] || 0);
      days[c._id] = Number(this.wizardDays[c._id] || 15);
    }
    const now = JSON.stringify({ month: this.wizardMonth, amounts, days });
    return now !== this.wizardInitialSnapshot;
  }

  toggleWizardDatePicker(event: Event) {
    event.stopPropagation();
    this.showWizardDatePicker = !this.showWizardDatePicker;
  }

  selectWizardMonth(monthIdx: number) {
    const [year] = this.wizardMonth.split('-').map(Number);
    this.wizardMonth = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`;
    this.showWizardDatePicker = false;
  }

  changeWizardYear(delta: number) {
    const [year, month] = this.wizardMonth.split('-').map(Number);
    this.wizardMonth = `${year + delta}-${month.toString().padStart(2, '0')}`;
  }

  openWizard() {
    document.body.classList.add('modal-open');
    this.showWizard = true;
    this.showWizardCloseConfirm = false;
    this.wizardSections = { expenseOpen: false, incomeOpen: false };
    this.wizardCategoryQuery = '';
    this.wizardHideZero = false;
    this.wizardAmounts = {};
    this.wizardDays = {};
    this.wizardAmountTouched = {};
    this.wizardDayTouched = {};
    if (this.categories.length === 0) {
      this.wizardPendingInit = true;
      this.loadData();
      return;
    }
    this.initWizardDefaults();
  }

  private initWizardDefaults() {
    this.categories.forEach(c => {
      this.wizardAmounts[c._id] = 0;
      this.wizardDays[c._id] = 15; // Default to middle of month
      this.wizardAmountTouched[c._id] = false;
      this.wizardDayTouched[c._id] = false;
    });
    this.takeWizardSnapshot();
    this.wizardPendingInit = false;
  }

  markWizardAmountTouched(catId: string) {
    this.wizardAmountTouched[catId] = true;
  }

  markWizardDayTouched(catId: string) {
    this.wizardDayTouched[catId] = true;
  }

  normalizeWizardAmount(catId: string) {
    const raw = this.wizardAmounts[catId];
    if (raw === null || raw === undefined || raw === ('' as unknown as number)) {
      this.wizardAmounts[catId] = 0;
      return;
    }

    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      this.wizardAmounts[catId] = 0;
      return;
    }

    if (numeric < 0) {
      this.wizardAmounts[catId] = 0;
      return;
    }

    this.wizardAmounts[catId] = Number(numeric.toFixed(2));
  }

  normalizeMainAmount() {
    const control = this.txForm.get('amount');
    if (!control) return;

    const numeric = Number(control.value);
    if (!Number.isFinite(numeric)) {
      control.setValue(null);
      return;
    }

    const safe = Math.min(this.maxTransactionAmount, Math.max(0, numeric));
    control.setValue(Number(safe.toFixed(2)));
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  preventInvalidNumberKey(event: KeyboardEvent, allowDecimal = true) {
    const blocked = ['e', 'E', '+', '-'];
    if (blocked.includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (!allowDecimal && (event.key === '.' || event.key === ',')) {
      event.preventDefault();
    }
  }

  preventInvalidNumberPaste(event: ClipboardEvent, allowDecimal = true) {
    const text = event.clipboardData?.getData('text')?.trim() ?? '';
    const normalized = text.replace(',', '.');
    const regex = allowDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/;
    if (!regex.test(normalized)) {
      event.preventDefault();
    }
  }

  normalizeWizardDay(catId: string) {
    const raw = this.wizardDays[catId];
    const [year, month] = this.wizardMonth.split('-').map(Number);
    const maxDay = new Date(year, month, 0).getDate();
    const numeric = Number(raw);

    if (!Number.isFinite(numeric)) {
      this.wizardDays[catId] = 15;
      return;
    }

    this.wizardDays[catId] = Math.min(maxDay, Math.max(1, Math.round(numeric)));
  }

  getWizardAmountError(catId: string): string | null {
    if (!this.wizardAmountTouched[catId]) return null;
    const raw = this.wizardAmounts[catId];
    const numeric = Number(raw);

    if (!Number.isFinite(numeric)) return 'Geçerli bir tutar girin.';
    if (numeric < 0) return 'Tutar 0 veya daha büyük olmalı.';
    if (numeric > this.maxTransactionAmount) return `Tutar ${this.maxTransactionAmount.toLocaleString('tr-TR')} TL'den büyük olamaz.`;
    return null;
  }

  getWizardDayError(catId: string): string | null {
    if (!this.wizardDayTouched[catId]) return null;
    const amount = Number(this.wizardAmounts[catId] ?? 0);
    if (!(amount > 0)) return null; // Tutar 0 ise kaydedilmeyeceği için gün hatası göstermeyelim.

    const raw = this.wizardDays[catId];
    const numeric = Number(raw);
    const [year, month] = this.wizardMonth.split('-').map(Number);
    const maxDay = new Date(year, month, 0).getDate();

    if (!Number.isFinite(numeric)) return 'Geçerli bir gün girin.';
    if (!Number.isInteger(numeric)) return 'Gün tam sayı olmalı.';
    if (numeric < 1 || numeric > maxDay) return `Gün 1-${maxDay} aralığında olmalı.`;
    return null;
  }

  hasWizardValidationErrors(): boolean {
    return this.categories.some(c => {
      const amount = Number(this.wizardAmounts[c._id] ?? 0);
      const day = Number(this.wizardDays[c._id] ?? 15);
      const [year, month] = this.wizardMonth.split('-').map(Number);
      const maxDay = new Date(year, month, 0).getDate();
      if (!Number.isFinite(amount) || amount < 0) return true;
      if (!(amount > 0)) return false; // Tutar 0 ise gün hatası saymayalım (filtreyle uyumlu)

      const invalidAmount = amount > this.maxTransactionAmount;
      const invalidDay = !Number.isFinite(day) || !Number.isInteger(day) || day < 1 || day > maxDay;
      return invalidAmount || invalidDay;
    });
  }

  private markAllWizardFieldsTouched() {
    this.categories.forEach(c => {
      this.wizardAmountTouched[c._id] = true;
      this.wizardDayTouched[c._id] = true;
    });
  }

  requestCloseWizard() {
    if (this.isSavingBulk) return;
    if (this.hasWizardUnsavedChanges) {
      this.showWizardCloseConfirm = true;
      return;
    }
    this.forceCloseWizard();
  }

  cancelCloseWizard() {
    this.showWizardCloseConfirm = false;
  }

  confirmCloseWizard() {
    this.showWizardCloseConfirm = false;
    this.forceCloseWizard();
  }

  private forceCloseWizard() {
    this.showWizard = false;
    this.showWizardDatePicker = false;
    this.wizardPendingInit = false;
    this.wizardInitialSnapshot = null;
    document.body.classList.remove('modal-open');
  }

  saveWizardData() {
    this.markAllWizardFieldsTouched();
    if (this.hasWizardValidationErrors()) {
      this.errorMessage = 'Lütfen sihirbazdaki hatalı gün/tutar alanlarını düzeltin.';
      return;
    }

    const transactionsToSave: Partial<Transaction>[] = [];
    const [year, month] = this.wizardMonth.split('-').map(Number);

    Object.entries(this.wizardAmounts).forEach(([catId, amount]) => {
      if (amount && amount > 0) {
        const category = this.categories.find(c => c._id === catId);
        const day = this.wizardDays[catId] || 15;
        // Ensure day is valid for month
        const safeDay = Math.min(day, new Date(year, month, 0).getDate());
        const date = new Date(Date.UTC(year, month - 1, safeDay));

        if (category) {
          transactionsToSave.push({
            type: category.type,
            amount: amount,
            categoryId: catId,
            date: date,
            note: `${this.months[month - 1]} ayı özeti`
          });
        }
      }
    });

    if (transactionsToSave.length === 0) {
      this.errorMessage = 'Lütfen en az bir kategori için tutar girin.';
      return;
    }

    this.isSavingBulk = true;
    this.api.addTransactionsBulk(transactionsToSave).subscribe({
      next: () => {
        this.successMessage = `${transactionsToSave.length} adet geçmiş kayıt oluşturuldu!`;
        this.loadData();
        this.forceCloseWizard();
        this.isSavingBulk = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.data?.message || 'Toplu kayıt sırasında hata oluştu.';
        this.isSavingBulk = false;
      }
    });
  }
  
  // Custom Date Picker Logic
  showDatePicker = false;
  calendarDate = new Date();
  calendarDays: (number | null)[] = [];
  selectedDateStr = new Date().toISOString().substring(0, 10);
  months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  weekDays = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.txForm = this.fb.group({
      type: ['expense', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01), Validators.max(this.maxTransactionAmount)]],
      categoryId: [null, Validators.required],
      date: [this.selectedDateStr, Validators.required],
      note: ['', [Validators.maxLength(this.maxNoteLength)]]
    });

    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(this.maxCategoryNameLength)]],
      type: ['expense', Validators.required],
    });

    this.txForm.get('type')?.valueChanges.subscribe(() => {
      this.txForm.get('categoryId')?.setValue(null);
    });

    this.txForm.get('amount')?.valueChanges.subscribe(value => {
      if (value === null || value === undefined || value === '') return;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        this.txForm.get('amount')?.setValue(null, { emitEvent: false });
      }
    });
    
    this.generateCalendar();
  }

  openCategoryModal(type?: 'income' | 'expense') {
    this.categoryErrorMessage = '';
    this.showCategoryModal = true;
    this.categoryForm.reset({
      name: '',
      type: type ?? this.txForm.get('type')?.value ?? 'expense',
    });
  }

  closeCategoryModal() {
    if (this.isCreatingCategory) return;
    this.showCategoryModal = false;
    this.categoryErrorMessage = '';
  }

  createCategory() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.categoryErrorMessage = 'Lütfen kategori adını girin.';
      return;
    }

    if (this.isCreatingCategory) return;

    this.isCreatingCategory = true;
    this.categoryErrorMessage = '';

    const payload = {
      name: String(this.categoryForm.value.name || '').trim(),
      type: this.categoryForm.value.type as 'income' | 'expense',
    };

    this.api.createCategory(payload).subscribe({
      next: ({ data }) => {
        this.categories = [...this.categories, data].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        this.txForm.get('type')?.setValue(data.type);
        this.txForm.get('categoryId')?.setValue(data._id);
        this.successMessage = `"${data.name}" kategorisi eklendi.`;
        this.showCategoryModal = false;
        this.isCreatingCategory = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.categoryErrorMessage = err.error?.data?.message || 'Kategori eklenemedi.';
        this.isCreatingCategory = false;
      }
    });
  }

  generateCalendar() {
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust for Monday start (JS getDay is 0 for Sunday)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const days: (number | null)[] = [];
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    
    this.calendarDays = days;
  }

  prevMonth(event: Event) {
    event.stopPropagation();
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(event: Event) {
    event.stopPropagation();
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  selectDate(day: number | null) {
    if (!day) return;
    const date = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth(), day);
    // Add time zone offset to keep date correct
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    this.selectedDateStr = adjustedDate.toISOString().substring(0, 10);
    this.txForm.get('date')?.setValue(this.selectedDateStr);
    this.showDatePicker = false;
  }

  toggleDatePicker(event: Event) {
    event.stopPropagation();
    this.showDatePicker = !this.showDatePicker;
  }

  get filteredCategories(): Category[] {
    const selectedType = this.txForm.get('type')?.value;
    return this.categories.filter(cat => cat.type === selectedType);
  }

  get transactionFilterMonthLabel(): string {
    if (!this.transactionFilters.month) return 'Ay seçin';
    const [year, month] = this.transactionFilters.month.split('-').map(Number);
    return `${this.months[month - 1]} ${year}`;
  }

  get filteredTransactions(): Transaction[] {
    return this.transactions.filter(tx => {
      const categoryId = typeof tx.categoryId === 'object' ? tx.categoryId?._id : tx.categoryId;
      const categoryName = this.getCategoryName(tx).toLowerCase();
      const note = (tx.note || '').toLowerCase();
      const query = this.transactionFilters.query.trim().toLowerCase();
      const txMonth = new Date(tx.date).toISOString().substring(0, 7);

      if (this.transactionFilters.type !== 'all' && tx.type !== this.transactionFilters.type) return false;
      if (this.transactionFilters.categoryId !== 'all' && categoryId !== this.transactionFilters.categoryId) return false;
      if (this.transactionFilters.month && txMonth !== this.transactionFilters.month) return false;
      if (query && !categoryName.includes(query) && !note.includes(query)) return false;
      return true;
    });
  }

  get paginatedTransactions(): Transaction[] {
    const start = (this.currentTransactionsPage - 1) * this.transactionsPerPage;
    return this.filteredTransactions.slice(start, start + this.transactionsPerPage);
  }

  get totalTransactionsPages(): number {
    return Math.max(1, Math.ceil(this.filteredTransactions.length / this.transactionsPerPage));
  }

  get availableTransactionCategories(): Category[] {
    if (this.transactionFilters.type === 'all') return this.categories;
    return this.categories.filter(cat => cat.type === this.transactionFilters.type);
  }

  applyTransactionFilters() {
    if (this.transactionFilters.categoryId !== 'all') {
      const valid = this.availableTransactionCategories.some(cat => cat._id === this.transactionFilters.categoryId);
      if (!valid) this.transactionFilters.categoryId = 'all';
    }
    this.currentTransactionsPage = 1;
  }

  toggleFilterMonthPicker(event: Event) {
    event.stopPropagation();
    if (this.transactionFilters.month) {
      const [year, month] = this.transactionFilters.month.split('-').map(Number);
      this.filterMonthCursor = new Date(year, month - 1, 1);
    }
    this.showFilterMonthPicker = !this.showFilterMonthPicker;
  }

  changeFilterYear(delta: number) {
    this.filterMonthCursor = new Date(this.filterMonthCursor.getFullYear() + delta, this.filterMonthCursor.getMonth(), 1);
  }

  selectFilterMonth(monthIdx: number) {
    const year = this.filterMonthCursor.getFullYear();
    this.transactionFilters.month = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`;
    this.showFilterMonthPicker = false;
    this.applyTransactionFilters();
  }

  clearFilterMonth() {
    this.transactionFilters.month = '';
    this.showFilterMonthPicker = false;
    this.applyTransactionFilters();
  }

  goToTransactionsPage(page: number) {
    this.currentTransactionsPage = Math.min(this.totalTransactionsPages, Math.max(1, page));
  }

  clearTransactionFilters() {
    this.transactionFilters = {
      type: 'all',
      categoryId: 'all',
      month: '',
      query: '',
    };
    this.currentTransactionsPage = 1;
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  loadData() {
    this.errorMessage = '';
    forkJoin({
      categories: this.api.getCategories(),
      transactions: this.api.getTransactions(),
    }).subscribe({
      next: ({ categories, transactions }) => {
        this.categories = categories.data;
        this.transactions = transactions.data;
        this.applyTransactionFilters();
        if (this.showWizard && this.wizardPendingInit) {
          this.initWizardDefaults();
        }
      },
      error: () => {
        this.errorMessage = 'İşlem verileri yüklenemedi.';
      }
    });
  }

  onSubmit() {
    if (this.txForm.invalid) {
      this.txForm.markAllAsTouched();
      this.errorMessage = 'Lütfen formdaki tüm alanları (Tutar, Kategori vb.) eksiksiz ve doğru doldurun.';
      return;
    }

    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = { ...this.txForm.value };
    
    this.api.addTransaction(payload).subscribe({
      next: () => {
        this.successMessage = 'İşlem başarıyla eklendi!';
        this.txForm.reset({ 
          type: payload.type, 
          amount: null, 
          date: new Date().toISOString().substring(0, 10),
          categoryId: null
        });
        this.loadData();
        this.isSubmitting = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.data?.message || 'İşlem kaydedilemedi. Lütfen tekrar deneyin.';
        this.isSubmitting = false;
      }
    });
  }

  getControlError(controlName: string): string | null {
    const control = this.txForm.get(controlName);
    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) {
      if (controlName === 'amount') return 'Tutar zorunludur.';
      if (controlName === 'categoryId') return 'Kategori seçimi zorunludur.';
      return 'Bu alan zorunludur.';
    }
    if (control.errors['min']) return 'Tutar 0.01 TL veya daha büyük olmalı.';
    if (control.errors['max']) return `Tutar en fazla ${this.maxTransactionAmount.toLocaleString('tr-TR')} TL olabilir.`;
    if (control.errors['maxlength']) return `Not en fazla ${this.maxNoteLength} karakter olabilir.`;
    return 'Geçersiz değer.';
  }

  getCategoryControlError(controlName: 'name' | 'type'): string | null {
    const control = this.categoryForm.get(controlName);
    if (!control || !control.touched || !control.errors) return null;
    if (control.errors['required']) return controlName === 'name' ? 'Kategori adı zorunludur.' : 'Kategori türü zorunludur.';
    if (control.errors['maxlength']) return `Kategori adı en fazla ${this.maxCategoryNameLength} karakter olabilir.`;
    return 'Geçersiz değer.';
  }

  onDelete(id?: string) {
    if (!id) return;
    this.txToDelete = id;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.txToDelete = null;
  }

  confirmDelete() {
    if (!this.txToDelete) return;
    this.api.deleteTransaction(this.txToDelete).subscribe({
      next: () => {
        this.loadData();
        this.successMessage = 'İşlem başarıyla silindi.';
        this.closeDeleteModal();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.data?.message || 'İşlem silinemedi.';
        this.closeDeleteModal();
      }
    });
  }

  private closeDeleteModal() {
    this.showDeleteModal = false;
    this.txToDelete = null;
  }

  getCategoryName(tx: Transaction): string {
    if (!tx.categoryId) return 'Diğer';
    if (typeof tx.categoryId === 'object' && 'name' in tx.categoryId) {
      return tx.categoryId.name;
    }
    return 'Diğer';
  }

  private getFormErrors() {
    const errors: any = {};
    Object.keys(this.txForm.controls).forEach(key => {
      const controlErrors = this.txForm.get(key)?.errors;
      if (controlErrors) errors[key] = controlErrors;
    });
    return errors;
  }
}
