import { Component, effect, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ClientStore } from '../../../../client-management/application/client.store';
import { VehicleStore } from '../../../../vehicle-management/application/vehicle.store';
import { IamStore } from '../../../../iam/application/iam.store';
import { CreditSimulationStore } from '../../../application/credit-simulation.store';

import {
  CapitalizationType,
  ExpenseAmountType,
  ExpenseBaseCalculation,
  ExpensePaymentBehavior,
  ExpenseStage,
  PeriodType,
  RatePeriodType,
  RateType,
} from '../../../domain/model/credit-simulation.types';

import {
  CreditSimulationInput,
  CreditSimulationResult,
} from '../../../domain/services/credit-simulation.service';

import { AdditionalExpenseType } from '../../../domain/model/additional-expense.entity';

import {
  InsuranceBaseCalculation,
  InsuranceRatePeriod,
  InsuranceType,
} from '../../../domain/model/insurance-type.entity';

import { CurrencyCode } from '../../../domain/model/simulation.entity';

type InsuranceLineGroup = FormGroup<{
  insuranceTypeId: FormControl<string>;
  name: FormControl<string>;
  baseCalculo: FormControl<string>;
  monthlyRate: FormControl<number>;
  applies: FormControl<boolean>;

  rateValue: FormControl<number>;
  ratePeriod: FormControl<InsuranceRatePeriod>;
  baseCalculation: FormControl<InsuranceBaseCalculation>;
}>;

type ExpenseGroup = FormGroup<{
  concept: FormControl<string>;
  type: FormControl<AdditionalExpenseType>;
  amount: FormControl<number>;
  installmentStart: FormControl<number>;
  installmentEnd: FormControl<number>;
  description: FormControl<string>;

  expenseStage: FormControl<ExpenseStage>;
  paymentBehavior: FormControl<ExpensePaymentBehavior>;
  amountType: FormControl<ExpenseAmountType>;
  rateValue: FormControl<number>;
  baseCalculation: FormControl<ExpenseBaseCalculation>;
}>;

/**
 * Compra Inteligente simulation form.
 *
 * Updated to match the Excel-based financial model:
 * - Final quota / balloon calculated over vehicle price.
 * - Total grace + partial grace.
 * - Initial financed expenses.
 * - Periodic expenses.
 * - Desgravamen and risk insurance.
 * - VAN/TIR/TCEA from the debtor cash flow.
 */
@Component({
  selector: 'app-simulation-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    DecimalPipe,
    PercentPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './simulation-form.html',
  styleUrl: './simulation-form.css',
})
export class SimulationForm {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly store = inject(CreditSimulationStore);
  protected readonly clientStore = inject(ClientStore);
  protected readonly vehicleStore = inject(VehicleStore);

  private readonly iamStore = inject(IamStore);

  protected readonly capitalizationOptions: CapitalizationType[] = [
    'DIARIA',
    'QUINCENAL',
    'MENSUAL',
    'BIMESTRAL',
    'TRIMESTRAL',
    'CUATRIMESTRAL',
    'SEMESTRAL',
    'ANUAL',
  ];

  protected readonly ratePeriodOptions: RatePeriodType[] = [
    'MENSUAL',
    'TRIMESTRAL',
    'CUATRIMESTRAL',
    'SEMESTRAL',
    'ANUAL',
  ];

  protected readonly expenseStageOptions: ExpenseStage[] = ['INITIAL', 'PERIODIC'];
  protected readonly paymentBehaviorOptions: ExpensePaymentBehavior[] = [
    'FINANCED',
    'PAID_IN_INSTALLMENT',
  ];

  readonly insuranceLines = this.fb.array<InsuranceLineGroup>([]);
  readonly additionalExpenses = this.fb.array<ExpenseGroup>([]);

  private readonly defaultsApplied = signal(false);
  private readonly selectedVehicleOriginalPrice = signal(0);
  private readonly selectedVehicleOriginalCurrency = signal<CurrencyCode>('PEN');
  private readonly lastSelectedSimulationCurrency = signal<CurrencyCode>('PEN');

