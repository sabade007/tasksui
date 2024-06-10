/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';

import { Reminder } from './Reminder';
import { setup } from '../utils/testUtils';

describe('Reminder', () => {
	test('Show time when not set as all day', () => {
		const date = new Date(2024, 5, 4, 17, 50, 1, 0);
		setup(<Reminder reminderAt={date.valueOf()} reminderAllDay={false} />);
		expect(screen.getByText('Jun 04, 2024, 05:50 PM')).toBeVisible();
	});

	test('Show only date when set as all day', () => {
		const date = new Date(2024, 5, 4, 17, 50, 1, 0);
		setup(<Reminder reminderAt={date.valueOf()} reminderAllDay />);
		expect(screen.getByText('Jun 04, 2024')).toBeVisible();
		expect(screen.queryByText(/05:50 PM/i)).not.toBeInTheDocument();
	});

	test('When expired show date as error', () => {
		jest.setSystemTime(new Date(2024, 5, 4, 17, 53, 42, 0));
		const date = new Date(2024, 5, 4, 17, 53, 41, 0);
		setup(<Reminder reminderAt={date.valueOf()} />);
		expect(screen.getByText('Jun 04, 2024, 05:53 PM')).toHaveStyle({
			'font-weight': 700,
			color: '#d74942'
		});
	});

	test('When not expired does not show date as error', () => {
		jest.setSystemTime(new Date(2024, 5, 4, 17, 53, 42, 0));
		const date = new Date(2024, 5, 4, 17, 53, 43, 0);
		setup(<Reminder reminderAt={date.valueOf()} />);
		expect(screen.getByText('Jun 04, 2024, 05:53 PM')).toHaveStyle({
			'font-weight': 400,
			color: '#333333'
		});
	});
});
