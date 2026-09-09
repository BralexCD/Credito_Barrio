import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import {
  AdditionalExpense,
  AdditionalExpenseType,
} from '../domain/model/additional-expense.entity';
import {
  ExpenseAmountType,
  ExpenseBaseCalculation,
  ExpensePaymentBehavior,
  ExpenseStage,
} from '../domain/model/credit-simulation.types';
import {
  AdditionalExpenseResource,
  AdditionalExpensesResponse,
} from './additional-expenses-response';

export class AdditionalExpenseAssembler implements BaseAssembler<
  AdditionalExpense,
  AdditionalExpenseResource,
  AdditionalExpensesResponse
> {
  toEntityFromResource(resource: AdditionalExpenseResource): AdditionalExpense {
    return new AdditionalExpense({
      id: resource.id,
      simulationId: resource.simulation_id,
      concept: resource.concept,
      type: resource.type as AdditionalExpenseType,
      amount: resource.amount,
      installmentStart: resource.installment_start,
      installmentEnd: resource.installment_end,
      description: resource.description,

      expenseStage: (resource.expense_stage ?? 'PERIODIC') as ExpenseStage,
      paymentBehavior: (resource.payment_behavior ??
        'PAID_IN_INSTALLMENT') as ExpensePaymentBehavior,
      amountType: (resource.amount_type ?? 'FIXED') as ExpenseAmountType,
      rateValue: resource.rate_value ?? null,
      baseCalculation: (resource.base_calculation ?? 'FIXED_AMOUNT') as ExpenseBaseCalculation,
    });
  }

  toResourceFromEntity(entity: AdditionalExpense): AdditionalExpenseResource {
    return {
      id: entity.id,
      simulation_id: entity.simulationId,
      concept: entity.concept,
      type: entity.type,
      amount: entity.amount,
      installment_start: entity.installmentStart,
      installment_end: entity.installmentEnd,
      description: entity.description,

      expense_stage: entity.expenseStage,
      payment_behavior: entity.paymentBehavior,
      amount_type: entity.amountType,
      rate_value: entity.rateValue,
      base_calculation: entity.baseCalculation,
    };
  }

  toEntitiesFromResponse(response: AdditionalExpensesResponse): AdditionalExpense[] {
    return response.additional_expenses.map((resource) => this.toEntityFromResource(resource));
  }
}
