/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { screen, waitFor } from '@testing-library/react';
import { subMonths, addMonths, format, getDate, subDays } from 'date-fns';

import NewTaskBoard from './NewTaskBoard';
import {
	ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT,
	MAX_TASKS_LIMIT,
	TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT
} from '../../constants';
import { ICON_REGEXP } from '../../constants/tests';
import {
	FindTasksDocument,
	type FindTasksQuery,
	type FindTasksQueryVariables,
	type NewTaskInput,
	Priority,
	Status,
	type Task
} from '../../gql/types';
import { mockCreateTask, populateTaskList } from '../../mocks/utils';
import { setup } from '../../utils/testUtils';

describe('New task board', () => {
	function prepareCache(tasks: Task[] = []): void {
		global.apolloClient.writeQuery<FindTasksQuery, FindTasksQueryVariables>({
			query: FindTasksDocument,
			data: {
				findTasks: tasks
			}
		});
	}

	function readQueryFindTasks(): FindTasksQuery | null {
		return global.apolloClient.readQuery<FindTasksQuery, FindTasksQueryVariables>({
			query: FindTasksDocument
		});
	}

	test('Show fields for title, priority, reminder toggle and description and create button', () => {
		prepareCache();

		setup(<NewTaskBoard />, { mocks: [] });

		expect(screen.getByText(/details/i)).toBeVisible();
		expect(screen.getByRole('textbox', { name: /title/i })).toBeVisible();
		expect(screen.getByText(/priority/i)).toBeVisible();
		expect(screen.getByText(/enable reminder/i)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.switchOff)).toBeVisible();
		expect(screen.getByText('Description')).toBeVisible();
		expect(screen.getByRole('textbox', { name: /task description/i })).toBeVisible();
		expect(screen.getByRole('button', { name: /create/i })).toBeVisible();
	});

	describe('Title', () => {
		test('When not set the create button is disabled', () => {
			prepareCache();

			setup(<NewTaskBoard />, { mocks: [] });

			expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue('');
			expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
		});

		test('When there are only spaces the create button is disabled', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });

			const titleInput = screen.getByRole('textbox', { name: /title/i });
			const spaceOnlyString = '                  ';
			await user.type(titleInput, spaceOnlyString);
			expect(titleInput).toHaveValue(spaceOnlyString);
			expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
		});

		test('When the limit of 1024 characters is reached the create button is disabled and the error description appears', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });

			const titleInput = screen.getByRole('textbox', { name: /title/i });
			const createButton = screen.getByRole('button', { name: /create/i });
			const maxLengthString = faker.string.alpha({ length: 1024 });
			await user.type(titleInput, maxLengthString);
			expect(titleInput).toHaveValue(maxLengthString);
			expect(createButton).toBeEnabled();
			expect(
				screen.queryByText(/Maximum length allowed is 1024 characters/i)
			).not.toBeInTheDocument();
			// type a character to exceed the limit
			await user.type(titleInput, 'a');
			const errorMessage = await screen.findByText(/Maximum length allowed is 1024 characters/i);
			expect(errorMessage).toBeVisible();
			expect(createButton).toBeDisabled();
		});
	});

	describe('Priority', () => {
		test('Priority medium is the default one', () => {
			prepareCache();

			setup(<NewTaskBoard />, { mocks: [] });

			expect(screen.getByText(/medium/i)).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.mediumPriority)).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.highPriority)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.lowPriority)).not.toBeInTheDocument();
		});

		test('Create a task with high priority', async () => {
			prepareCache();

			const newTaskInput: NewTaskInput = {
				priority: Priority.High,
				status: Status.Open,
				title: 'Task with high priority'
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });

			const prioritySelect = screen.getByText('Priority');
			await user.click(prioritySelect);

			const highPriority = screen.getByText('High');
			await user.click(highPriority);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.priority).toBe(Priority.High);
		});

		test('Create a task with low priority', async () => {
			prepareCache();

			const newTaskInput: NewTaskInput = {
				priority: Priority.Low,
				status: Status.Open,
				title: 'Task with low priority'
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });

			const prioritySelect = screen.getByText('Priority');
			await user.click(prioritySelect);

			const lowPriority = screen.getByText('Low');
			await user.click(lowPriority);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.priority).toBe(Priority.Low);
		});
	});

	describe('Description', () => {
		test('Is optional, if not set the create button is enabled', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });

			const createButton = screen.getByRole('button', { name: /create/i });
			expect(createButton).toBeDisabled();
			await user.type(screen.getByRole('textbox', { name: /title/i }), 'something');
			await waitFor(() => expect(createButton).toBeEnabled());
			expect(screen.getByRole('textbox', { name: /description/i })).toHaveValue('');
		});

		test('When the limit of 4096 characters is reached the create button is disabled and the error description appears', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });

			const createButton = screen.getByRole('button', { name: /create/i });
			const descriptionInput = screen.getByRole('textbox', { name: /description/i });
			const maxLengthDescription = faker.string.alpha({ length: 4096 });
			await user.type(screen.getByRole('textbox', { name: /title/i }), 'something');
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.type(descriptionInput, maxLengthDescription);
			expect(descriptionInput).toHaveValue(maxLengthDescription);
			expect(createButton).toBeEnabled();
			expect(
				screen.queryByText(/Maximum length allowed is 4096 characters/i)
			).not.toBeInTheDocument();
			// type a character to exceed the limit
			await user.type(descriptionInput, 'a');
			await waitFor(() => expect(createButton).toBeDisabled());
			expect(screen.getByText(/Maximum length allowed is 4096 characters/i)).toBeVisible();
		});
	});

	test.each([[Status.Complete], [Status.Open]])(
		'Info banner appears when the limit of 199 %s tasks is reached',
		async (status) => {
			const tasks = populateTaskList(MAX_TASKS_LIMIT - 2, { status });
			prepareCache(tasks);

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'task nr 199'
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });

			const infoBannerText =
				/This is the last task you can create\. Delete your previous tasks to create more/i;
			expect(screen.queryByText(infoBannerText)).not.toBeInTheDocument();
			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			await screen.findByText(infoBannerText);
			expect(screen.getByText(infoBannerText)).toBeVisible();
		}
	);

	test.each([[Status.Complete], [Status.Open]])(
		'Warning banner appears when the limit of 200 %s tasks is reached',
		async (status) => {
			const tasks = populateTaskList(MAX_TASKS_LIMIT - 1, { status });
			prepareCache(tasks);

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'task nr 200'
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });

			const warningBannerText =
				/You have reached your 200 tasks. Delete your previous tasks to create more./i;
			expect(screen.queryByText(warningBannerText)).not.toBeInTheDocument();
			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			screen.getByText(warningBannerText);
			expect(screen.getByText(warningBannerText)).toBeVisible();
		}
	);

	test('Snackbar appears when max limit is reached and click create button', async () => {
		const tasks = populateTaskList(MAX_TASKS_LIMIT);
		prepareCache(tasks);

		const newTaskInput: NewTaskInput = {
			priority: Priority.Medium,
			status: Status.Open,
			title: 'task nr 201'
		};

		const newTaskResult: Required<Task> = {
			__typename: 'Task',
			createdAt: new Date().getTime(),
			id: faker.string.uuid(),
			description: null,
			reminderAllDay: null,
			reminderAt: null,
			...newTaskInput,
			priority: newTaskInput.priority || Priority.Medium,
			status: newTaskInput.status || Status.Open
		};

		const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
		const mocks = [createTaskMock];
		const { user } = setup(<NewTaskBoard />, { mocks });

		const createButton = screen.getByRole('button', { name: /create/i });
		await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
		await waitFor(() => expect(createButton).toBeEnabled());
		await user.click(createButton);

		// Snackbar and banner have the same text
		const snackbarText =
			'You have reached your 200 tasks. Delete your previous tasks to create more.';
		expect(screen.getAllByText(snackbarText).length).toBe(2);
		expect(createTaskMock.result).not.toHaveBeenCalled();
	});

	describe('Reminder', () => {
		test('It is disabled by default, enabling the switch the related picker and checkbox appear', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });
			const switchOffIcon = screen.getByTestId(ICON_REGEXP.switchOff);
			expect(switchOffIcon).toBeVisible();
			expect(screen.queryByTestId(ICON_REGEXP.switchOn)).not.toBeInTheDocument();

			const checkboxLabelText = /Remind me at every login throughout the day/i;
			expect(screen.queryByText(checkboxLabelText)).not.toBeInTheDocument();
			expect(screen.queryByRole('textbox', { name: /Reminder/i })).not.toBeInTheDocument();

			await user.click(switchOffIcon);
			expect(screen.getByTestId(ICON_REGEXP.switchOn)).toBeVisible();

			expect(screen.getByRole('textbox', { name: /Reminder/i })).toBeVisible();
			expect(screen.getByText(checkboxLabelText)).toBeVisible();

			expect(screen.getByTestId(ICON_REGEXP.inputCalendarIcon)).toBeVisible();
		});

		test('When is enabled it is set with current date as default', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });

			const dateString = format(new Date(), TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT);

			const switchOffIcon = screen.getByTestId(ICON_REGEXP.switchOff);
			await user.click(switchOffIcon);

			const reminderInput = screen.getByRole('textbox', { name: /Reminder/i });
			expect(reminderInput).toHaveValue(dateString);
		});

		test('It is optional, if not set the create button is enabled', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });

			const createButton = screen.getByRole('button', { name: /create/i });
			expect(createButton).toBeDisabled();

			const titleInput = screen.getByRole('textbox', { name: /title/i });
			await user.type(titleInput, faker.string.alpha({ length: 10 }));
			expect(createButton).toBeEnabled();
		});

		test('When all day checkbox is checked the time is missing in the input and in the picker', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });
			const dateString = format(new Date(), ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT);

			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			const checkboxLabelText = /Remind me at every login throughout the day/i;
			await user.click(screen.getByText(checkboxLabelText));

			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(dateString);
			await user.click(screen.getByTestId(ICON_REGEXP.inputCalendarIcon));
			expect(screen.queryByText('Time')).not.toBeInTheDocument();
		});

		test('When all day checkbox is not checked the time is shown in the input and in the picker', async () => {
			prepareCache();

			const { user } = setup(<NewTaskBoard />, { mocks: [] });

			const dateString = format(new Date(), TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT);
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(dateString);

			await user.click(screen.getByTestId(ICON_REGEXP.inputCalendarIcon));

			expect(screen.getByText('Time')).toBeVisible();
		});

		test('Create task with future reminder at specific time', async () => {
			prepareCache();

			// chosen date is the 1st of next month
			const nextM = addMonths(new Date().setMilliseconds(0), 1);
			const chosenDate = subDays(nextM, getDate(nextM) - 1);

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'Task',
				reminderAt: chosenDate.valueOf(),
				reminderAllDay: false
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			await user.click(screen.getByTestId(ICON_REGEXP.inputCalendarIcon));
			const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
			await user.click(nextMonthButton);

			// always click on first 1 visible on the date picker
			await user.click(screen.getAllByText('1')[0]);
			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(
				format(chosenDate, TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT)
			);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.reminderAllDay).toBe(newTaskInput.reminderAllDay);
			expect(result?.findTasks[0]?.reminderAt).toBe(newTaskInput.reminderAt);
		});

		test('Create task with an all day future reminder', async () => {
			prepareCache();

			// chosen date is the 1st of next month
			const nextM = addMonths(new Date().setMilliseconds(0), 1);
			const chosenDate = subDays(nextM, getDate(nextM) - 1);

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'Task',
				reminderAt: chosenDate.valueOf(),
				reminderAllDay: true
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			await user.click(screen.getByTestId(ICON_REGEXP.inputCalendarIcon));
			const nextMonthButton = await screen.findByRole('button', { name: /next month/i });
			await user.click(nextMonthButton);

			// always click on first 1 visible on the date picker
			await user.click(screen.getAllByText('1')[0]);

			const checkboxLabelText = /Remind me at every login throughout the day/i;
			await user.click(screen.getByText(checkboxLabelText));

			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(
				format(chosenDate, ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT)
			);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.reminderAllDay).toBe(newTaskInput.reminderAllDay);
			expect(result?.findTasks[0]?.reminderAt).toBe(newTaskInput.reminderAt);
		});

		test('Create task with now reminder', async () => {
			prepareCache();

			const chosenDate = new Date();

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'Task',
				reminderAt: chosenDate.valueOf(),
				reminderAllDay: false
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(
				format(chosenDate, TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT)
			);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.reminderAllDay).toBe(newTaskInput.reminderAllDay);
			expect(result?.findTasks[0]?.reminderAt).toBe(newTaskInput.reminderAt);
		});

		test('Create task with today reminder', async () => {
			prepareCache();

			const chosenDate = new Date();

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'Task',
				reminderAt: chosenDate.valueOf(),
				reminderAllDay: true
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			const checkboxLabelText = /Remind me at every login throughout the day/i;
			await user.click(screen.getByText(checkboxLabelText));

			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(
				format(chosenDate, ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT)
			);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.reminderAllDay).toBe(newTaskInput.reminderAllDay);
			expect(result?.findTasks[0]?.reminderAt).toBe(newTaskInput.reminderAt);
		});

		test('Create task with past reminder at specific time', async () => {
			prepareCache();

			// chosen date is the 1st of previous month
			const previousM = subMonths(new Date().setMilliseconds(0), 1);
			const chosenDate = subDays(previousM, getDate(previousM) - 1);

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'Task',
				reminderAt: chosenDate.valueOf(),
				reminderAllDay: false
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			await user.click(screen.getByTestId(ICON_REGEXP.inputCalendarIcon));
			const previousMonthButton = await screen.findByRole('button', { name: /previous month/i });
			await user.click(previousMonthButton);

			// always click on first 1 visible on the date picker
			await user.click(screen.getAllByText('1')[0]);
			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(
				format(chosenDate, TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT)
			);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.reminderAllDay).toBe(newTaskInput.reminderAllDay);
			expect(result?.findTasks[0]?.reminderAt).toBe(newTaskInput.reminderAt);
		});

		test('Create task with an all day past reminder', async () => {
			prepareCache();

			// chosen date is the 1st of next month
			const previousM = subMonths(new Date().setMilliseconds(0), 1);
			const chosenDate = subDays(previousM, getDate(previousM) - 1);

			const newTaskInput: NewTaskInput = {
				priority: Priority.Medium,
				status: Status.Open,
				title: 'Task',
				reminderAt: chosenDate.valueOf(),
				reminderAllDay: true
			};

			const newTaskResult: Required<Task> = {
				__typename: 'Task',
				createdAt: new Date().getTime(),
				id: faker.string.uuid(),
				description: null,
				reminderAllDay: null,
				reminderAt: null,
				...newTaskInput,
				priority: newTaskInput.priority || Priority.Medium,
				status: newTaskInput.status || Status.Open
			};

			const createTaskMock = mockCreateTask(newTaskInput, newTaskResult);
			const mocks = [createTaskMock];
			const { user } = setup(<NewTaskBoard />, { mocks });
			await user.click(screen.getByTestId(ICON_REGEXP.switchOff));

			await user.click(screen.getByTestId(ICON_REGEXP.inputCalendarIcon));
			const previousMonthButton = await screen.findByRole('button', { name: /previous month/i });
			await user.click(previousMonthButton);

			// always click on first 1 visible on the date picker
			await user.click(screen.getAllByText('1')[0]);

			const checkboxLabelText = /Remind me at every login throughout the day/i;
			await user.click(screen.getByText(checkboxLabelText));

			expect(screen.getByRole('textbox', { name: /Reminder/i })).toHaveValue(
				format(chosenDate, ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT)
			);

			const createButton = screen.getByRole('button', { name: /create/i });
			await user.type(screen.getByRole('textbox', { name: /title/i }), newTaskInput.title);
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
			const result = readQueryFindTasks();
			expect(result?.findTasks[0]?.reminderAllDay).toBe(newTaskInput.reminderAllDay);
			expect(result?.findTasks[0]?.reminderAt).toBe(newTaskInput.reminderAt);
		});
	});
});
