/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { startOfToday } from 'date-fns';
import { graphql, HttpResponse } from 'msw';
import { Route } from 'react-router-dom';

import AppView from './AppView';
import { RemindersManager } from '../../components/RemindersManager';
import { RANDOM_PLACEHOLDER_TIMEOUT, ROUTES, TASKS_ROUTE } from '../../constants';
import { EMPTY_DISPLAYER_HINT, ICON_REGEXP, TEST_ID_SELECTOR, TIMERS } from '../../constants/tests';
import {
	FindTasksDocument,
	type FindTasksQuery,
	type FindTasksQueryVariables,
	GetTaskDocument,
	type GetTaskQuery,
	type GetTaskQueryVariables
} from '../../gql/types';
import server from '../../mocks/server';
import { populateTask, populateTaskList } from '../../mocks/utils';
import { makeListItemsVisible, setup } from '../../utils/testUtils';

describe('App view', () => {
	function showDisplayerPlaceholder(): void {
		act(() => {
			jest.advanceTimersByTime(RANDOM_PLACEHOLDER_TIMEOUT);
		});
	}

	test('Show tasks view', async () => {
		const tasks = populateTaskList(10);
		const findTasksRequest = jest.fn();
		server.use(
			graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, () => {
				findTasksRequest();
				return HttpResponse.json({
					data: {
						findTasks: tasks
					}
				});
			})
		);

		setup(<AppView />);
		await screen.findByText(/all tasks/i);
		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
		showDisplayerPlaceholder();
		makeListItemsVisible();
		expect(screen.getByText(/all tasks/i)).toBeVisible();
		expect(screen.getByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
		expect(screen.getByText(tasks[0].title)).toBeVisible();
		expect(screen.getByText(tasks[tasks.length - 1].title)).toBeVisible();
	});

	test('Open displayer on click on an item', async () => {
		const tasks = populateTaskList();
		const task = tasks[tasks.length - 1];
		const findTasksRequest = jest.fn();
		server.use(
			graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, () => {
				findTasksRequest();
				return HttpResponse.json({
					data: {
						findTasks: tasks
					}
				});
			}),
			graphql.query<GetTaskQuery, GetTaskQueryVariables>('getTask', ({ variables }) => {
				const { taskId } = variables;
				const taskResult = tasks.find((item) => item.id === taskId);
				return HttpResponse.json({ data: { getTask: taskResult || null } });
			})
		);
		const { user } = setup(<AppView />);
		await screen.findByText(/all tasks/i);
		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
		showDisplayerPlaceholder();
		makeListItemsVisible();
		expect(screen.getByText(/all tasks/i)).toBeVisible();
		expect(screen.getByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
		expect(screen.getByText(task.title)).toBeVisible();
		await user.click(screen.getByText(task.title));
		await screen.findByText(/creation date/i);
		expect(screen.queryByText(EMPTY_DISPLAYER_HINT)).not.toBeInTheDocument();
		expect(screen.getAllByText(task.title)).toHaveLength(2);
	});

	test('List item is highlighted when and only when it is opened in the displayer', async () => {
		const task = populateTask();
		const findTasksRequest = jest.fn();
		server.use(
			graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, () => {
				findTasksRequest();
				return HttpResponse.json({ data: { findTasks: [task] } });
			})
		);
		const { getByRoleWithIcon, user } = setup(<AppView />, {
			initialRouterEntries: [`/${task.id}`]
		});
		await screen.findByText(/all tasks/i);
		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
		makeListItemsVisible();
		await waitFor(() => expect(screen.getAllByText(task.title)).toHaveLength(2));
		expect(screen.getByTestId(TEST_ID_SELECTOR.listItem)).toHaveStyleRule('background', '#d5e3f6');
		await user.click(getByRoleWithIcon('button', { icon: ICON_REGEXP.closeDisplayer }));
		expect(screen.getByTestId(TEST_ID_SELECTOR.listItem)).toHaveStyleRule('background', '#ffffff');
	});

	describe('Reminders', () => {
		const AppViewWithRemindersManager = (): React.JSX.Element => (
			<>
				<Route path={`/${TASKS_ROUTE}${ROUTES.task}`}>
					<RemindersManager />
				</Route>
				<Route path={`/:module?`}>
					<AppView />
				</Route>
			</>
		);
		test('Show modal of reminders on load if there is at least one reminder to show', async () => {
			const tasks = populateTaskList();
			tasks[0].reminderAt = faker.date.between({ from: startOfToday(), to: Date.now() }).getTime();
			const findTasksRequest = jest.fn();
			server.use(
				graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, () => {
					findTasksRequest();
					return HttpResponse.json({
						data: {
							findTasks: tasks
						}
					});
				})
			);

			setup(
				<Route path={`/${TASKS_ROUTE}`}>
					<RemindersManager />
					<AppView />
				</Route>,
				{
					initialRouterEntries: [`/${TASKS_ROUTE}`]
				}
			);

			await screen.findByText(/all tasks/i);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
			await screen.findByText(/tasks reminders/i);
			act(() => {
				// advance timers to make modal content visible
				jest.advanceTimersByTime(TIMERS.modal.delayOpen);
			});
			expect(
				within(screen.getByTestId(TEST_ID_SELECTOR.modal)).getByText(tasks[0].title)
			).toBeVisible();
		});

		test('When a reminder is completed from the reminders modal, the item remains in the list when the modal is closed with dismiss button', async () => {
			const tasks = populateTaskList(10, { reminderAt: null });
			// set reminder only for one item
			tasks[0].reminderAt = faker.date.between({ from: startOfToday(), to: Date.now() }).getTime();
			const findTasksRequest = jest.fn();
			server.use(
				graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, () => {
					findTasksRequest();
					return HttpResponse.json({
						data: {
							findTasks: tasks
						}
					});
				})
			);

			const { getByRoleWithIcon, user } = setup(
				<Route path={`/${TASKS_ROUTE}`}>
					<RemindersManager />
					<AppView />
				</Route>,
				{
					initialRouterEntries: [`/${TASKS_ROUTE}`]
				}
			);

			await screen.findByText(/all tasks/i);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
			await screen.findByText(/tasks reminders/i);
			makeListItemsVisible();
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(2);
			await user.click(getByRoleWithIcon('button', { icon: ICON_REGEXP.reminderCompleteAction }));
			await screen.findByTestId(ICON_REGEXP.reminderComplete);
			await user.click(screen.getByRole('button', { name: /dismiss/i }));
			expect(screen.getByText(tasks[0].title)).toBeVisible();
		});

		test('When a reminder is completed and restored from the reminders modal, leave the item in the list in the same position', async () => {
			const tasks = populateTaskList(10, { reminderAt: null });
			// set reminder only for one item
			tasks[0].reminderAt = faker.date.between({ from: startOfToday(), to: Date.now() }).getTime();
			const findTasksRequest = jest.fn();
			server.use(
				graphql.query<FindTasksQuery, FindTasksQueryVariables>('findTasks', () => {
					findTasksRequest();
					return HttpResponse.json({
						data: {
							findTasks: tasks
						}
					});
				})
			);

			const { getByRoleWithIcon, user, findByRoleWithIcon } = setup(
				<AppViewWithRemindersManager />,
				{
					initialRouterEntries: [`/${TASKS_ROUTE}`]
				}
			);

			await screen.findByText(/all tasks/i);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
			await screen.findByText(/tasks reminders/i);
			makeListItemsVisible();
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(2);
			await user.click(getByRoleWithIcon('button', { icon: ICON_REGEXP.reminderCompleteAction }));
			const undoButton = await findByRoleWithIcon('button', {
				icon: ICON_REGEXP.reminderUndoAction
			});
			await user.click(undoButton);
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.reminderComplete));
			await user.click(screen.getByRole('button', { name: /dismiss/i }));
			expect(screen.getByText(tasks[0].title)).toBeVisible();
			expect(
				within(screen.getAllByTestId(TEST_ID_SELECTOR.listItemContent)[0]).getByText(tasks[0].title)
			).toBeVisible();
		});

		test('When a reminder is completed from the reminders modal, does not close the displayer if opened on the item', async () => {
			const tasks = populateTaskList(10, { reminderAt: null });
			// set reminder only for one item
			tasks[0].reminderAt = faker.date.between({ from: startOfToday(), to: Date.now() }).getTime();
			const findTasksRequest = jest.fn();
			server.use(
				graphql.query<FindTasksQuery, FindTasksQueryVariables>('findTasks', () => {
					findTasksRequest();
					return HttpResponse.json({
						data: {
							findTasks: tasks
						}
					});
				}),
				graphql.query<GetTaskQuery, GetTaskQueryVariables>(GetTaskDocument, () =>
					HttpResponse.json({ data: { getTask: tasks[0] } })
				)
			);

			const { getByRoleWithIcon, user } = setup(<AppViewWithRemindersManager />, {
				initialRouterEntries: [`/${TASKS_ROUTE}/${tasks[0].id}`]
			});

			await screen.findByText(/all tasks/i);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
			await screen.findByText(/tasks reminders/i);
			makeListItemsVisible();
			await screen.findByText(/creation date/i);
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(3);
			await user.click(getByRoleWithIcon('button', { icon: ICON_REGEXP.reminderCompleteAction }));
			await within(screen.getByTestId('modal')).findByTestId(ICON_REGEXP.reminderComplete);
			await user.click(screen.getByRole('button', { name: /dismiss/i }));
			showDisplayerPlaceholder();
			expect(screen.queryByText(EMPTY_DISPLAYER_HINT)).not.toBeInTheDocument();
			expect(screen.getByText(/creation date/i)).toBeVisible();
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(2);
		});

		test('When a reminder is completed from the reminders modal, does not close the displayer if opened on another item', async () => {
			const tasks = populateTaskList(10, { reminderAt: null });
			// set reminder only for one item
			tasks[0].reminderAt = faker.date.between({ from: startOfToday(), to: Date.now() }).getTime();
			const findTasksRequest = jest.fn();
			server.use(
				graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, () => {
					findTasksRequest();
					return HttpResponse.json({
						data: {
							findTasks: tasks
						}
					});
				})
			);

			const { getByRoleWithIcon, user } = setup(<AppViewWithRemindersManager />, {
				initialRouterEntries: [`/${TASKS_ROUTE}/${tasks[1].id}`]
			});
			await screen.findByText(/all tasks/i);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
			await screen.findByText(/tasks reminders/i);
			makeListItemsVisible();
			await screen.findByText(/creation date/i);
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(2);
			expect(screen.getAllByText(tasks[1].title)).toHaveLength(2);
			await user.click(getByRoleWithIcon('button', { icon: ICON_REGEXP.reminderCompleteAction }));
			await screen.findByTestId(ICON_REGEXP.reminderComplete);
			await user.click(screen.getByRole('button', { name: /dismiss/i }));
			showDisplayerPlaceholder();
			expect(screen.queryByText(EMPTY_DISPLAYER_HINT)).not.toBeInTheDocument();
			expect(screen.getByText(/creation date/i)).toBeVisible();
			expect(screen.getAllByText(tasks[1].title)).toHaveLength(2);
		});

		test('When a reminder is completed and restored from the reminders modal, leave the displayer open if opened on the item', async () => {
			const tasks = populateTaskList(10, { reminderAt: null });
			// set reminder only for one item
			tasks[0].reminderAt = faker.date.between({ from: startOfToday(), to: Date.now() }).getTime();
			const findTasksRequest = jest.fn();
			server.use(
				graphql.query<FindTasksQuery, FindTasksQueryVariables>(FindTasksDocument, () => {
					findTasksRequest();
					return HttpResponse.json({
						data: {
							findTasks: tasks
						}
					});
				})
			);

			const { findByRoleWithIcon, getByRoleWithIcon, user } = setup(
				<AppViewWithRemindersManager />,
				{
					initialRouterEntries: [`/${TASKS_ROUTE}/${tasks[0].id}`]
				}
			);

			await screen.findByText(/all tasks/i);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			await waitFor(() => expect(findTasksRequest).toHaveBeenCalled());
			await screen.findByText(/tasks reminders/i);
			makeListItemsVisible();
			await screen.findByText(/creation date/i);
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(3);
			await user.click(getByRoleWithIcon('button', { icon: ICON_REGEXP.reminderCompleteAction }));
			const undoButton = await findByRoleWithIcon('button', {
				icon: ICON_REGEXP.reminderUndoAction
			});
			await user.click(undoButton);
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.reminderComplete));
			await user.click(screen.getByRole('button', { name: /dismiss/i }));
			showDisplayerPlaceholder();
			expect(screen.queryByText(EMPTY_DISPLAYER_HINT)).not.toBeInTheDocument();
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(2);
			expect(screen.getByText(/creation date/i)).toBeVisible();
		});
	});
});
