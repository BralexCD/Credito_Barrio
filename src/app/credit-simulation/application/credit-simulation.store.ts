import { computed, effect, Injectable, Signal, signal } from '@angular/core';
import { forkJoin, of, retry, switchMap } from 'rxjs';
import { CreditSimulationApi } from '../infrastructure/credit-simulation-api';
import {
  CreditSimulationInput,
  CreditSimulationResult,
  CreditSimulationService,
} from '../domain/services/credit-simulation.service';
import { CurrencyCode, Simulation } from '../domain/model/simulation.entity';
import { PaymentScheduleEntry } from '../domain/model/payment-schedule-entry.entity';
import { InsuranceSimulation } from '../domain/model/insurance-simulation.entity';
import {
  AdditionalExpense,
  AdditionalExpenseType,
} from '../domain/model/additional-expense.entity';
import {
  InsuranceType,
  InsuranceBaseCalculation,
  InsuranceRatePeriod,
} from '../domain/model/insurance-type.entity';
import { Setting } from '../domain/model/setting.entity';
import {
  ExpenseAmountType,
  ExpenseBaseCalculation,
  ExpensePaymentBehavior,
  ExpenseStage,
  GraceType,
} from '../domain/model/credit-simulation.types';
import { IamStore } from '../../iam/application/iam.store';

export interface InsuranceLineInput {
  insuranceTypeId: string;

  /**
   * Legacy fields.
   */
  monthlyRate?: number | null;
  baseCalculo?: string | null;

  applies: boolean;

  /**
   * Snapshot fields.
   */
  nameSnapshot?: string | null;
  rateValue?: number | null;
  ratePeriod?: InsuranceRatePeriod | null;
  baseCalculation?: InsuranceBaseCalculation | null;
}

export interface AdditionalExpenseInput {
  concept: string;
  type?: AdditionalExpenseType;
  amount: number;

  installmentStart?: number | null;
  installmentEnd?: number | null;
  description?: string | null;

  expenseStage?: ExpenseStage;
  paymentBehavior?: ExpensePaymentBehavior;
  amountType?: ExpenseAmountType;
  rateValue?: number | null;
  baseCalculation?: ExpenseBaseCalculation | null;
}

export interface SaveSimulationParams {
  clientId: string;
  vehicleId: string;

  /**
   * Optional for compatibility.
   * If omitted, the store uses the authenticated user.
   */
  userId?: string;

  currency: CurrencyCode;
  currencyCatalogId?: string | null;
  exchangeRateUsdPen?: number | null;

  disbursementDate: string;

  input: CreditSimulationInput;
  result: CreditSimulationResult;

  insuranceLines?: InsuranceLineInput[];
  additionalExpenses?: AdditionalExpenseInput[];
}

/**
 * Application store for Compra Inteligente credit simulations.
 *
 * Responsibilities:
 * - Run pure financial simulation.
 * - Load simulations visible to the authenticated user.
 * - Persist simulation header + payment schedule + insurances + expenses.
 */
@Injectable({ providedIn: 'root' })
export class CreditSimulationStore {
  private readonly simulationsSignal = signal<Simulation[]>([]);
  readonly simulations = this.simulationsSignal.asReadonly();

  private readonly paymentScheduleSignal = signal<PaymentScheduleEntry[]>([]);
  readonly paymentSchedule = this.paymentScheduleSignal.asReadonly();

  private readonly insuranceSimulationsSignal = signal<InsuranceSimulation[]>([]);
  readonly insuranceSimulations = this.insuranceSimulationsSignal.asReadonly();

  private readonly additionalExpensesSignal = signal<AdditionalExpense[]>([]);
  readonly additionalExpenses = this.additionalExpensesSignal.asReadonly();

  private readonly insuranceTypesSignal = signal<InsuranceType[]>([]);
  readonly insuranceTypes = this.insuranceTypesSignal.asReadonly();

  private readonly settingsSignal = signal<Setting[]>([]);
  readonly settings = this.settingsSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  readonly simulationsCount = computed(() => this.simulations().length);

