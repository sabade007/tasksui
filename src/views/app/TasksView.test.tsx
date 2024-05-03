/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act, screen, waitFor, within } from '@testing-library/react';
import * as shell from '@zextras/carbonio-shell-ui';
import { find } from 'lodash';
import { Route } from 'react-router-dom';

import { TasksView } from './TasksView';
import { RANDOM_PLACEHOLDER_TIMEOUT, ROUTES } from '../../constants';
import {
	EMPTY_DISPLAYER_HINT,
	EMPTY_LIST_HINT,
	ICON_REGEXP,
	TEST_ID_SELECTOR
} from '../../constants/tests';
import { Status } from '../../gql/types';
import {
	mockFindTasks,
	mockGetTask,
	mockTrashTask,
	mockUpdateTaskStatus,
	populateTaskList
} from '../../mocks/utils';
import { formatDateFromTimestamp } from '../../utils';
import { makeListItemsVisible, setup } from '../../utils/testUtils';

describe('Task view', () => {
	test('Show the empty list and the empty displayer if there is no task', async () => {
		const findTasksMock = mockFindTasks({}, []);
		const mocks = [findTasksMock];
		setup(
			<Route path={ROUTES.task}>
				<TasksView />
			</Route>,
			{ mocks }
		);
		await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
		await screen.findByText(EMPTY_LIST_HINT);
		await screen.findByText(EMPTY_DISPLAYER_HINT);
		expect(screen.getByText(/all tasks/i)).toBeVisible();
		expect(screen.getByText(EMPTY_LIST_HINT)).toBeVisible();
		expect(screen.getByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
	});

	test('Show the task list and the empty displayer', async () => {
		const tasks = populateTaskList();
		const findTasksMock = mockFindTasks({}, tasks);
		const mocks = [findTasksMock];
		setup(
			<Route path={ROUTES.task}>
				<TasksView />
			</Route>,
			{ mocks }
		);
		await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
		makeListItemsVisible();
		await screen.findByText(tasks[0].title);
		await screen.findByText(EMPTY_DISPLAYER_HINT);
		expect(screen.getByText(/all tasks/i)).toBeVisible();
		expect(screen.queryByText(EMPTY_LIST_HINT)).not.toBeInTheDocument();
		expect(screen.getByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
		expect(screen.getByText(tasks[0].title)).toBeVisible();
		expect(screen.getByText(tasks[tasks.length - 1].title)).toBeVisible();
	});

	test('Click on a list item open the displayer for that item', async () => {
		const tasks = populateTaskList();
		const task = tasks[0];
		task.reminderAt = faker.date.anytime().getTime();
		task.description = faker.lorem.sentences();
		const findTasksMock = mockFindTasks({}, tasks);
		const mocks = [findTasksMock, mockGetTask({ taskId: task.id }, task)];

		const { findByRoleWithIcon, user } = setup(
			<Route path={ROUTES.task}>
				<TasksView />
			</Route>,
			{
				mocks
			}
		);
		await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
		makeListItemsVisible();
		await screen.findByText(task.title);
		await screen.findByText(EMPTY_DISPLAYER_HINT);
		await user.click(screen.getByText(task.title));
		await findByRoleWithIcon('button', { icon: ICON_REGEXP.closeDisplayer });
		expect(screen.getAllByText(task.title)).toHaveLength(2);
		expect(screen.getByText(/creation date/i)).toBeVisible();
		expect(
			screen.getByText(
				formatDateFromTimestamp(task.createdAt, {
					includeTime: false
				})
			)
		).toBeVisible();
		expect(screen.getByText(/description/i)).toBeVisible();
		expect(screen.getByText(task.description)).toBeVisible();
		expect(screen.getByText(/priority/i)).toBeVisible();
		expect(screen.getByText(RegExp(task.priority, 'i'))).toBeVisible();
		expect(screen.getByText(/reminder/i)).toBeVisible();
		expect(
			screen.getAllByText(
				formatDateFromTimestamp(task.reminderAt, {
					includeTime: task.reminderAllDay !== true
				})
			)
		).toHaveLength(2);
	});

	test('Click on close action close the displayer', async () => {
		const tasks = populateTaskList();
		const task = tasks[0];
		task.reminderAt = faker.date.anytime().getTime();
		task.description = faker.lorem.sentences();
		const findTasksMock = mockFindTasks({}, tasks);
		const mocks = [findTasksMock, mockGetTask({ taskId: task.id }, task)];

		const { getByRoleWithIcon, queryByRoleWithIcon, user } = setup(
			<Route path={ROUTES.task}>
				<TasksView />
			</Route>,
			{
				mocks,
				initialRouterEntries: [`/${task.id}`]
			}
		);
		await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
		makeListItemsVisible();
		await screen.findAllByText(task.title);
		expect(screen.queryByText(EMPTY_DISPLAYER_HINT)).not.toBeInTheDocument();
		const closeButton = getByRoleWithIcon('button', { icon: ICON_REGEXP.closeDisplayer });
		expect(closeButton).toBeVisible();
		expect(closeButton).toBeEnabled();
		await user.click(closeButton);
		await screen.findByText(EMPTY_DISPLAYER_HINT);
		// title is shown only 1 time, inside the list
		expect(screen.getByText(task.title)).toBeVisible();
		expect(
			queryByRoleWithIcon('button', { icon: ICON_REGEXP.closeDisplayer })
		).not.toBeInTheDocument();
	});

	describe('Complete action', () => {
		test('Displayer action does not remove the item from the list', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.reminderAt = faker.date.anytime().getTime();
			task.description = faker.lorem.sentences();
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [
				findTasksMock,
				mockGetTask({ taskId: task.id }, task),
				mockUpdateTaskStatus({ id: task.id, status: Status.Complete })
			];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks,
					initialRouterEntries: [`/${task.id}`]
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findAllByText(task.title);
			const action = screen.getByRole('button', { name: /complete/i });
			await user.click(action);
			expect(within(screen.getByTestId('main-list')).getByText(task.title)).toBeVisible();
		});

		test('Hover action does not remove the item from the list', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.reminderAt = faker.date.anytime().getTime();
			task.description = faker.lorem.sentences();
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [
				findTasksMock,
				mockGetTask({ taskId: task.id }, task),
				mockUpdateTaskStatus({ id: task.id, status: Status.Complete })
			];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks,
					initialRouterEntries: [`/${task.id}`]
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findAllByText(task.title);
			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.completeAction);
			await user.click(action);
			expect(within(screen.getByTestId('main-list')).getByText(task.title)).toBeVisible();
		});

		test('Contextual menu action does not remove the item from the list', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.reminderAt = faker.date.anytime().getTime();
			task.description = faker.lorem.sentences();
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [
				findTasksMock,
				mockGetTask({ taskId: task.id }, task),
				mockUpdateTaskStatus({ id: task.id, status: Status.Complete })
			];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks,
					initialRouterEntries: [`/${task.id}`]
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findAllByText(task.title);
			const listItem = find(
				screen.getAllByTestId(TEST_ID_SELECTOR.listItemContent),
				(item) => within(item).queryByText(task.title) !== null
			);
			expect(listItem).toBeDefined();
			await user.rightClick(listItem as HTMLElement);
			const contextualMenu = await screen.findByTestId(TEST_ID_SELECTOR.dropdown);
			const action = within(contextualMenu).getByText(/complete/i);
			await user.click(action);
			expect(within(screen.getByTestId('main-list')).getByText(task.title)).toBeVisible();
		});

		test('Show a snackbar', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [findTasksMock, mockUpdateTaskStatus({ id: task.id, status: Status.Complete })];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findByText(task.title);
			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.completeAction);
			await user.click(action);
			expect(screen.getByText(/Task ".+" completed/i)).toBeVisible();
		});

		test('Show the title cropped inside the snackbar if longer than 50 chars', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.title = faker.string.sample(60);
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [findTasksMock, mockUpdateTaskStatus({ id: task.id, status: Status.Complete })];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findByText(task.title);
			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.completeAction);
			await user.click(action);
			expect(screen.getByText(`Task "${task.title.substring(0, 50)}..." completed`)).toBeVisible();
		});

		test('Show the entire title inside the snackbar if shorter than 50 chars', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.title = faker.string.sample(50);
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [findTasksMock, mockUpdateTaskStatus({ id: task.id, status: Status.Complete })];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findByText(task.title);
			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.completeAction);
			await user.click(action);
			expect(screen.getByText(`Task "${task.title}" completed`)).toBeVisible();
		});
	});

	describe('Delete action', () => {
		test('Displayer action remove the item from the list and close the displayer', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.reminderAt = faker.date.anytime().getTime();
			task.description = faker.lorem.sentences();
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [
				findTasksMock,
				mockGetTask({ taskId: task.id }, task),
				mockTrashTask({ taskId: task.id })
			];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks,
					initialRouterEntries: [`/${task.id}`]
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findAllByText(task.title);
			const action = screen.getByRole('button', { name: /delete/i });
			await user.click(action);
			const confirmButton = await screen.findByRole('button', { name: /^delete permanently/i });
			await user.click(confirmButton);
			await screen.findByText(EMPTY_DISPLAYER_HINT);
			expect(screen.getByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
			expect(screen.queryByText(task.title)).not.toBeInTheDocument();
			expect(screen.getByText(tasks[1].title)).toBeVisible();
		});

		test('Hover action remove the item from the list and close the displayer', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.reminderAt = faker.date.anytime().getTime();
			task.description = faker.lorem.sentences();
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [
				findTasksMock,
				mockGetTask({ taskId: task.id }, task),
				mockTrashTask({ taskId: task.id })
			];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks,
					initialRouterEntries: [`/${task.id}`]
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findAllByText(task.title);
			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.deleteAction);
			await user.click(action);
			const confirmButton = await screen.findByRole('button', { name: /^delete permanently/i });
			await user.click(confirmButton);
			await screen.findByText(EMPTY_DISPLAYER_HINT);
			expect(screen.getByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
			expect(screen.queryByText(task.title)).not.toBeInTheDocument();
			expect(screen.getByText(tasks[1].title)).toBeVisible();
		});

		test('Hover action does not close the displayer if opened in another item', async () => {
			const tasks = populateTaskList();
			tasks[0].reminderAt = faker.date.anytime().getTime();
			tasks[0].description = faker.lorem.sentences();
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [
				findTasksMock,
				mockGetTask({ taskId: tasks[0].id }, tasks[0]),
				mockTrashTask({ taskId: tasks[1].id })
			];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks,
					initialRouterEntries: [`/${tasks[0].id}`]
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findAllByText(tasks[0].title);
			const action = within(screen.getByTestId(tasks[1].id)).getByTestId(ICON_REGEXP.deleteAction);
			await user.click(action);
			const confirmButton = await screen.findByRole('button', { name: /^delete permanently/i });
			await user.click(confirmButton);
			act(() => {
				jest.advanceTimersByTime(RANDOM_PLACEHOLDER_TIMEOUT);
			});
			expect(screen.queryByText(tasks[1].title)).not.toBeInTheDocument();
			expect(screen.queryByText(EMPTY_DISPLAYER_HINT)).not.toBeInTheDocument();
			expect(screen.getByText(/creation date/i)).toBeVisible();
			expect(screen.getAllByText(tasks[0].title)).toHaveLength(2);
		});

		test('Contextual menu action remove the item from the list and close the displayer', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			task.reminderAt = faker.date.anytime().getTime();
			task.description = faker.lorem.sentences();
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [
				findTasksMock,
				mockGetTask({ taskId: task.id }, task),
				mockTrashTask({ taskId: task.id })
			];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks,
					initialRouterEntries: [`/${task.id}`]
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findAllByText(task.title);
			const listItem = find(
				screen.getAllByTestId(TEST_ID_SELECTOR.listItemContent),
				(item) => within(item).queryByText(task.title) !== null
			);
			expect(listItem).toBeDefined();
			await user.rightClick(listItem as HTMLElement);
			const contextualMenu = await screen.findByTestId(TEST_ID_SELECTOR.dropdown);
			const action = within(contextualMenu).getByText(/^delete/i);
			await user.click(action);
			const confirmButton = await screen.findByRole('button', { name: /^delete permanently/i });
			await user.click(confirmButton);
			await screen.findByText(EMPTY_DISPLAYER_HINT);
			expect(screen.getByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
			expect(screen.queryByText(task.title)).not.toBeInTheDocument();
			expect(screen.getByText(tasks[1].title)).toBeVisible();
		});

		test('Show a snackbar', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];
			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [findTasksMock, mockTrashTask({ taskId: task.id })];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findByText(task.title);
			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.deleteAction);
			await user.click(action);
			const confirmButton = await screen.findByRole('button', { name: /^delete permanently/i });
			await user.click(confirmButton);
			expect(screen.getByText('Task permanently deleted')).toBeVisible();
		});

		test('Close edit board if open when task is deleted', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];

			jest.spyOn(shell, 'getBoardById').mockReturnValue({
				id: `edit-task-${task.id}`,
				url: '',
				app: '',
				icon: '',
				title: ''
			});
			const closeBoardSpy = jest.spyOn(shell, 'closeBoard');

			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [findTasksMock, mockTrashTask({ taskId: task.id })];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findByText(task.title);

			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.deleteAction);
			await user.click(action);
			const confirmButton = await screen.findByRole('button', { name: /^delete permanently/i });
			await user.click(confirmButton);
			expect(screen.getByText('Task permanently deleted')).toBeVisible();
			expect(closeBoardSpy).toHaveBeenCalledWith(`edit-task-${task.id}`);
		});

		test('Should not close edit board if not open when task is deleted', async () => {
			const tasks = populateTaskList();
			const task = tasks[0];

			jest.spyOn(shell, 'getBoardById').mockReturnValue(undefined);
			const closeBoardSpy = jest.spyOn(shell, 'closeBoard');

			const findTasksMock = mockFindTasks({}, tasks);
			const mocks = [findTasksMock, mockTrashTask({ taskId: task.id })];

			const { user } = setup(
				<Route path={ROUTES.task}>
					<TasksView />
				</Route>,
				{
					mocks
				}
			);
			await waitFor(() => expect(findTasksMock.result).toHaveBeenCalled());
			makeListItemsVisible();
			await screen.findByText(task.title);

			const action = within(screen.getByTestId(task.id)).getByTestId(ICON_REGEXP.deleteAction);
			await user.click(action);
			const confirmButton = await screen.findByRole('button', { name: /^delete permanently/i });
			await user.click(confirmButton);
			expect(screen.getByText('Task permanently deleted')).toBeVisible();
			expect(closeBoardSpy).not.toHaveBeenCalled();
		});
	});
});
