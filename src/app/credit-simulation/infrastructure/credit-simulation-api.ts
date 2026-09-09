import { Injectable } from '@angular/core';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { Simulation } from '../domain/model/simulation.entity';
import { PaymentScheduleEntry } from '../domain/model/payment-schedule-entry.entity';
import { InsuranceSimulation } from '../domain/model/insurance-simulation.entity';
import { AdditionalExpense } from '../domain/model/additional-expense.entity';
import { InsuranceType } from '../domain/model/insurance-type.entity';
import { Setting } from '../domain/model/setting.entity';
import { SimulationsApiEndpoint } from './simulations-api-endpoint';
import { PaymentScheduleApiEndpoint } from './payment-schedule-api-endpoint';
import { InsuranceSimulationsApiEndpoint } from './insurance-simulations-api-endpoint';
import { AdditionalExpensesApiEndpoint } from './additional-expenses-api-endpoint';
import { InsuranceTypesApiEndpoint } from './insurance-types-api-endpoint';
import { SettingsApiEndpoint } from './settings-api-endpoint';

export interface CreditSimulationBundle {
  simulations: Simulation[];
  paymentSchedule: PaymentScheduleEntry[];
  insuranceSimulations: InsuranceSimulation[];
  additionalExpenses: AdditionalExpense[];
  insuranceTypes: InsuranceType[];
  settings: Setting[];
}

@Injectable({ providedIn: 'root' })
export class CreditSimulationApi {
  private readonly simulationsEndpoint: SimulationsApiEndpoint;
  private readonly paymentScheduleEndpoint: PaymentScheduleApiEndpoint;
  private readonly insuranceSimulationsEndpoint: InsuranceSimulationsApiEndpoint;
  private readonly additionalExpensesEndpoint: AdditionalExpensesApiEndpoint;
  private readonly insuranceTypesEndpoint: InsuranceTypesApiEndpoint;
  private readonly settingsEndpoint: SettingsApiEndpoint;

  constructor(private readonly supabaseService: SupabaseService) {
    this.simulationsEndpoint = new SimulationsApiEndpoint(this.supabaseService);
    this.paymentScheduleEndpoint = new PaymentScheduleApiEndpoint(this.supabaseService);
    this.insuranceSimulationsEndpoint = new InsuranceSimulationsApiEndpoint(this.supabaseService);
    this.additionalExpensesEndpoint = new AdditionalExpensesApiEndpoint(this.supabaseService);
    this.insuranceTypesEndpoint = new InsuranceTypesApiEndpoint(this.supabaseService);
    this.settingsEndpoint = new SettingsApiEndpoint(this.supabaseService);
  }

  loadBundleForUser(userId: string, roleName: string): Observable<CreditSimulationBundle> {
    return forkJoin({
      simulations: this.simulationsEndpoint.getAllForUser(userId, roleName),
      insuranceTypes: this.insuranceTypesEndpoint.getActive(),
      settings:
        roleName.trim().toUpperCase() === 'ADMIN'
          ? this.settingsEndpoint.getAll()
          : this.settingsEndpoint
              .getByUserId(userId)
              .pipe(switchMap((setting) => of(setting ? [setting] : []))),
    }).pipe(
      switchMap(({ simulations, insuranceTypes, settings }) => {
        const simulationIds = simulations.map((simulation) => simulation.id);

        return forkJoin({
          simulations: of(simulations),
          paymentSchedule: this.paymentScheduleEndpoint.getBySimulationIds(simulationIds),
          insuranceSimulations: this.insuranceSimulationsEndpoint.getBySimulationIds(simulationIds),
          additionalExpenses: this.additionalExpensesEndpoint.getBySimulationIds(simulationIds),
          insuranceTypes: of(insuranceTypes),
          settings: of(settings),
        });
      }),
    );
  }

  getSimulationById(id: string): Observable<Simulation> {
    return this.simulationsEndpoint.getById(id);
  }

  createSimulation(simulation: Simulation): Observable<Simulation> {
    return this.simulationsEndpoint.create(simulation);
  }

  deleteSimulation(id: string): Observable<void> {
    return this.simulationsEndpoint.delete(id);
  }

  createPaymentScheduleEntry(entry: PaymentScheduleEntry): Observable<PaymentScheduleEntry> {
    return this.paymentScheduleEndpoint.create(entry);
  }

  createPaymentScheduleEntries(
    entries: PaymentScheduleEntry[],
  ): Observable<PaymentScheduleEntry[]> {
    return this.paymentScheduleEndpoint.createMany(entries);
  }

  deletePaymentScheduleEntry(id: string): Observable<void> {
    return this.paymentScheduleEndpoint.delete(id);
  }

  deletePaymentScheduleBySimulationId(simulationId: string): Observable<void> {
    return this.paymentScheduleEndpoint.deleteBySimulationId(simulationId);
  }

  createInsuranceSimulation(
    insuranceSimulation: InsuranceSimulation,
  ): Observable<InsuranceSimulation> {
    return this.insuranceSimulationsEndpoint.create(insuranceSimulation);
  }

  createInsuranceSimulations(lines: InsuranceSimulation[]): Observable<InsuranceSimulation[]> {
    return this.insuranceSimulationsEndpoint.createMany(lines);
  }

  deleteInsuranceSimulation(id: string): Observable<void> {
    return this.insuranceSimulationsEndpoint.delete(id);
  }

  deleteInsuranceSimulationsBySimulationId(simulationId: string): Observable<void> {
    return this.insuranceSimulationsEndpoint.deleteBySimulationId(simulationId);
  }

  createAdditionalExpense(expense: AdditionalExpense): Observable<AdditionalExpense> {
    return this.additionalExpensesEndpoint.create(expense);
  }

  createAdditionalExpenses(expenses: AdditionalExpense[]): Observable<AdditionalExpense[]> {
    return this.additionalExpensesEndpoint.createMany(expenses);
  }

  deleteAdditionalExpense(id: string): Observable<void> {
    return this.additionalExpensesEndpoint.delete(id);
  }

  deleteAdditionalExpensesBySimulationId(simulationId: string): Observable<void> {
    return this.additionalExpensesEndpoint.deleteBySimulationId(simulationId);
  }

  getInsuranceTypes(): Observable<InsuranceType[]> {
    return this.insuranceTypesEndpoint.getActive();
  }

  getSettings(): Observable<Setting[]> {
    return this.settingsEndpoint.getAll();
  }

  getSettingByUserId(userId: string): Observable<Setting | null> {
    return this.settingsEndpoint.getByUserId(userId);
  }
}
