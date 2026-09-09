/**
 * Base entity contract for all domain entities.
 *
 * @remarks
 * In Domain-Driven Design, an entity has a unique identity that persists
 * throughout its lifecycle. Every domain entity implements this interface so
 * it can be uniquely identified within its bounded context.
 *
 * The identifier is a `string` to match the persistence layer (json-server),
 * whose seed records and foreign keys use string ids (e.g. `"1"`).
 */
export interface BaseEntity {
  /**
   * Unique identifier for this entity. Immutable across its lifecycle.
   */
  id: string;
}