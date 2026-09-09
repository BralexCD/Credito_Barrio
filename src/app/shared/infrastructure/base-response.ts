/**
 * Base resource contract for infrastructure data models.
 *
 * @remarks
 * In DDD, a Resource is the infrastructure-level representation of a domain
 * entity used in API communication. It holds serializable data without domain
 * logic, acting as the bridge between the domain layer and external systems.
 *
 * The `id` is a `string` to match the persistence layer (json-server).
 */
export interface BaseResource {
  /**
   * Unique identifier for the resource. Maps to the entity's id.
   */
  id: string;
}

/**
 * Base response envelope contract for API collection responses.
 *
 * @remarks
 * Following DDD patterns, responses may wrap resources in an envelope.
 * Concrete responses extend this interface to declare their collection
 * property (e.g. `{ vehicles: VehicleResource[] }`).
 */
export interface BaseResponse {}