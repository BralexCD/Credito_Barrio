import {BaseEntity} from '../domain/model/base-entity';
import {BaseResource, BaseResponse} from './base-response';
import {BaseAssembler} from './base-assembler';
import {ErrorHandlingEnabledBaseType} from './error-handling-enabled-base-type';
import {HttpClient} from '@angular/common/http';
import {catchError, map, Observable} from 'rxjs';

/**
 * Abstract base class for API endpoint clients implementing CRUD operations.
 *
 * @remarks
 * In the DDD infrastructure layer, this class encapsulates HTTP communication
 * for a specific resource type. It coordinates with an {@link BaseAssembler} to
 * convert between domain entities and infrastructure resources, and inherits
 * HTTP error translation from {@link ErrorHandlingEnabledBaseType}.
 *
 * Each concrete endpoint represents one API route and manages all HTTP
 * operations (GET, POST, PUT, DELETE) for that resource.
 *
 * @typeParam TEntity - The domain entity type this endpoint manages.
 * @typeParam TResource - The infrastructure resource type for API communication.
 * @typeParam TResponse - The API response envelope type.
 * @typeParam TAssembler - The assembler type for entity-resource conversion.
 *
 * @example
 * ```typescript
 * export class VehiclesApiEndpoint extends BaseApiEndpoint<
 *   Vehicle, VehicleResource, VehiclesResponse, VehicleAssembler
 * > {
 *   constructor(http: HttpClient) {
 *     super(http, `${environment.platformProviderApiBaseUrl}${environment.platformProviderVehiclesEndpointPath}`, new VehicleAssembler());
 *   }
 * }
 * ```
 */
export abstract class BaseApiEndpoint<
  TEntity extends BaseEntity,
  TResource extends BaseResource,
  TResponse extends BaseResponse,
  TAssembler extends BaseAssembler<TEntity, TResource, TResponse>
> extends ErrorHandlingEnabledBaseType {
  /**
   * @param http - Angular HttpClient for making HTTP requests.
   * @param endpointUrl - The base URL for this endpoint.
   * @param assembler - The assembler for entity-resource conversion.
   */
  protected constructor(
    protected http: HttpClient,
    protected endpointUrl: string,
    protected assembler: TAssembler
  ) {
    super();
  }

  /**
   * Retrieves all entities from the endpoint.
   *
   * @returns Observable emitting an array of domain entities.
   *
   * @remarks
   * Handles both shapes returned by the backend:
   * - A bare array of resources (json-server default): each element is converted.
   * - An envelope response: the assembler extracts the collection.
   */
  getAll(): Observable<TEntity[]> {
    return this.http.get<TResponse | TResource[]>(this.endpointUrl).pipe(
      map(response => Array.isArray(response)
        ? response.map(resource => this.assembler.toEntityFromResource(resource))
        : this.assembler.toEntitiesFromResponse(response as TResponse)),
      catchError(this.handleError('Failed to fetch entities'))
    );
  }

  /**
   * Retrieves a single entity by its id.
   *
   * @param id - The unique identifier of the entity to retrieve.
   * @returns Observable emitting the requested domain entity.
   */
  getById(id: string): Observable<TEntity> {
    return this.http.get<TResource>(`${this.endpointUrl}/${id}`).pipe(
      map(resource => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError(`Failed to fetch entity with id ${id}`))
    );
  }

  /**
   * Creates a new entity in the remote system.
   *
   * @param entity - The domain entity to create.
   * @returns Observable emitting the created entity with its server-assigned id.
   */
  create(entity: TEntity): Observable<TEntity> {
    const resource = this.assembler.toResourceFromEntity(entity);
    return this.http.post<TResource>(this.endpointUrl, resource).pipe(
      map(created => this.assembler.toEntityFromResource(created)),
      catchError(this.handleError('Failed to create entity'))
    );
  }

  /**
   * Updates an existing entity in the remote system.
   *
   * @param entity - The domain entity with updated values.
   * @param id - The unique identifier of the entity to update.
   * @returns Observable emitting the updated domain entity.
   */
  update(entity: TEntity, id: string): Observable<TEntity> {
    const resource = this.assembler.toResourceFromEntity(entity);
    return this.http.put<TResource>(`${this.endpointUrl}/${id}`, resource).pipe(
      map(updated => this.assembler.toEntityFromResource(updated)),
      catchError(this.handleError(`Failed to update entity with id ${id}`))
    );
  }

  /**
   * Deletes an entity from the remote system.
   *
   * @param id - The unique identifier of the entity to delete.
   * @returns Observable that completes when deletion is confirmed.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpointUrl}/${id}`).pipe(
      catchError(this.handleError(`Failed to delete entity with id ${id}`))
    );
  }
}
