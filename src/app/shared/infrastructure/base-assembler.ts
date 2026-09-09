import {BaseEntity} from '../domain/model/base-entity';
import {BaseResource, BaseResponse} from './base-response';

/**
 * Assembler contract for converting between domain and infrastructure layers.
 *
 * @remarks
 * In Domain-Driven Design, an Assembler converts between domain entities and
 * infrastructure resources, keeping the domain layer decoupled from external
 * representations (API formats, serialization, wire protocol).
 *
 * It handles three transformations:
 * - Resource -> Entity: deserialize a single API resource.
 * - Entity -> Resource: serialize a domain entity for an API request.
 * - Response -> Entities: deserialize a collection envelope.
 *
 * @typeParam TEntity - The domain entity type.
 * @typeParam TResource - The infrastructure resource type.
 * @typeParam TResponse - The API response envelope type.
 */
export interface BaseAssembler<
  TEntity extends BaseEntity,
  TResource extends BaseResource,
  TResponse extends BaseResponse
> {
  /**
   * Converts an infrastructure resource into a domain entity.
   * @param resource - The resource to convert.
   * @returns The constructed domain entity.
   */
  toEntityFromResource(resource: TResource): TEntity;

  /**
   * Converts a domain entity into an infrastructure resource.
   * @param entity - The entity to convert.
   * @returns The resource representation for API communication.
   */
  toResourceFromEntity(entity: TEntity): TResource;

  /**
   * Converts a response envelope into an array of domain entities.
   * @param response - The API response containing the resource collection.
   * @returns The domain entities extracted from the response.
   */
  toEntitiesFromResponse(response: TResponse): TEntity[];
}