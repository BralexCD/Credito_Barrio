import {User} from '../domain/model/user.entity';
import {RoleResource, UserResource} from './users-response';

/**
 * Converts the raw `users`/`roles` resources from json-server into a {@link User} entity.
 */
export class SignInAssembler {
  toEntity(userResource: UserResource, roleResource: RoleResource): User {
    return new User({
      id: userResource.id,
      email: userResource.email,
      username: userResource.username,
      name: userResource.name,
      lastName: userResource.last_name,
      roleId: userResource.role_id,
      roleName: roleResource.name,
      enabled: userResource.enabled
    });
  }
}
