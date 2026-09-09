import {BaseAssembler} from '../../shared/infrastructure/base-assembler';
import {InsuranceSimulation} from '../domain/model/insurance-simulation.entity';
import {
  InsuranceBaseCalculation,
  InsuranceRatePeriod
} from '../domain/model/insurance-type.entity';
import {
  InsuranceSimulationResource,
  InsuranceSimulationsResponse
} from './insurance-simulations-response';

export class InsuranceSimulationAssembler
  implements BaseAssembler<InsuranceSimulation, InsuranceSimulationResource, InsuranceSimulationsResponse> {

  toEntityFromResource(resource: InsuranceSimulationResource): InsuranceSimulation {
    const baseCalculation = this.normalizeBaseCalculation(
      resource.base_calculation,
      resource.base_calculo
    );

    return new InsuranceSimulation({
      id: resource.id,
      simulationId: resource.simulation_id,
      insuranceTypeId: resource.insurance_type_id ?? resource.tipo_seguro_id,

      monthlyRate: resource.tasa_mensual,
      baseCalculo: resource.base_calculo,
      applies: resource.applies,

      nameSnapshot: resource.name_snapshot ?? null,
      rateValue: resource.rate_value ?? resource.tasa_mensual,
      ratePeriod: (resource.rate_period ?? 'PERIODIC') as InsuranceRatePeriod,
      baseCalculation
    });
  }

  toResourceFromEntity(entity: InsuranceSimulation): InsuranceSimulationResource {
    const baseCalculation = this.normalizeBaseCalculation(
      entity.baseCalculation,
      entity.baseCalculo
    );

    return {
      id: entity.id,
      simulation_id: entity.simulationId,

      tipo_seguro_id: entity.insuranceTypeId,
      insurance_type_id: entity.insuranceTypeId,

      tasa_mensual: entity.monthlyRate,

      /**
       * Legacy column.
       * Here SALDO is accepted.
       */
      base_calculo: entity.baseCalculo ?? this.mapBaseCalculationToLegacy(baseCalculation),

      applies: entity.applies,

      name_snapshot: entity.nameSnapshot,
      rate_value: entity.rateValue,
      rate_period: entity.ratePeriod,

      /**
       * New column.
       * Here SALDO is NOT accepted.
       */
      base_calculation: baseCalculation
    };
  }

  toEntitiesFromResponse(response: InsuranceSimulationsResponse): InsuranceSimulation[] {
    return response.insurance_simulations.map(resource => this.toEntityFromResource(resource));
  }

  private normalizeBaseCalculation(
    baseCalculation?: string | null,
    legacyBaseCalculo?: string | null
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
