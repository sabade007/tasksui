/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';

import { TaskDetails } from './TaskDetails';
import { ICON_REGEXP } from '../constants/tests';
import { Priority } from '../gql/types';
import { populateTask } from '../mocks/utils';
import { setup } from '../utils/testUtils';

describe('Task details', () => {
	test('Show creation date without time', () => {
		const task = populateTask({
			createdAt: new Date(2024, 4, 7, 15, 25, 10, 0).getTime()
		});
		setup(<TaskDetails createdAt={task.createdAt} priority={task.priority} />);
		expect(screen.getByText(/creation date/i)).toBeVisible();
		expect(screen.getByText('May 07, 2024')).toBeVisible();
	});

	test('Show priority', () => {
		const task = populateTask();
		task.priority = Priority.Medium;
		setup(<TaskDetails createdAt={task.createdAt} priority={task.priority} />);
		expect(screen.getByText(/priority/i)).toBeVisible();
		expect(screen.getByText(/medium/i)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.mediumPriority)).toBeVisible();
	});

	describe('Reminder', () => {
		test('Show date only if set for all day', () => {
			const task = populateTask({
				reminderAt: new Date(2025, 0, 1, 0, 1, 0, 0).getTime(),
				reminderAllDay: true
			});
			setup(
				<TaskDetails
					createdAt={task.createdAt}
					priority={task.priority}
					reminderAt={task.reminderAt}
					reminderAllDay={task.reminderAllDay}
				/>
			);
			expect(screen.getByText(/reminder/i)).toBeVisible();
			expect(screen.getByText('Jan 01, 2025')).toBeVisible();
		});

		test('Show time if not set for all day', () => {
			const task = populateTask();
			task.reminderAllDay = false;
			task.reminderAt = new Date(2024, 8, 15, 10, 14, 58, 0).getTime();
			setup(
				<TaskDetails
					createdAt={task.createdAt}
					priority={task.priority}
					reminderAt={task.reminderAt}
					reminderAllDay={task.reminderAllDay}
				/>
			);
			expect(screen.getByText(/reminder/i)).toBeVisible();
			expect(screen.getByText('Sep 15, 2024, 10:14 AM')).toBeVisible();
		});

		test('Hide field if not set', () => {
			const task = populateTask({
				reminderAt: null
			});
			setup(
				<TaskDetails
					createdAt={task.createdAt}
					priority={task.priority}
					reminderAt={task.reminderAt}
					reminderAllDay={task.reminderAllDay}
				/>
			);
			expect(screen.queryByText(/reminder/i)).not.toBeInTheDocument();
		});

		test('Show expired icon if expired', () => {
			const task = populateTask({
				reminderAt: new Date(2023, 11, 25, 12, 25, 0, 0).getTime(),
				reminderAllDay: false
			});
			jest.setSystemTime(new Date(2024, 5, 4, 18, 14, 57, 0));
			setup(
				<TaskDetails
					createdAt={task.createdAt}
					priority={task.priority}
					reminderAt={task.reminderAt}
					reminderAllDay={task.reminderAllDay}
				/>
			);
			expect(screen.getByText(/reminder/i)).toBeVisible();
			expect(screen.getByText('Dec 25, 2023, 12:25 PM')).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.reminderExpired)).toBeVisible();
		});
	});

	describe('Description', () => {
		test('Show description when set', () => {
			const task = populateTask();
			task.description = faker.lorem.sentences();
			setup(
				<TaskDetails
					createdAt={task.createdAt}
					priority={task.priority}
					description={task.description}
				/>
			);
			expect(screen.getByText(/description/i)).toBeVisible();
			expect(screen.getByText(task.description)).toBeVisible();
		});

		test('Hide field when empty', () => {
			const task = populateTask();
			task.description = '';
			setup(
				<TaskDetails
					createdAt={task.createdAt}
					priority={task.priority}
					description={task.description}
				/>
			);
			expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
		});
	});
});