  constructor(
    private readonly creditSimulationApi: CreditSimulationApi,
    private readonly iamStore: IamStore,
  ) {
    effect(() => {
      const user = this.iamStore.currentUser();

      if (!user) {
        this.clearState();
        return;
      }

      this.loadAll();
    });
  }

  private clearState(): void {
    this.simulationsSignal.set([]);
    this.paymentScheduleSignal.set([]);
    this.insuranceSimulationsSignal.set([]);
    this.additionalExpensesSignal.set([]);
    this.insuranceTypesSignal.set([]);
    this.settingsSignal.set([]);
    this.errorSignal.set(null);
    this.loadingSignal.set(false);
  }

  private formatError(error: any, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  private getAuthenticatedUser() {
    return this.iamStore.currentUser();
  }

  private isAdmin(roleName: string): boolean {
    return roleName.trim().toUpperCase() === 'ADMIN';
  }

  private filterSimulationsByCurrentUser(simulations: Simulation[]): Simulation[] {
    const user = this.getAuthenticatedUser();

    if (!user) {
      return [];
    }

    if (this.isAdmin(user.roleName)) {
      return simulations;
    }

    return simulations.filter((simulation) => simulation.userId === user.id);
  }

  private getVisibleSimulationIds(): Set<string> {
    return new Set(this.simulationsSignal().map((simulation) => simulation.id));
  }

  private filterPaymentScheduleByVisibleSimulations(
    entries: PaymentScheduleEntry[],
  ): PaymentScheduleEntry[] {
    const simulationIds = this.getVisibleSimulationIds();

    return entries.filter((entry) => simulationIds.has(entry.simulationId));
  }

  private filterInsuranceSimulationsByVisibleSimulations(
    lines: InsuranceSimulation[],
  ): InsuranceSimulation[] {
    const simulationIds = this.getVisibleSimulationIds();

    return lines.filter((line) => simulationIds.has(line.simulationId));
  }

  private filterAdditionalExpensesByVisibleSimulations(
    expenses: AdditionalExpense[],
  ): AdditionalExpense[] {
    const simulationIds = this.getVisibleSimulationIds();

    return expenses.filter((expense) => simulationIds.has(expense.simulationId));
  }

  loadAll(): void {
    const user = this.getAuthenticatedUser();

    if (!user) {
      this.clearState();
      return;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.creditSimulationApi
      .loadBundleForUser(user.id, user.roleName)
      .pipe(retry(2))
      .subscribe({
        next: (bundle) => {
          this.simulationsSignal.set(this.filterSimulationsByCurrentUser(bundle.simulations));
          this.paymentScheduleSignal.set(
            this.filterPaymentScheduleByVisibleSimulations(bundle.paymentSchedule),
          );
          this.insuranceSimulationsSignal.set(
            this.filterInsuranceSimulationsByVisibleSimulations(bundle.insuranceSimulations),
          );
          this.additionalExpensesSignal.set(
            this.filterAdditionalExpensesByVisibleSimulations(bundle.additionalExpenses),
          );
          this.insuranceTypesSignal.set(bundle.insuranceTypes);
          this.settingsSignal.set(bundle.settings);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'No se pudieron cargar las simulaciones.'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Runs the pure Compra Inteligente calculation without persisting anything.
   */
  simulate(input: CreditSimulationInput): CreditSimulationResult {
    return CreditSimulationService.simulate(input);
  }

  getSimulationById(id: string): Signal<Simulation | undefined> {
    return computed(() => this.simulations().find((simulation) => simulation.id === id));
  }

  getScheduleBySimulationId(simulationId: string): Signal<PaymentScheduleEntry[]> {
    return computed(() =>
      this.paymentSchedule()
        .filter((entry) => entry.simulationId === simulationId)
        .sort((a, b) => a.installmentNumber - b.installmentNumber),
    );
  }

  getInsuranceSimulationsBySimulationId(simulationId: string): Signal<InsuranceSimulation[]> {
    return computed(() =>
      this.insuranceSimulations().filter((line) => line.simulationId === simulationId),
    );
  }

  getAdditionalExpensesBySimulationId(simulationId: string): Signal<AdditionalExpense[]> {
    return computed(() =>
      this.additionalExpenses().filter((expense) => expense.simulationId === simulationId),
    );
  }

  getSettingByUserId(userId: string): Signal<Setting | undefined> {
    return computed(() => this.settings().find((setting) => setting.userId === userId));
  }

  getCurrentUserSetting(): Signal<Setting | undefined> {
    return computed(() => {
      const user = this.getAuthenticatedUser();

      if (!user) {
        return undefined;
      }

      return this.settings().find((setting) => setting.userId === user.id);
    });
  }

  /**
   * Persists a simulation together with:
   * - payment schedule
   * - insurance snapshots
   * - additional expenses
   */
  saveSimulation(params: SaveSimulationParams): void {
    const user = this.getAuthenticatedUser();

    if (!user && !params.userId) {
      this.errorSignal.set('No hay un usuario autenticado para guardar la simulación.');
      return;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const userId = params.userId ?? user!.id;
    const simulation = this.buildSimulation(userId, params);

    this.creditSimulationApi
      .createSimulation(simulation)
      .pipe(
        retry(2),
        switchMap((createdSimulation) => {
          const scheduleEntries = this.buildScheduleEntries(createdSimulation, params);
          const insuranceLines = this.buildInsuranceSimulations(createdSimulation, params);
          const expenses = this.buildAdditionalExpenses(createdSimulation, params);

          return forkJoin({
            simulation: of(createdSimulation),
            schedule: this.creditSimulationApi.createPaymentScheduleEntries(scheduleEntries),
            insuranceLines: this.creditSimulationApi.createInsuranceSimulations(insuranceLines),
            expenses: this.creditSimulationApi.createAdditionalExpenses(expenses),
          });
        }),
      )
      .subscribe({
        next: () => {
          this.loadAll();
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'No se pudo guardar la simulación.'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Deletes a simulation and all its dependent rows.
   *
   * This is done manually because your current database may not have
   * ON DELETE CASCADE configured for all dependent tables.
   */
  deleteSimulation(id: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    forkJoin({
      schedule: this.creditSimulationApi.deletePaymentScheduleBySimulationId(id),
      insuranceLines: this.creditSimulationApi.deleteInsuranceSimulationsBySimulationId(id),
      expenses: this.creditSimulationApi.deleteAdditionalExpensesBySimulationId(id),
    })
      .pipe(switchMap(() => this.creditSimulationApi.deleteSimulation(id)))
      .subscribe({
        next: () => {
          this.simulationsSignal.update((simulations) =>
            simulations.filter((simulation) => simulation.id !== id),
          );

          this.paymentScheduleSignal.update((entries) =>
            entries.filter((entry) => entry.simulationId !== id),
          );

          this.insuranceSimulationsSignal.update((lines) =>
            lines.filter((line) => line.simulationId !== id),
          );

          this.additionalExpensesSignal.update((expenses) =>
            expenses.filter((expense) => expense.simulationId !== id),
          );

          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'No se pudo eliminar la simulación.'));
          this.loadingSignal.set(false);
        },
      });
  }

  private buildSimulation(userId: string, params: SaveSimulationParams): Simulation {
    const input = params.input;
    const result = params.result;

    const totalGracePeriods =
      input.totalGracePeriods ?? (input.graceType === 'TOTAL' ? (input.gracePeriods ?? 0) : 0);

    const partialGracePeriods =
      input.partialGracePeriods ?? (input.graceType === 'PARCIAL' ? (input.gracePeriods ?? 0) : 0);

    const legacyGraceType = this.resolveLegacyGraceType(totalGracePeriods, partialGracePeriods);
    const legacyGracePeriod = totalGracePeriods + partialGracePeriods;

    const paymentFrequencyDays = input.paymentFrequencyDays ?? 30;
    const daysPerYear = input.daysPerYear ?? 360;
    const installmentsPerYear = daysPerYear / paymentFrequencyDays;

    const finalQuotaPercentage = input.finalQuotaPercentage ?? input.futureValuePercentage ?? 0;

    const opportunityRate = input.opportunityTeaPercent ?? input.interestRate;

    return new Simulation({
      id: '',
      clientId: params.clientId,
      vehicleId: params.vehicleId,
      userId,

      vehiclePrice: input.vehiclePrice,
      currency: params.currency,
      currencyCatalogId: params.currencyCatalogId ?? null,
      exchangeRateUsdPen: params.exchangeRateUsdPen ?? 1,

      initialFeePercentage: input.initialFeePercentage,
      initialFeeAmount: result.initialFeeAmount,

      /**
       * Keep legacy and new loan fields aligned.
       */
      financedAmount: result.loanAmount,
      loanAmount: result.loanAmount,
      initialCostsFinanced: result.initialCostsFinanced,

      termMonths: input.termMonths,

      /**
       * Keep legacy future value and new final quota fields aligned.
       */
      futureValuePercentage: finalQuotaPercentage,
      futureValueAmount: result.finalQuotaAmount,
      finalQuotaPercentage,
      finalQuotaAmount: result.finalQuotaAmount,
      presentValueFinalQuota: result.presentValueFinalQuota,
      regularFinancedBalance: result.regularFinancedBalance,

      rateType: input.rateType,
      interestRate: input.interestRate,
      capitalization: input.capitalization ?? null,

      monthlyEffectiveRate: result.periodEffectiveRate,
      annualEffectiveRate: result.annualEffectiveRate,

      /**
       * Legacy grace fields.
       */
      graceType: legacyGraceType,
      gracePeriod: legacyGracePeriod,

      /**
       * New grace fields.
       */
      totalGracePeriods,
      partialGracePeriods,

      portes: input.portes ?? 0,

      baseQuota: result.regularQuota,
      regularQuota: result.regularQuota,

      opportunityRate,
      opportunityPeriodRate: result.opportunityPeriodRate,
      paymentFrequencyDays,
      daysPerYear,
      installmentsPerYear,

      tcea: result.tcea,
      van: result.van,
      tir: result.tir,

      disbursementDate: params.disbursementDate,
      registrationDate: new Date().toISOString(),
    });
  }

  private resolveLegacyGraceType(
    totalGracePeriods: number,
    partialGracePeriods: number,
  ): GraceType {
    if (totalGracePeriods > 0) {
      return 'TOTAL';
    }

    if (partialGracePeriods > 0) {
      return 'PARCIAL';
    }

    return 'NINGUNA';
  }

  private buildScheduleEntries(
    simulation: Simulation,
    params: SaveSimulationParams,
  ): PaymentScheduleEntry[] {
    const paymentFrequencyDays = params.input.paymentFrequencyDays ?? 30;

    return params.result.schedule.map((period) => {
      const paymentDate = this.addDays(
        params.disbursementDate,
        period.installmentNumber * paymentFrequencyDays,
      );

      const initialBalance = period.initialRegularBalance + period.initialFinalQuotaBalance;
      const interest = period.regularInterest + period.finalQuotaInterest;
      const amortization = period.regularAmortization + period.finalQuotaAmortization;
      const totalInsurance =
        period.regularDesgravamen + period.finalQuotaDesgravamen + period.riskInsurance;
      const finalBalance = period.finalRegularBalance + period.finalFinalQuotaBalance;

      return new PaymentScheduleEntry({
        id: '',
        simulationId: simulation.id,
        installmentNumber: period.installmentNumber,
        paymentDate,
        periodType: period.periodType,

        /**
         * Legacy summary fields.
         */
        initialBalance,
        interest,
        amortization,
        totalInsurance,
        portes: period.portes,
        otherExpenses: period.otherExpenses,
        totalPayment: period.totalPayment,
        finalBalance,
        cashFlow: period.cashFlow,

        /**
         * New Excel-aligned fields.
         */
        cashFlowType: period.cashFlowType,

        initialFinalQuotaBalance: period.initialFinalQuotaBalance,
        finalQuotaInterest: period.finalQuotaInterest,
        finalQuotaAmortization: period.finalQuotaAmortization,
        finalQuotaDesgravamen: period.finalQuotaDesgravamen,
        finalFinalQuotaBalance: period.finalFinalQuotaBalance,

        initialRegularBalance: period.initialRegularBalance,
        regularInterest: period.regularInterest,
        regularQuota: period.regularQuota,
        regularAmortization: period.regularAmortization,
        regularDesgravamen: period.regularDesgravamen,
        finalRegularBalance: period.finalRegularBalance,

        riskInsurance: period.riskInsurance,
        gps: period.gps,
        administrativeExpenses: period.administrativeExpenses,
        balloonPayment: period.balloonPayment,
      });
    });
  }

  private buildInsuranceSimulations(
    simulation: Simulation,
    params: SaveSimulationParams,
  ): InsuranceSimulation[] {
    const insuranceLines = params.insuranceLines ?? [];

    return insuranceLines.map(
      (line) =>
        new InsuranceSimulation({
          id: '',
          simulationId: simulation.id,
          insuranceTypeId: line.insuranceTypeId,

          monthlyRate: line.monthlyRate ?? line.rateValue ?? 0,
          baseCalculo:
            line.baseCalculo ?? this.mapInsuranceBaseCalculationToLegacy(line.baseCalculation),

          applies: line.applies,

          nameSnapshot: line.nameSnapshot ?? null,
          rateValue: line.rateValue ?? line.monthlyRate ?? 0,
          ratePeriod: line.ratePeriod ?? 'PERIODIC',
          baseCalculation:
            line.baseCalculation ?? this.mapLegacyInsuranceBaseCalculation(line.baseCalculo),
        }),
    );
  }

  private buildAdditionalExpenses(
    simulation: Simulation,
    params: SaveSimulationParams,
  ): AdditionalExpense[] {
    const additionalExpenses = params.additionalExpenses ?? [];

    return additionalExpenses.map((expense) => {
      const expenseStage = expense.expenseStage ?? 'PERIODIC';
      const paymentBehavior = expense.paymentBehavior ?? 'PAID_IN_INSTALLMENT';

      const type: AdditionalExpenseType =
        expense.type ?? (expenseStage === 'INITIAL' ? 'UNICO' : 'PERIODICO');

      return new AdditionalExpense({
        id: '',
        simulationId: simulation.id,
        concept: expense.concept,
        type,
        amount: expense.amount,
        installmentStart: expense.installmentStart ?? null,
        installmentEnd: expense.installmentEnd ?? null,
        description: expense.description ?? null,

        expenseStage,
        paymentBehavior,
        amountType: expense.amountType ?? 'FIXED',
        rateValue: expense.rateValue ?? null,
        baseCalculation: expense.baseCalculation ?? 'FIXED_AMOUNT',
      });
    });
  }

  private mapInsuranceBaseCalculationToLegacy(
    baseCalculation?: InsuranceBaseCalculation | null,
  ): string {
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

  private mapLegacyInsuranceBaseCalculation(baseCalculo?: string | null): InsuranceBaseCalculation {
    const normalized = (baseCalculo ?? '').trim().toUpperCase();

    if (normalized === 'VEHICULO') {
      return 'VEHICLE_PRICE';
    }

    if (normalized === 'MONTO_FINANCIADO') {
      return 'LOAN_AMOUNT';
    }

    if (normalized === 'FIJO') {
      return 'FIXED_AMOUNT';
    }

    return 'REGULAR_BALANCE';
  }

  /**
   * The course model uses ordinary months of 30 days.
   */
  private addDays(isoDate: string, days: number): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
  }
}
