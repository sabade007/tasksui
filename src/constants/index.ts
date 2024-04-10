/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const TASKS_APP_ID = 'carbonio-tasks-ui';
export const TASKS_ROUTE = 'tasks';

// endpoint
// keep endpoint without trailing slash
export const GRAPHQL_ENDPOINT = '/services/tasks/graphql/';
export const ROUTES = {
	task: '/:taskId?'
} as const;

// misc
export const LIST_WIDTH = '40%';
export const DISPLAYER_WIDTH = '60%';
export const LIST_ITEM_HEIGHT = '4rem';
export const DATE_FORMAT = 'MMM DD, YYYY';
export const DATE_TIME_FORMAT = 'MMM DD, YYYY - HH:mm';
export const ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT = 'MMMM d, yyyy';
export const TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT = 'MMMM d, yyyy HH:mm';
export const RANDOM_PLACEHOLDER_TIMEOUT = 250;
export const TASK_TITLE_MAX_LENGTH = 1024;
export const TASK_DESCRIPTION_MAX_LENGTH = 4096;
export const MAX_TASKS_LIMIT = 200;
export const REMINDER_TIMEOUT_LIMIT = 172800000; // 48h
export const REMINDERS_INTERVAL_UPDATE = REMINDER_TIMEOUT_LIMIT - 5 * 60000; // 5 minute before all timeouts are expired
