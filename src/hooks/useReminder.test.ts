/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useReminder } from './useReminder';
import { getAppI18n, setupHook } from '../utils/testUtils';

describe('useReminder', () => {
	it('should return isExpired true if reminderAt is before now in the same day and it is not allDay', () => {
		jest.setSystemTime(new Date(2024, 5, 4, 17, 31, 15, 0));
		const reminderAt = new Date(2024, 5, 4, 17, 30, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), false));
		expect(result.current.isExpired).toBe(true);
	});

	it('should return isExpired false if reminderAt is after now in the same day and it is not allDay', () => {
		jest.setSystemTime(new Date(2024, 5, 4, 17, 31, 15, 0));
		const reminderAt = new Date(2024, 5, 4, 17, 32, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), false));
		expect(result.current.isExpired).toBe(false);
	});

	it.each([true, false])(
		'should return isExpired false if reminderAt is equal to now and allDay is %s',
		(allDay) => {
			const now = new Date(2024, 5, 4, 17, 31, 15, 0);
			jest.setSystemTime(now);
			const reminderAt = now;
			const { result } = setupHook(() => useReminder(reminderAt.getTime(), allDay));
			expect(result.current.isExpired).toBe(false);
		}
	);

	it('should return isExpired false if reminderAt is before now in the same day and it is allDay', () => {
		jest.setSystemTime(new Date(2024, 5, 4, 17, 31, 15, 0));
		const reminderAt = new Date(2024, 5, 4, 17, 30, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), true));
		expect(result.current.isExpired).toBe(false);
	});

	it('should return isExpired false if reminderAt is after now in the same day and it is allDay', () => {
		jest.setSystemTime(new Date(2024, 5, 4, 17, 31, 15, 0));
		const reminderAt = new Date(2024, 5, 4, 17, 32, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), true));
		expect(result.current.isExpired).toBe(false);
	});

	it('should return isExpired true if reminderAt is before now not in the same day and it is allDay', () => {
		jest.setSystemTime(new Date(2024, 5, 4, 17, 31, 15, 0));
		const reminderAt = new Date(2024, 5, 3, 17, 30, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), true));
		expect(result.current.isExpired).toBe(true);
	});

	it('should return the formatted date with the time if not all day', () => {
		const reminderAt = new Date(2024, 5, 4, 17, 30, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), false));
		expect(result.current.formattedDate).toBe('Jun 04, 2024, 05:30 PM');
	});

	it('should return the formatted date without the time if all day', () => {
		const reminderAt = new Date(2024, 5, 4, 17, 30, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), true));
		expect(result.current.formattedDate).toBe('Jun 04, 2024');
	});

	it('should return the formatted date localized with the current locale', () => {
		const i18n = getAppI18n();
		i18n.changeLanguage('it');
		const reminderAt = new Date(2024, 5, 4, 17, 30, 0, 0);
		const { result } = setupHook(() => useReminder(reminderAt.getTime(), false), { i18n });
		expect(result.current.formattedDate).toBe('04 giu 2024, 17:30');
	});
});
