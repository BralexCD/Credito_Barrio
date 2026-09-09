import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import {
  InsuranceBaseCalculation,
  InsuranceRatePeriod,
  InsuranceType,
} from '../domain/model/insurance-type.entity';
import { InsuranceTypeResource, InsuranceTypesResponse } from './insurance-types-response';

export class InsuranceTypeAssembler implements BaseAssembler<
  InsuranceType,
  InsuranceTypeResource,
  InsuranceTypesResponse
> {
  toEntityFromResource(resource: InsuranceTypeResource): InsuranceType {
    const baseCalculation = this.normalizeBaseCalculation(
      resource.base_calculation,
      resource.base_calculo,
    );

    return new InsuranceType({
      id: resource.id,
      name: resource.name,
      description: resource.description,
      baseCalculo: resource.base_calculo,
      monthlyRate: resource.tasa_mensual,
      mandatory: resource.mandatory,
      status: resource.status,

      rateValue: resource.rate_value ?? resource.tasa_mensual,
      ratePeriod: (resource.rate_period ?? 'PERIODIC') as InsuranceRatePeriod,
      baseCalculation,
    });
  }

  toResourceFromEntity(entity: InsuranceType): InsuranceTypeResource {
    const baseCalculation = this.normalizeBaseCalculation(
      entity.baseCalculation,
      entity.baseCalculo,
    );

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,

      base_calculo: entity.baseCalculo ?? this.mapBaseCalculationToLegacy(baseCalculation),
      tasa_mensual: entity.monthlyRate,

      mandatory: entity.mandatory,
      status: entity.status,

      rate_value: entity.rateValue,
      rate_period: entity.ratePeriod,
      base_calculation: baseCalculation,
    };
  }

  toEntitiesFromResponse(response: InsuranceTypesResponse): InsuranceType[] {
    return response.insurance_types.map((resource) => this.toEntityFromResource(resource));
  }

  private normalizeBaseCalculation(
    baseCalculation?: string | null,
    legacyBaseCalculo?: string | null,
  ): InsuranceBaseCalculation {
    const normalized = (baseCalculation ?? '').trim().toUpperCase();

    if (
      normalized === 'REGULAR_BALANCE' ||
      normalized === 'FINAL_QUOTA_BALANCE' ||
      normalized === 'VEHICLE_PRICE' ||
      normalized === 'LOAN_AMOUNT' ||
      normalized === 'FIXED_AMOUNT'
    ) {
      return normalized as InsuranceBaseCalculation;
    }

    return this.mapLegacyBaseCalculation(legacyBaseCalculo);
  }

  private mapLegacyBaseCalculation(baseCalculo?: string | null): InsuranceBaseCalculation {
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

  private mapBaseCalculationToLegacy(baseCalculation: InsuranceBaseCalculation): string {
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