  readonly form = this.fb.nonNullable.group({
    clientId: ['', Validators.required],
    vehicleId: ['', Validators.required],

    vehiclePrice: [0, [Validators.required, Validators.min(0)]],
    currency: ['PEN' as CurrencyCode, Validators.required],
    currencyCatalogId: [''],
    exchangeRateUsdPen: [3.41, [Validators.required, Validators.min(0.0001)]],

    initialFeePercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],

    termMonths: [0, [Validators.required, Validators.min(1)]],

    /**
     * UI name aligned with Excel.
     * We still pass it also as futureValuePercentage for compatibility.
     */
    finalQuotaPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],

    rateType: ['EFECTIVA' as RateType, Validators.required],
    ratePeriod: ['ANUAL' as RatePeriodType, Validators.required],
    interestRate: [0, [Validators.required, Validators.min(0)]],
    capitalization: ['MENSUAL' as CapitalizationType, Validators.required],

    totalGracePeriods: [0, [Validators.required, Validators.min(0)]],
    partialGracePeriods: [0, [Validators.required, Validators.min(0)]],

    paymentFrequencyDays: [30, [Validators.required, Validators.min(1)]],
    daysPerYear: [360, [Validators.required, Validators.min(1)]],

    opportunityTeaPercent: [0, [Validators.required, Validators.min(0)]],

    gps: [0, [Validators.min(0)]],
    portes: [0, [Validators.min(0)]],
    administrativeExpenses: [0, [Validators.min(0)]],

    disbursementDate: [this.todayIso(), Validators.required],

