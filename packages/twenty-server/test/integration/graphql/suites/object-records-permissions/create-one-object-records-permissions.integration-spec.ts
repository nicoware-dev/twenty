import { randomUUID } from 'node:crypto';

import { PERSON_GQL_FIELDS } from 'test/integration/constants/person-gql-fields.constants';
import { createOneOperationFactory } from 'test/integration/graphql/utils/create-one-operation-factory.util';
import { makeGraphqlAPIRequestWithGuestRole } from 'test/integration/graphql/utils/make-graphql-api-request-with-guest-role.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { updateFeatureFlagFactory } from 'test/integration/graphql/utils/update-feature-flag-factory.util';

import { SEED_APPLE_WORKSPACE_ID } from 'src/database/typeorm-seeds/core/workspaces';
import { ErrorCode } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { PermissionsExceptionMessage } from 'src/engine/metadata-modules/permissions/permissions.exception';

describe('createOneObjectRecordsPermissions', () => {
  beforeAll(async () => {
    const enablePermissionsQuery = updateFeatureFlagFactory(
      SEED_APPLE_WORKSPACE_ID,
      'IsPermissionsEnabled',
      true,
    );

    await makeGraphqlAPIRequest(enablePermissionsQuery);
  });

  afterAll(async () => {
    const disablePermissionsQuery = updateFeatureFlagFactory(
      SEED_APPLE_WORKSPACE_ID,
      'IsPermissionsEnabled',
      false,
    );

    await makeGraphqlAPIRequest(disablePermissionsQuery);
  });

  it('should throw a permission error when user does not have permission (guest role)', async () => {
    const graphqlOperation = createOneOperationFactory({
      objectMetadataSingularName: 'person',
      gqlFields: PERSON_GQL_FIELDS,
      data: {
        id: randomUUID(),
      },
    });

    const response = await makeGraphqlAPIRequestWithGuestRole(graphqlOperation);

    expect(response.body.data).toStrictEqual({ createPerson: null });
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toBe(
      PermissionsExceptionMessage.PERMISSION_DENIED,
    );
    expect(response.body.errors[0].extensions.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('should create an object record when user has permission (admin role)', async () => {
    const personId = randomUUID();
    const graphqlOperation = createOneOperationFactory({
      objectMetadataSingularName: 'person',
      gqlFields: PERSON_GQL_FIELDS,
      data: {
        id: personId,
      },
    });

    const response = await makeGraphqlAPIRequest(graphqlOperation);

    expect(response.body.data).toBeDefined();
    expect(response.body.data.createPerson).toBeDefined();
    expect(response.body.data.createPerson.id).toBe(personId);
  });
});
