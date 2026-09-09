import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { CapitalizationType, GraceType, RateType } from '../domain/model/credit-simulation.types';
import { CurrencyCode, Simulation } from '../domain/model/simulation.entity';
import { SimulationResource, SimulationsResponse } from './simulations-response';

export class SimulationAssembler implements BaseAssembler<
  Simulation,
  SimulationResource,
  SimulationsResponse
> {
  toEntityFromResource(resource: SimulationResource): Simulation {
    return new Simulation({
      id: resource.id,
      clientId: resource.client_id,
      vehicleId: resource.vehicle_id,
      userId: resource.user_id,

      vehiclePrice: resource.vehicle_price,
      currency: resource.currency as CurrencyCode,
      currencyCatalogId: resource.currency_catalog_id ?? null,
      exchangeRateUsdPen: resource.exchange_rate_usd_pen ?? 1,

      initialFeePercentage: resource.initial_fee_percentage,
      initialFeeAmount: resource.initial_fee_amount,

      financedAmount: resource.financed_amount,
      loanAmount: resource.loan_amount ?? resource.financed_amount,
      initialCostsFinanced: resource.initial_costs_financed ?? 0,

      termMonths: resource.term_months,

      futureValuePercentage: resource.future_value_percentage,
      futureValueAmount: resource.future_value_amount,

      finalQuotaPercentage: resource.final_quota_percentage ?? resource.future_value_percentage,
      finalQuotaAmount: resource.final_quota_amount ?? resource.future_value_amount,
      presentValueFinalQuota: resource.present_value_final_quota ?? 0,
      regularFinancedBalance: resource.regular_financed_balance ?? 0,

      rateType: resource.rate_type as RateType,
      interestRate: resource.interest_rate,
      capitalization: resource.capitalization as CapitalizationType | null,

      monthlyEffectiveRate: resource.monthly_effective_rate,
      annualEffectiveRate: resource.annual_effective_rate ?? 0,

      graceType: resource.grace_type as GraceType,
      gracePeriod: resource.grace_period,

      totalGracePeriods: resource.total_grace_periods ?? undefined,
      partialGracePeriods: resource.partial_grace_periods ?? undefined,

      portes: resource.portes,

      baseQuota: resource.cuota_base ?? resource.regular_quota ?? 0,
      regularQuota: resource.regular_quota ?? resource.cuota_base ?? 0,

      opportunityRate: resource.opportunity_rate ?? 0,
      opportunityPeriodRate: resource.opportunity_period_rate ?? 0,
      paymentFrequencyDays: resource.payment_frequency_days ?? 30,
      daysPerYear: resource.days_per_year ?? 360,
      installmentsPerYear: resource.installments_per_year ?? 12,

      tcea: resource.tcea ?? 0,
      van: resource.van ?? 0,
      tir: resource.tir ?? 0,

      disbursementDate: resource.disbursement_date,
      registrationDate: resource.registration_date,
    });
  }

  toResourceFromEntity(entity: Simulation): SimulationResource {
    return {
      id: entity.id,
      client_id: entity.clientId,
      vehicle_id: entity.vehicleId,
      user_id: entity.userId,

      vehicle_price: entity.vehiclePrice,
      currency: entity.currency,
      currency_catalog_id: entity.currencyCatalogId,
      exchange_rate_usd_pen: entity.exchangeRateUsdPen,

      initial_fee_percentage: entity.initialFeePercentage,
      initial_fee_amount: entity.initialFeeAmount,

      /**
       * Keep legacy and new values aligned.
       */
      financed_amount: entity.loanAmount,
      loan_amount: entity.loanAmount,
      initial_costs_financed: entity.initialCostsFinanced,

      term_months: entity.termMonths,

      /**
       * Keep legacy and new final quota values aligned.
       */
      future_value_percentage: entity.finalQuotaPercentage,
      future_value_amount: entity.finalQuotaAmount,
      final_quota_percentage: entity.finalQuotaPercentage,
      final_quota_amount: entity.finalQuotaAmount,

      present_value_final_quota: entity.presentValueFinalQuota,
      regular_financed_balance: entity.regularFinancedBalance,

      rate_type: entity.rateType,
      interest_rate: entity.interestRate,
      capitalization: entity.capitalization,

      monthly_effective_rate: entity.monthlyEffectiveRate,
      annual_effective_rate: entity.annualEffectiveRate,

      /**
       * Legacy grace fields are still required by DB.
       */
      grace_type: entity.graceType,
      grace_period: entity.gracePeriod,

      total_grace_periods: entity.totalGracePeriods,
      partial_grace_periods: entity.partialGracePeriods,

      portes: entity.portes,

      regular_quota: entity.regularQuota,

      opportunity_rate: entity.opportunityRate,
      opportunity_period_rate: entity.opportunityPeriodRate,
      payment_frequency_days: entity.paymentFrequencyDays,
      days_per_year: entity.daysPerYear,
      installments_per_year: entity.installmentsPerYear,

      tcea: entity.tcea,
      van: entity.van,
      tir: entity.tir,

      disbursement_date: entity.disbursementDate,
      registration_date: entity.registrationDate,
    };
  }

  toEntitiesFromResponse(response: SimulationsResponse): Simulation[] {
    return response.simulations.map((resource) => this.toEntityFromResource(resource));
  }
}
