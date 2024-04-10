/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { graphql, type RequestHandler } from 'msw';

import findTasks from './handlers/findTasks';
import getTask from './handlers/getTask';
import updateTask from './handlers/updateTask';
import updateTaskStatus from './handlers/updateTaskStatus';
import {
	type UpdateTaskStatusMutation,
	type UpdateTaskStatusMutationVariables,
	type FindTasksQuery,
	type FindTasksQueryVariables,
	type GetTaskQuery,
	type GetTaskQueryVariables,
	type UpdateTaskMutation,
	type UpdateTaskMutationVariables,
	FindTasksDocument,
	GetTaskDocument,
	UpdateTaskStatusDocument,
	UpdateTaskDocument
} from '../gql/types';

export const handlers: RequestHandler[] = [
	graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, findTasks),
	graphql.query<GetTaskQuery, GetTaskQueryVariables>(GetTaskDocument, getTask),
	graphql.mutation<UpdateTaskStatusMutation, UpdateTaskStatusMutationVariables>(
		UpdateTaskStatusDocument,
		updateTaskStatus
	),
	graphql.mutation<UpdateTaskMutation, UpdateTaskMutationVariables>(UpdateTaskDocument, updateTask)
];
