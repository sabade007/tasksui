/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';
import subDays from 'date-fns/subDays';

import { ListItemContent } from './ListItemContent';
import { ICON_REGEXP } from '../constants/tests';
import { Priority, Status } from '../gql/types';
import { populateTask } from '../mocks/utils';
import { setup } from '../utils/testUtils';

describe('List item content', () => {
	describe('Title', () => {
		test('The title is always shown', () => {
			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					status={Status.Open}
				/>
			);
			const title = screen.getByText('Task title');
			expect(title).toBeInTheDocument();
			expect(title).toBeVisible();
		});
	});

	describe('Status', () => {
		test('When status is complete then completed icon is visible', async () => {
			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					status={Status.Complete}
				/>
			);

			const completeIcon = await screen.findByTestId(ICON_REGEXP.reminderComplete);
			expect(completeIcon).toBeVisible();
		});

		test('When status is open then completed icon is not in the document', async () => {
			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					status={Status.Open}
				/>
			);

			const completeIcon = screen.queryByTestId(ICON_REGEXP.reminderComplete);
			expect(completeIcon).not.toBeInTheDocument();
		});
	});

	describe('Priority', () => {
		test.each([
			[Priority.High, ICON_REGEXP.highPriority],
			[Priority.Low, ICON_REGEXP.lowPriority],
			[Priority.Medium, ICON_REGEXP.mediumPriority]
		])(
			'When priority is %s then %s priority icon is shown',
			async (priority, priorityIconRegexp) => {
				setup(
					<ListItemContent
						id={'id1'}
						title={'Task title'}
						priority={priority}
						visible
						status={Status.Open}
					/>
				);
				const priorityIcon = await screen.findByTestId(priorityIconRegexp);

				expect(priorityIcon).toBeInTheDocument();
				expect(priorityIcon).toBeVisible();
			}
		);
	});

	describe('Expired icon', () => {
		test('When the task reminder is expired then reminder expired icon is shown', async () => {
			const sevenDaysAgo = subDays(Date.now(), 7);

			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={sevenDaysAgo.valueOf()}
					status={Status.Open}
				/>
			);
			const reminderExpiredIcon = await screen.findByTestId(ICON_REGEXP.reminderExpired);

			expect(reminderExpiredIcon).toBeInTheDocument();
			expect(reminderExpiredIcon).toBeVisible();
		});
	});

	describe('Reminder info', () => {
		test('When there is not a reminder then the string "Do not remind me" is shown', async () => {
			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					status={Status.Open}
				/>
			);
			const reminderText = await screen.findByText('Do not remind me');

			expect(reminderText).toBeInTheDocument();
			expect(reminderText).toBeVisible();
		});

		test('When there is a reminder then the string "Remind me on" is shown', async () => {
			const sevenDaysAgo = subDays(Date.now(), 7);

			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={sevenDaysAgo.valueOf()}
					status={Status.Open}
				/>
			);
			const reminderText = await screen.findByText('Remind me on');

			expect(reminderText).toBeInTheDocument();
			expect(reminderText).toBeVisible();
		});

		test('When there is a reminder not flagged as all-day then hours and minutes are shown', async () => {
			// '08 08 1988 09:15:00', 'DD MM YYYY hh:mm:ss'
			const AUGUST = 7;
			const pastDate = new Date(1988, AUGUST, 8, 9, 15);
			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={pastDate.valueOf()}
					status={Status.Open}
				/>
			);
			const reminderDate = await screen.findByText('Aug 08, 1988, 09:15 AM');

			expect(reminderDate).toBeInTheDocument();
			expect(reminderDate).toBeVisible();
		});

		test('When there is a reminder flagged as all-day then hours and minutes are not shown', async () => {
			const JUNE = 5;
			const pastDate = new Date(1995, JUNE, 12, 9, 15);

			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={pastDate.valueOf()}
					reminderAllDay
					status={Status.Open}
				/>
			);
			expect(screen.queryByText('Jun 12, 1995 - 09:15')).not.toBeInTheDocument();

			const reminderDateWithoutTime = screen.getByText('Jun 12, 1995');

			expect(reminderDateWithoutTime).toBeInTheDocument();
			expect(reminderDateWithoutTime).toBeVisible();
		});
	});

	describe('Expiration', () => {
		test('An all day reminder is considered expired the day after', async () => {
			const now = new Date();
			const yesterdayAtNoon = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - 1,
				12,
				0,
				0
			);

			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={yesterdayAtNoon.valueOf()}
					reminderAllDay
					status={Status.Open}
				/>
			);
			const minusOutlineIcon = await screen.findByTestId(ICON_REGEXP.reminderExpired);

			expect(minusOutlineIcon).toBeInTheDocument();
			expect(minusOutlineIcon).toBeVisible();
		});

		test('An all day reminder is not considered expired the same day', async () => {
			const todayAtNoon = new Date().setHours(12);

			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={todayAtNoon}
					reminderAllDay
					status={Status.Open}
				/>
			);
			expect(screen.queryByTestId(ICON_REGEXP.reminderExpired)).not.toBeInTheDocument();
		});

		test('A time specific reminder is considered expired the millisecond after', async () => {
			const oneMilliSecondAgo = Date.now() - 1;

			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={oneMilliSecondAgo}
					status={Status.Open}
				/>
			);
			const reminderExpiredIcon = await screen.findByTestId(ICON_REGEXP.reminderExpired);

			expect(reminderExpiredIcon).toBeInTheDocument();
			expect(reminderExpiredIcon).toBeVisible();
		});

		test('A time specific reminder is not considered expired the same millisecond', async () => {
			const now = Date.now();

			setup(
				<ListItemContent
					id={'id1'}
					title={'Task title'}
					priority={Priority.Medium}
					visible
					reminderAt={now}
					status={Status.Open}
				/>
			);
			expect(screen.queryByTestId(ICON_REGEXP.reminderExpired)).not.toBeInTheDocument();
		});
	});

	test('Click on item calls callback', async () => {
		const task = populateTask();
		const clickFn = jest.fn();
		const { user } = setup(
			<ListItemContent
				id={task.id}
				priority={task.priority}
				title={task.title}
				onClick={clickFn}
				visible
				status={Status.Open}
			/>
		);
		await user.click(screen.getByText(task.title));
		expect(clickFn).toHaveBeenCalled();
		expect(clickFn).toHaveBeenCalledTimes(1);
	});

	test('When not visible, no data is shown', () => {
		const task = populateTask();
		setup(
			<ListItemContent
				id={task.id}
				priority={Priority.High}
				title={task.title}
				visible={false}
				status={Status.Open}
			/>
		);
		expect(screen.queryByText(task.title)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.highPriority)).not.toBeInTheDocument();
	});
});
