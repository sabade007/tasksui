/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { type GraphQLResponseResolver, HttpResponse } from 'msw';

import { type FindTasksQuery, type FindTasksQueryVariables } from '../../gql/types';
import { populateTaskList } from '../utils';

const handler: GraphQLResponseResolver<FindTasksQuery, FindTasksQueryVariables> = () => {
	const tasks = populateTaskList();
	return HttpResponse.json({
		data: {
			findTasks: tasks
		}
	});
};

export default handler;
