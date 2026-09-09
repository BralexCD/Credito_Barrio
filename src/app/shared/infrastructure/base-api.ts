/**
 * Abstract base class for infrastructure API facades.
 *
 * @remarks
 * In DDD, an infrastructure API exposes infrastructure services to the
 * application layer. Concrete facades (e.g. `VehicleApi`, `IamApi`) extend this
 * class and compose one or more {@link BaseApiEndpoint} clients, presenting a
 * clean interface to the stores in the application layer.
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class VehicleApi extends BaseApi {
 *   private readonly vehiclesEndpoint: VehiclesApiEndpoint;
 *   constructor(http: HttpClient) {
 *     super();
 *     this.vehiclesEndpoint = new VehiclesApiEndpoint(http);
 *   }
 * }
 * ```
 */
export abstract class BaseApi {
}