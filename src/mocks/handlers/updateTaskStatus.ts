/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { type GraphQLResponseResolver, HttpResponse } from 'msw';

import {
	type UpdateTaskStatusMutation,
	type UpdateTaskStatusMutationVariables
} from '../../gql/types';

const handler: GraphQLResponseResolver<
	UpdateTaskStatusMutation,
	UpdateTaskStatusMutationVariables
> = ({ variables }) => {
	const { id, status } = variables;
	return HttpResponse.json({
		data: {
			updateTask: {
				id,
				status,
				__typename: 'Task'
			}
		}
	});
};

export default handler;