    insuranceLines: this.insuranceLines,
    additionalExpenses: this.additionalExpenses,
  });

  readonly result = signal<CreditSimulationResult | null>(null);

  constructor() {
    effect(() => {
      const types = this.store.insuranceTypes();

      if (types.length > 0 && this.insuranceLines.length === 0) {
        types.forEach((type) => this.insuranceLines.push(this.buildInsuranceGroup(type)));
      }
    });

    effect(() => {
      const currentUser = this.iamStore.currentUser();

      if (!currentUser || this.defaultsApplied()) {
        return;
      }

      const setting = this.store.settings().find((item) => item.userId === currentUser.id);

      if (!setting) {
        return;
      }

      this.form.patchValue({
        currencyCatalogId: setting.defaultCurrencyCatalogId,
        exchangeRateUsdPen:
          setting.defaultChangeUsdPen > 0
            ? setting.defaultChangeUsdPen
            : this.form.controls.exchangeRateUsdPen.value,
        rateType: setting.defaultInterestType,
        capitalization: setting.defaultCapitalization,
        totalGracePeriods: setting.defaultTotalGracePeriods,
        partialGracePeriods: setting.defaultPartialGracePeriods,
        paymentFrequencyDays: setting.defaultPaymentFrequencyDays,
        daysPerYear: setting.defaultDaysPerYear,
        opportunityTeaPercent: setting.defaultOpportunityTea,
        gps: setting.defaultGps,
        portes: setting.defaultPortes,
        administrativeExpenses: setting.defaultAdministrativeExpense,
      });

      this.defaultsApplied.set(true);
    });

    this.form.controls.vehicleId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((vehicleId) => this.onVehicleChange(vehicleId));

    this.form.controls.currency.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((currency) => this.onSimulationCurrencyChange(currency));

    this.form.controls.exchangeRateUsdPen.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateVehiclePriceBySelectedCurrency());

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.result.set(null));
  }

  protected ratePeriodLabel(period: RatePeriodType): string {
    switch (period) {
      case 'MENSUAL':
        return 'Mensual';
      case 'TRIMESTRAL':
        return 'Trimestral';
      case 'CUATRIMESTRAL':
        return 'Cuatrimestral';
      case 'SEMESTRAL':
        return 'Semestral';
      case 'ANUAL':
        return 'Anual';
    }
  }

  protected capitalizationLabel(capitalization: CapitalizationType): string {
    switch (capitalization) {
      case 'DIARIA':
        return 'Diaria';
      case 'QUINCENAL':
        return 'Quincenal';
      case 'MENSUAL':
        return 'Mensual';
      case 'BIMESTRAL':
        return 'Bimestral';
      case 'TRIMESTRAL':
        return 'Trimestral';
      case 'CUATRIMESTRAL':
        return 'Cuatrimestral';
      case 'SEMESTRAL':
        return 'Semestral';
      case 'ANUAL':
        return 'Anual';
    }
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private buildInsuranceGroup(type: InsuranceType): InsuranceLineGroup {
    return this.fb.nonNullable.group({
      insuranceTypeId: type.id,
      name: type.name,
      baseCalculo:
        type.baseCalculo ?? this.mapInsuranceBaseCalculationToLegacy(type.baseCalculation),
      monthlyRate: type.monthlyRate,
      applies: type.mandatory,

      rateValue: type.rateValue,
      ratePeriod: type.ratePeriod,
      baseCalculation: type.baseCalculation,
    });
  }

  private onVehicleChange(vehicleId: string): void {
    const vehicle = this.vehicleStore.getVehicleById(vehicleId)();

    if (!vehicle) {
      return;
    }

    const catalog = this.vehicleStore.getCurrencyCatalogById(vehicle.currencyCatalogId)();
    const originalCurrency = ((catalog?.currency as CurrencyCode) ?? 'PEN') as CurrencyCode;

    this.selectedVehicleOriginalPrice.set(vehicle.price);
    this.selectedVehicleOriginalCurrency.set(originalCurrency);
    this.lastSelectedSimulationCurrency.set(originalCurrency);

    this.form.patchValue({
      currencyCatalogId: vehicle.currencyCatalogId,
      currency: originalCurrency,
    });

    this.updateVehiclePriceBySelectedCurrency();
  }

  private onSimulationCurrencyChange(targetCurrency: CurrencyCode): void {
    const fromCurrency = this.lastSelectedSimulationCurrency();

    if (fromCurrency === targetCurrency) {
      this.updateVehiclePriceBySelectedCurrency();
      return;
    }

    const exchangeRate = Number(this.form.controls.exchangeRateUsdPen.value ?? 0);

    if (exchangeRate <= 0) {
      return;
    }

    this.convertCurrentMonetaryInputs(fromCurrency, targetCurrency, exchangeRate);
    this.lastSelectedSimulationCurrency.set(targetCurrency);

    /**
     * El precio del vehículo se recalcula desde el precio original del vehículo,
     * no desde el valor actual, para evitar arrastre de redondeos.
     */
    this.updateVehiclePriceBySelectedCurrency();
  }

  private convertCurrentMonetaryInputs(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    exchangeRateUsdPen: number,
  ): void {
    if (fromCurrency === toCurrency) {
      return;
    }

    const convertAmount = (amount: number): number =>
      this.roundMoney(this.convertCurrency(amount, fromCurrency, toCurrency, exchangeRateUsdPen));

    this.form.controls.gps.setValue(convertAmount(Number(this.form.controls.gps.value ?? 0)), {
      emitEvent: false,
    });

    this.form.controls.portes.setValue(
      convertAmount(Number(this.form.controls.portes.value ?? 0)),
      { emitEvent: false },
    );

    this.form.controls.administrativeExpenses.setValue(
      convertAmount(Number(this.form.controls.administrativeExpenses.value ?? 0)),
      { emitEvent: false },
    );

    this.additionalExpenses.controls.forEach((group) => {
      /**
       * Solo se convierten montos fijos.
       * Si más adelante usas gastos porcentuales, esos no deben convertirse.
       */
      if (group.controls.amountType.value !== 'FIXED') {
        return;
      }

      group.controls.amount.setValue(convertAmount(Number(group.controls.amount.value ?? 0)), {
        emitEvent: false,
      });
    });

    this.result.set(null);
  }

  private updateVehiclePriceBySelectedCurrency(): void {
    const originalPrice = this.selectedVehicleOriginalPrice();
    const originalCurrency = this.selectedVehicleOriginalCurrency();

    if (originalPrice <= 0) {
      return;
    }

    const targetCurrency = this.form.controls.currency.value;
    const exchangeRate = Number(this.form.controls.exchangeRateUsdPen.value ?? 0);

    if (exchangeRate <= 0) {
      return;
    }

    const convertedPrice = this.convertCurrency(
      originalPrice,
      originalCurrency,
      targetCurrency,
      exchangeRate,
    );

    this.form.controls.vehiclePrice.setValue(this.roundMoney(convertedPrice));
  }

  private convertCurrency(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    exchangeRateUsdPen: number,
  ): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    if (fromCurrency === 'PEN' && toCurrency === 'USD') {
      return amount / exchangeRateUsdPen;
    }

    if (fromCurrency === 'USD' && toCurrency === 'PEN') {
      return amount * exchangeRateUsdPen;
    }

    return amount;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  addExpense(): void {
    this.additionalExpenses.push(
      this.fb.nonNullable.group({
        concept: ['', Validators.required],
        type: ['PERIODICO' as AdditionalExpenseType, Validators.required],
        amount: [0, [Validators.required, Validators.min(0)]],
        installmentStart: [1, [Validators.required, Validators.min(1)]],
        installmentEnd: [1, [Validators.required, Validators.min(1)]],
        description: [''],

        expenseStage: ['PERIODIC' as ExpenseStage, Validators.required],
        paymentBehavior: ['PAID_IN_INSTALLMENT' as ExpensePaymentBehavior, Validators.required],
        amountType: ['FIXED' as ExpenseAmountType, Validators.required],
        rateValue: [0, [Validators.min(0)]],
        baseCalculation: ['FIXED_AMOUNT' as ExpenseBaseCalculation, Validators.required],
      }),
    );
  }

  addInitialFinancedExpense(): void {
    this.additionalExpenses.push(
      this.fb.nonNullable.group({
        concept: ['Gasto inicial financiado', Validators.required],
        type: ['UNICO' as AdditionalExpenseType, Validators.required],
        amount: [0, [Validators.required, Validators.min(0)]],
        installmentStart: [1, [Validators.required, Validators.min(1)]],
        installmentEnd: [1, [Validators.required, Validators.min(1)]],
        description: [''],

        expenseStage: ['INITIAL' as ExpenseStage, Validators.required],
        paymentBehavior: ['FINANCED' as ExpensePaymentBehavior, Validators.required],
        amountType: ['FIXED' as ExpenseAmountType, Validators.required],
        rateValue: [0, [Validators.min(0)]],
        baseCalculation: ['FIXED_AMOUNT' as ExpenseBaseCalculation, Validators.required],
      }),
    );
  }

  removeExpense(index: number): void {
    this.additionalExpenses.removeAt(index);
  }

  onExpenseStageChange(group: ExpenseGroup): void {
    const stage = group.controls.expenseStage.value;

    if (stage === 'INITIAL') {
      group.controls.type.setValue('UNICO');
      group.controls.paymentBehavior.setValue('FINANCED');
      group.controls.installmentStart.setValue(1);
      group.controls.installmentEnd.setValue(1);

      this.clearPeriodErrors(group);
      return;
    }

    group.controls.type.setValue('PERIODICO');
    group.controls.paymentBehavior.setValue('PAID_IN_INSTALLMENT');

    const currentStart = group.controls.installmentStart.value;
    const currentEnd = group.controls.installmentEnd.value;

    group.controls.installmentStart.setValue(currentStart >= 1 ? currentStart : 1);
    group.controls.installmentEnd.setValue(currentEnd > 1 ? currentEnd : this.maxExpensePeriod());

    this.validateExpensePeriods();
  }

  protected maxExpensePeriod(): number {
    const term = Number(this.form.controls.termMonths.value ?? 0);

    return Math.max(term + 1, 1);
  }

  protected expenseBehaviorLabel(group: ExpenseGroup): string {
    return group.controls.paymentBehavior.value === 'FINANCED' ? 'Financiado' : 'Pagado en cuota';
  }

  protected validateExpensePeriods(): boolean {
    let isValid = true;
    const maxPeriod = this.maxExpensePeriod();

    this.additionalExpenses.controls.forEach((group) => {
      const stage = group.controls.expenseStage.value;

      this.enforceExpenseBehavior(group);
      this.clearPeriodErrors(group);

      if (stage !== 'PERIODIC') {
        return;
      }

      const start = Number(group.controls.installmentStart.value);
      const end = Number(group.controls.installmentEnd.value);

      if (!start || start < 1) {
        this.setControlError(group.controls.installmentStart, 'invalidStartPeriod', true);
        isValid = false;
      }

      if (!end || end < start) {
        this.setControlError(group.controls.installmentEnd, 'invalidEndPeriod', true);
        isValid = false;
      }

      if (end > maxPeriod) {
        this.setControlError(group.controls.installmentEnd, 'maxExpensePeriodExceeded', true);
        isValid = false;
      }
    });

    return isValid;
  }

  private enforceExpenseBehavior(group: ExpenseGroup): void {
    const stage = group.controls.expenseStage.value;

    if (stage === 'INITIAL') {
      group.controls.type.setValue('UNICO', { emitEvent: false });
      group.controls.paymentBehavior.setValue('FINANCED', { emitEvent: false });
      group.controls.installmentStart.setValue(1, { emitEvent: false });
      group.controls.installmentEnd.setValue(1, { emitEvent: false });
      return;
    }

    group.controls.type.setValue('PERIODICO', { emitEvent: false });
    group.controls.paymentBehavior.setValue('PAID_IN_INSTALLMENT', { emitEvent: false });
  }

  private clearPeriodErrors(group: ExpenseGroup): void {
    this.setControlError(group.controls.installmentStart, 'invalidStartPeriod', false);
    this.setControlError(group.controls.installmentEnd, 'invalidEndPeriod', false);
    this.setControlError(group.controls.installmentEnd, 'maxExpensePeriodExceeded', false);
  }

  private setControlError(control: FormControl<number>, errorKey: string, enabled: boolean): void {
    const errors = { ...(control.errors ?? {}) };

    if (enabled) {
      errors[errorKey] = true;
    } else {
      delete errors[errorKey];
    }

    control.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  private buildInput(): CreditSimulationInput {
    const value = this.form.getRawValue();

    const desgravamen = this.findInsuranceLine(value.insuranceLines, [
      'desgravamen',
      'desgravámen',
    ]);

    const riskInsurance = this.findInsuranceLine(value.insuranceLines, [
      'vehicular',
      'riesgo',
      'vsv',
      'vsvi',
    ]);

    const additionalExpenses = value.additionalExpenses.map((expense) => ({
      concept: expense.concept,
      amount: expense.amount,
      expenseStage: expense.expenseStage,
      paymentBehavior: expense.paymentBehavior,
      amountType: expense.amountType,
      rateValue: expense.rateValue,
      baseCalculation: expense.baseCalculation,
      installmentStart: expense.expenseStage === 'INITIAL' ? null : expense.installmentStart,
      installmentEnd: expense.expenseStage === 'INITIAL' ? null : expense.installmentEnd,
      description: expense.description,
    }));

    return {
      vehiclePrice: value.vehiclePrice,
      initialFeePercentage: value.initialFeePercentage,
      termMonths: value.termMonths,

      finalQuotaPercentage: value.finalQuotaPercentage,
      futureValuePercentage: value.finalQuotaPercentage,

      rateType: value.rateType,
      interestRate: value.interestRate,
      ratePeriod: value.ratePeriod,
      capitalization: value.rateType === 'NOMINAL' ? value.capitalization : null,

      paymentFrequencyDays: value.paymentFrequencyDays,
      daysPerYear: value.daysPerYear,

      totalGracePeriods: value.totalGracePeriods,
      partialGracePeriods: value.partialGracePeriods,

      desgravamenRatePercent: desgravamen?.applies ? desgravamen.rateValue : 0,
      desgravamenMonthlyRatePercent: desgravamen?.applies ? desgravamen.rateValue : 0,

      riskInsuranceAnnualRatePercent: riskInsurance?.applies ? riskInsurance.rateValue : 0,
      vehicularMonthlyRatePercent: riskInsurance?.applies ? riskInsurance.rateValue : 0,

      gps: value.gps,
      portes: value.portes,
      administrativeExpenses: value.administrativeExpenses,

      expenses: additionalExpenses,

      opportunityTeaPercent: value.opportunityTeaPercent || value.interestRate,
    };
  }

  private findInsuranceLine(
    lines: ReturnType<typeof this.form.getRawValue>['insuranceLines'],
    keywords: string[],
  ) {
    return lines.find((line) => {
      const normalizedName = line.name.toLowerCase();

      return keywords.some((keyword) => normalizedName.includes(keyword));
    });
  }

  simulate(): void {
    if (!this.validateExpensePeriods() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.result.set(this.store.simulate(this.buildInput()));
    } catch (error) {
      this.result.set(null);
      console.error(error);
    }
  }

  save(): void {
    const result = this.result();

    if (!result || !this.validateExpensePeriods() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const currentUser = this.iamStore.currentUser();

    if (!currentUser) {
      return;
    }

    this.store.saveSimulation({
      clientId: value.clientId,
      vehicleId: value.vehicleId,
      userId: currentUser.id,

      currency: value.currency,
      currencyCatalogId: value.currencyCatalogId || null,
      exchangeRateUsdPen: value.exchangeRateUsdPen,

      disbursementDate: value.disbursementDate,

      input: this.buildInput(),
      result,

      insuranceLines: value.insuranceLines.map((line) => ({
        insuranceTypeId: line.insuranceTypeId,

        monthlyRate: line.monthlyRate,
        baseCalculo: line.baseCalculo,

        applies: line.applies,

        nameSnapshot: line.name,
        rateValue: line.rateValue,
        ratePeriod: line.ratePeriod,
        baseCalculation: line.baseCalculation,
      })),

      additionalExpenses: value.additionalExpenses.map((expense) => ({
        concept: expense.concept,
        type: expense.type,
        amount: expense.amount,

        installmentStart: expense.expenseStage === 'INITIAL' ? null : expense.installmentStart,
        installmentEnd: expense.expenseStage === 'INITIAL' ? null : expense.installmentEnd,
        description: expense.description,

        expenseStage: expense.expenseStage,
        paymentBehavior: expense.paymentBehavior,
        amountType: expense.amountType,
        rateValue: expense.rateValue,
        baseCalculation: expense.baseCalculation,
      })),
    });

    this.router.navigate(['/simulations']);
  }

  periodLabelKey(periodType: PeriodType): string {
    switch (periodType) {
      case 'GRACIA_PARCIAL':
        return 'simulation.period-gracia-parcial';
      case 'GRACIA_TOTAL':
        return 'simulation.period-gracia-total';
      default:
        return 'simulation.period-normal';
    }
  }
  pgLabel(periodType: PeriodType, cashFlowType: string): string {
    if (cashFlowType === 'BALLOON') {
      return 'S';
    }

    switch (periodType) {
      case 'GRACIA_TOTAL':
        return 'T';
      case 'GRACIA_PARCIAL':
        return 'P';
      default:
        return 'S';
    }
  }

  excelInitialBalance(period: {
    initialRegularBalance: number;
    initialFinalQuotaBalance: number;
  }): number {
    return period.initialRegularBalance + period.initialFinalQuotaBalance;
  }

  excelInterest(period: { regularInterest: number; finalQuotaInterest: number }): number {
    return period.regularInterest + period.finalQuotaInterest;
  }

  excelDesgravamen(period: { regularDesgravamen: number; finalQuotaDesgravamen: number }): number {
    return period.regularDesgravamen + period.finalQuotaDesgravamen;
  }

  excelQuota(period: {
    regularQuota: number;
    balloonPayment: number;
    cashFlowType: string;
  }): number {
    if (period.cashFlowType === 'BALLOON') {
      return 0;
    }

    return period.regularQuota;
  }

  excelAmortization(period: {
    regularAmortization: number;
    finalQuotaAmortization: number;
  }): number {
    return period.regularAmortization + period.finalQuotaAmortization;
  }

  excelFinalBalance(period: {
    finalRegularBalance: number;
    finalFinalQuotaBalance: number;
  }): number {
    return period.finalRegularBalance + period.finalFinalQuotaBalance;
  }

  cashFlowTypeLabel(cashFlowType: string): string {
    return cashFlowType === 'BALLOON' ? 'Cuotón final' : 'Cuota';
  }

  private mapInsuranceBaseCalculationToLegacy(baseCalculation: InsuranceBaseCalculation): string {
    switch (baseCalculation) {
      case 'VEHICLE_PRICE':
        return 'VEHICULO';
      case 'LOAN_AMOUNT':
        return 'MONTO_FINANCIADO';
      case 'FIXED_AMOUNT':
        return 'FIJO';
      case 'FINAL_QUOTA_BALANCE':
      case 'REGULAR_BALANCE':
      default:
        return 'SALDO';
    }
  }
}
