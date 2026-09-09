import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { CashFlowType, PeriodType } from '../domain/model/credit-simulation.types';
import { PaymentScheduleEntry } from '../domain/model/payment-schedule-entry.entity';
import { PaymentScheduleResource, PaymentScheduleResponse } from './payment-schedule-response';

export class PaymentScheduleAssembler implements BaseAssembler<
  PaymentScheduleEntry,
  PaymentScheduleResource,
  PaymentScheduleResponse
> {
  toEntityFromResource(resource: PaymentScheduleResource): PaymentScheduleEntry {
    return new PaymentScheduleEntry({
      id: resource.id,
      simulationId: resource.simulation_id,
      installmentNumber: resource.installment_number,
      paymentDate: resource.payment_date,
      periodType: resource.period_type as PeriodType,

      initialBalance: resource.initial_balance,
      interest: resource.interest,
      amortization: resource.amortization,
      totalInsurance: resource.total_insurance,
      portes: resource.portes,
      otherExpenses: resource.other_expenses,
      totalPayment: resource.total_payment,
      finalBalance: resource.final_balance,
      cashFlow: resource.cash_flow,

      cashFlowType: (resource.cash_flow_type ?? 'INSTALLMENT') as CashFlowType,

      initialFinalQuotaBalance: resource.initial_final_quota_balance ?? 0,
      finalQuotaInterest: resource.final_quota_interest ?? 0,
      finalQuotaAmortization: resource.final_quota_amortization ?? 0,
      finalQuotaDesgravamen: resource.final_quota_desgravamen ?? 0,
      finalFinalQuotaBalance: resource.final_final_quota_balance ?? 0,

      initialRegularBalance: resource.initial_regular_balance ?? resource.initial_balance,
      regularInterest: resource.regular_interest ?? resource.interest,
      regularQuota: resource.regular_quota ?? resource.interest + resource.amortization,
      regularAmortization: resource.regular_amortization ?? resource.amortization,
      regularDesgravamen: resource.regular_desgravamen ?? resource.total_insurance,
      finalRegularBalance: resource.final_regular_balance ?? resource.final_balance,

      riskInsurance: resource.risk_insurance ?? 0,
      gps: resource.gps ?? 0,
      administrativeExpenses: resource.administrative_expenses ?? 0,
      balloonPayment: resource.balloon_payment ?? 0,
    });
  }

  toResourceFromEntity(entity: PaymentScheduleEntry): PaymentScheduleResource {
    return {
      id: entity.id,
      simulation_id: entity.simulationId,
      installment_number: entity.installmentNumber,
      payment_date: entity.paymentDate,
      period_type: entity.periodType,

      initial_balance: entity.initialBalance,
      interest: entity.interest,
      amortization: entity.amortization,
      total_insurance: entity.totalInsurance,
      portes: entity.portes,
      other_expenses: entity.otherExpenses,
      total_payment: entity.totalPayment,
      final_balance: entity.finalBalance,
      cash_flow: entity.cashFlow,

      cash_flow_type: entity.cashFlowType,

      initial_final_quota_balance: entity.initialFinalQuotaBalance,
      final_quota_interest: entity.finalQuotaInterest,
      final_quota_amortization: entity.finalQuotaAmortization,
      final_quota_desgravamen: entity.finalQuotaDesgravamen,
      final_final_quota_balance: entity.finalFinalQuotaBalance,

      initial_regular_balance: entity.initialRegularBalance,
      regular_interest: entity.regularInterest,
      regular_quota: entity.regularQuota,
      regular_amortization: entity.regularAmortization,
      regular_desgravamen: entity.regularDesgravamen,
      final_regular_balance: entity.finalRegularBalance,

      risk_insurance: entity.riskInsurance,
      gps: entity.gps,
      administrative_expenses: entity.administrativeExpenses,
      balloon_payment: entity.balloonPayment,
    };
  }

  toEntitiesFromResponse(response: PaymentScheduleResponse): PaymentScheduleEntry[] {
    return response.payment_schedule.map((resource) => this.toEntityFromResource(resource));
  }
}
