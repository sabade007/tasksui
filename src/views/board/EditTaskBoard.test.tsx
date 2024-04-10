/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { act, screen, waitFor } from '@testing-library/react';
import * as shell from '@zextras/carbonio-shell-ui';
import addMonths from 'date-fns/addMonths';
import getDate from 'date-fns/getDate';
import subDays from 'date-fns/subDays';
import { graphql, type GraphQLResponseResolver, HttpResponse } from 'msw';

import EditTaskBoard from './EditTaskBoard';
import { ICON_REGEXP } from '../../constants/tests';
import {
	GetTaskDocument,
	type GetTaskQuery,
	type GetTaskQueryVariables,
	Priority,
	type Task,
	UpdateTaskDocument,
	type UpdateTaskInput,
	type UpdateTaskMutation,
	type UpdateTaskMutationVariables
} from '../../gql/types';
import server from '../../mocks/server';
import { mockGetTask, mockUpdateTask, populateTask } from '../../mocks/utils';
import { setup } from '../../utils/testUtils';

type GetTaskHandler = GraphQLResponseResolver<GetTaskQuery, GetTaskQueryVariables>;
type UpdateTaskHandler = GraphQLResponseResolver<UpdateTaskMutation, UpdateTaskMutationVariables>;

describe('Edit task board', () => {
	const checkboxLabelText = /Remind me at every login throughout the day/i;
	function spyUseBoard(taskId: string): void {
		jest.spyOn(shell, 'useBoard').mockReturnValue({
			context: { taskId },
			id: '',
			url: '',
			app: '',
			icon: '',
			title: ''
		});
	}
	async function awaitEditBoardRender(): Promise<HTMLElement> {
		return screen.findByText(/details/i);
	}

	describe('Title', () => {
		test('The previous title is shown', async () => {
			const task = populateTask({ title: 'previous title' });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			expect(screen.getByRole('textbox', { name: /title/i })).toBeVisible();
			expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue(task.title);
		});

		test('When cleared the edit button is disabled', async () => {
			const task = populateTask();
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			const { user } = setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			await user.clear(screen.getByRole('textbox', { name: /title/i }));
			expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
		});

		test('Edit a task to have a new title', async () => {
			const task = populateTask({ reminderAt: null });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const newTitle = faker.string.alpha({ length: 8 });
			const updateTaskInput: UpdateTaskInput = {
				id: task.id,
				title: newTitle
			};
			const updateTaskResult: Task = {
				__typename: 'Task',
				...task,
				title: updateTaskInput.title || ''
			};
			const updateTaskMock = mockUpdateTask(updateTaskInput, updateTaskResult);
			const mocks = [getTaskMock, updateTaskMock];

			const { user, rerender } = setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const titleInput = screen.getByRole('textbox', { name: /title/i });
			await user.clear(titleInput);
			await user.type(titleInput, newTitle);

			const editButton = screen.getByRole('button', { name: /edit/i });
			await user.click(editButton);
			rerender(<EditTaskBoard />);

			expect(titleInput).toHaveValue(newTitle);
		});
	});

	describe('Priority', () => {
		test('The previous priority is shown', async () => {
			const task = populateTask({ priority: Priority.High });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			expect(screen.getByText(/priority/i)).toBeVisible();
			expect(screen.getByText(/high/i)).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.highPriority)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.mediumPriority)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.lowPriority)).not.toBeInTheDocument();
		});

		test('Edit a task to have low priority', async () => {
			const task = populateTask({ priority: Priority.High, reminderAt: null });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const updateTaskInput: UpdateTaskInput = {
				id: task.id,
				priority: Priority.Low
			};
			const updateTaskResult: Task = {
				__typename: 'Task',
				...task,
				priority: updateTaskInput.priority || Priority.Low
			};
			const updateTaskMock = mockUpdateTask(updateTaskInput, updateTaskResult);
			const mocks = [getTaskMock, updateTaskMock];

			const { user, rerender } = setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const prioritySelect = screen.getByText('Priority');
			await user.click(prioritySelect);

			const lowPriority = screen.getByText('Low');
			await user.click(lowPriority);

			const editButton = screen.getByRole('button', { name: /edit/i });
			await user.click(editButton);
			rerender(<EditTaskBoard />);

			const low = await screen.findByText(/low/i);
			expect(low).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.lowPriority)).toBeVisible();
		});
	});

	describe('Description', () => {
		test('The previous description is shown', async () => {
			const task = populateTask({ description: 'previous description' });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			expect(screen.getByRole('textbox', { name: /description/i })).toBeVisible();
			expect(screen.getByRole('textbox', { name: /description/i })).toHaveValue(task.description);
		});

		test('Is optional, if not set the edit button is enabled', async () => {
			const task = populateTask({ description: 'previous description' });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			const { user } = setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const editButton = screen.getByRole('button', { name: /edit/i });
			const descriptionInput = screen.getByRole('textbox', { name: /description/i });
			await user.clear(descriptionInput);
			expect(editButton).toBeEnabled();
		});

		test('When the limit of 4096 characters is reached the edit button is disabled and the error description appears', async () => {
			const task = populateTask({ description: null });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			const { user } = setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const editButton = screen.getByRole('button', { name: /edit/i });
			const descriptionInput = screen.getByRole('textbox', { name: /description/i });
			const maxLengthDescription = faker.string.alpha({ length: 4096 });
			await user.click(descriptionInput);
			await user.paste(maxLengthDescription);
			expect(descriptionInput).toHaveValue(maxLengthDescription);
			expect(editButton).toBeEnabled();
			expect(
				screen.queryByText(/Maximum length allowed is 4096 characters/i)
			).not.toBeInTheDocument();
			// type a character to exceed the limit
			await user.type(descriptionInput, 'a');
			await waitFor(() => expect(editButton).toBeDisabled());
			expect(screen.getByText(/Maximum length allowed is 4096 characters/i)).toBeVisible();
		});

		test('Edit a task to have a new description', async () => {
			const task = populateTask({ reminderAt: null });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const newDescription = faker.string.alpha({ length: 80 });
			const updateTaskInput: UpdateTaskInput = {
				id: task.id,
				description: newDescription
			};
			const updateTaskResult: Task = {
				__typename: 'Task',
				...task,
				description: updateTaskInput.description
			};
			const updateTaskMock = mockUpdateTask(updateTaskInput, updateTaskResult);
			const mocks = [getTaskMock, updateTaskMock];

			const { user, rerender } = setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const descriptionInput = screen.getByRole('textbox', { name: /description/i });
			await user.clear(descriptionInput);
			await user.type(descriptionInput, newDescription);

			const editButton = screen.getByRole('button', { name: /edit/i });
			await user.click(editButton);
			rerender(<EditTaskBoard />);

			expect(descriptionInput).toHaveValue(newDescription);
		});
	});

	// eslint-disable-next-line sonarjs/cognitive-complexity
	describe('Reminder', () => {
		test('If the task has not a reminder than the edit board appears without the reminder fields', async () => {
			const task = populateTask({ reminderAt: null, reminderAllDay: null });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const switchOffIcon = screen.getByTestId(ICON_REGEXP.switchOff);
			expect(switchOffIcon).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.switchOn)).not.toBeInTheDocument();

			expect(screen.queryByText(checkboxLabelText)).not.toBeInTheDocument();
			expect(screen.queryByRole('textbox', { name: /Reminder/i })).not.toBeInTheDocument();
		});

		test('If the task has a reminder than the edit board appears with the reminder fields', async () => {
			const task = populateTask({ reminderAt: new Date().getTime(), reminderAllDay: true });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const switchOnIcon = screen.getByTestId(ICON_REGEXP.switchOn);
			expect(switchOnIcon).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.switchOff)).not.toBeInTheDocument();

			expect(screen.getByText(checkboxLabelText)).toBeVisible();
			expect(screen.getByRole('textbox', { name: /Reminder/i })).toBeVisible();
		});

		test('If the date input is cleared, an error description appears and the confirm button becomes disabled', async () => {
			const task = populateTask({ reminderAt: new Date().getTime(), reminderAllDay: true });
			spyUseBoard(task.id);

			const getTaskMock = mockGetTask({ taskId: task.id }, task);
			const mocks = [getTaskMock];
			const { user } = setup(<EditTaskBoard />, { mocks });
			await awaitEditBoardRender();

			const editButton = screen.getByRole('button', { name: /edit/i });
			expect(editButton).toBeEnabled();

			await user.clear(screen.getByRole('textbox', { name: /reminder/i }));
			await user.keyboard('{Enter}');
			expect(editButton).toBeDisabled();
			expect(
				screen.getByText(
					/The reminder option is enabled, set date and time for it or disable the reminder/i
				)
			).toBeVisible();
		});

		describe('If one of reminderAt and reminderAllDay is updated, the API is called with both the variables', () => {
			test('When the reminder is removed, the mutation is called with reminderAt equals to 0 and reminderAllDay equals to false', async () => {
				const task = populateTask({
					reminderAt: new Date().getTime(),
					reminderAllDay: true
				});
				const getTaskHandler = jest.fn<ReturnType<GetTaskHandler>, Parameters<GetTaskHandler>>(() =>
					HttpResponse.json({
						data: {
							getTask: task
						}
					})
				);
				const updateTaskHandler = jest.fn<
					ReturnType<UpdateTaskHandler>,
					Parameters<UpdateTaskHandler>
				>(({ variables }) => {
					const { updateTask } = variables;
					return HttpResponse.json({
						data: {
							updateTask: {
								id: updateTask.id,
								status: updateTask.status || task.status,
								title: updateTask.title || task.title,
								reminderAt: updateTask.reminderAt || task.reminderAt,
								reminderAllDay: updateTask.reminderAllDay || task.reminderAllDay,
								description: updateTask.description || task.description,
								priority: updateTask.priority || task.priority,
								createdAt: task.createdAt,
								__typename: 'Task'
							}
						}
					});
				});

				server.use(
					graphql.query(GetTaskDocument, getTaskHandler),
					graphql.mutation(UpdateTaskDocument, updateTaskHandler)
				);
				spyUseBoard(task.id);
				const { user } = setup(<EditTaskBoard />);

				await act(async () => {
					await jest.advanceTimersToNextTimerAsync();
				});
				await waitFor(() => expect(getTaskHandler).toHaveBeenCalled());
				await awaitEditBoardRender();

				const switchOnIcon = screen.getByTestId(ICON_REGEXP.switchOn);
				await user.click(switchOnIcon);

				const editButton = screen.getByRole('button', { name: /edit/i });
				await user.click(editButton);
				const expected: Partial<Task> = { id: task.id, reminderAt: 0, reminderAllDay: false };
				expect(updateTaskHandler).toHaveBeenCalledWith(
					expect.objectContaining({
						variables: {
							updateTask: expected
						}
					})
				);
			});

			test('When the reminder is updated modifying the reminderAt, the mutation is called with reminderAt equals to the new value and reminderAllDay equals to previous value', async () => {
				// chosen date is the 1st of next month
				const nextM = addMonths(new Date().setMilliseconds(0), 1);
				const chosenDate = subDays(nextM, getDate(nextM) - 1);

				const previousReminderAllDayValue = faker.datatype.boolean();

				const task = populateTask({
					reminderAt: new Date().getTime(),
					reminderAllDay: previousReminderAllDayValue
				});
				const getTaskHandler = jest.fn<ReturnType<GetTaskHandler>, Parameters<GetTaskHandler>>(() =>
					HttpResponse.json({
						data: {
							getTask: task
						}
					})
				);
				const updateTaskHandler = jest.fn<
					ReturnType<UpdateTaskHandler>,
					Parameters<UpdateTaskHandler>
				>(({ variables }) => {
					const { updateTask } = variables;
					return HttpResponse.json({
						data: {
							updateTask: {
								id: updateTask.id,
								status: updateTask.status || task.status,
								title: updateTask.title || task.title,
								reminderAt: updateTask.reminderAt || task.reminderAt,
								reminderAllDay: updateTask.reminderAllDay || task.reminderAllDay,
								description: updateTask.description || task.description,
								priority: updateTask.priority || task.priority,
								createdAt: task.createdAt,
								__typename: 'Task'
							}
						}
					});
				});

				server.use(
					graphql.query(GetTaskDocument, getTaskHandler),
					graphql.mutation(UpdateTaskDocument, updateTaskHandler)
				);
				spyUseBoard(task.id);
				const { user } = setup(<EditTaskBoard />);

				await act(async () => {
					await jest.advanceTimersToNextTimerAsync();
				});
				await waitFor(() => expect(getTaskHandler).toHaveBeenCalled());
				await awaitEditBoardRender();

				await user.click(screen.getByTestId('icon: CalendarOutline'));
				const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
				await user.click(nextMonthButton);
				await user.click(screen.getAllByText('1')[0]);

				const editButton = screen.getByRole('button', { name: /edit/i });
				await user.click(editButton);
				const expected: Partial<Task> = {
					id: task.id,
					reminderAt: chosenDate.valueOf(),
					reminderAllDay: previousReminderAllDayValue
				};
				expect(updateTaskHandler).toHaveBeenCalledWith(
					expect.objectContaining({
						variables: {
							updateTask: expected
						}
					})
				);
			});
			test('When the reminder is updated modifying the reminderAllDay, the mutation is called with reminderAllDay equals to the new value and reminderAt equals to previous value', async () => {
				const previousReminderAtValue = faker.date.soon();

				const task = populateTask({
					reminderAt: previousReminderAtValue.getTime(),
					reminderAllDay: false
				});
				const getTaskHandler = jest.fn<ReturnType<GetTaskHandler>, Parameters<GetTaskHandler>>(() =>
					HttpResponse.json({
						data: {
							getTask: task
						}
					})
				);
				const updateTaskHandler = jest.fn<
					ReturnType<UpdateTaskHandler>,
					Parameters<UpdateTaskHandler>
				>(({ variables }) => {
					const { updateTask } = variables;
					return HttpResponse.json({
						data: {
							updateTask: {
								id: updateTask.id,
								status: updateTask.status || task.status,
								title: updateTask.title || task.title,
								reminderAt: updateTask.reminderAt || task.reminderAt,
								reminderAllDay: updateTask.reminderAllDay || task.reminderAllDay,
								description: updateTask.description || task.description,
								priority: updateTask.priority || task.priority,
								createdAt: task.createdAt,
								__typename: 'Task'
							}
						}
					});
				});

				server.use(
					graphql.query(GetTaskDocument, getTaskHandler),
					graphql.mutation(UpdateTaskDocument, updateTaskHandler)
				);
				spyUseBoard(task.id);
				const { user } = setup(<EditTaskBoard />);

				await act(async () => {
					await jest.advanceTimersToNextTimerAsync();
				});
				await waitFor(() => expect(getTaskHandler).toHaveBeenCalled());
				await awaitEditBoardRender();

				const allDayCheckbox = await screen.findByText(checkboxLabelText);
				await user.click(allDayCheckbox);

				const editButton = screen.getByRole('button', { name: /edit/i });
				await user.click(editButton);
				const expected: Partial<Task> = {
					id: task.id,
					reminderAt: previousReminderAtValue.getTime(),
					reminderAllDay: true
				};
				expect(updateTaskHandler).toHaveBeenCalledWith(
					expect.objectContaining({
						variables: {
							updateTask: expected
						}
					})
				);
			});
		});
	});
});
