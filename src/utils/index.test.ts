/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { formatDateFromTimestamp } from './index';

describe('formatDateFromTimestamp function', () => {
	it('should return the string date without the time based on system locale if no locale is passed', () => {
		const date = new Date(2024, 5, 4, 16, 56, 48, 0);
		const result = formatDateFromTimestamp(date.getTime());
		expect(result).toBe('Jun 04, 2024');
	});

	it('should return the string date with the time based on system locale if no locale is passed and the includeTime option is set to true', () => {
		const date = new Date(2024, 5, 4, 16, 56, 48, 0);
		const result = formatDateFromTimestamp(date.getTime(), { includeTime: true });
		expect(result).toBe('Jun 04, 2024, 04:56 PM');
	});

	it('should return the string date based on the given locale', () => {
		const date = new Date(2024, 5, 4, 16, 56, 48, 0);
		const result = formatDateFromTimestamp(date.getTime(), { locale: 'it' });
		expect(result).toBe('04 giu 2024');
	});

	it('should return the string date-time based on the given locale', () => {
		const date = new Date(2024, 5, 4, 16, 56, 48, 0);
		const result = formatDateFromTimestamp(date.getTime(), {
			locale: 'it',
			includeTime: true
		});
		expect(result).toBe('04 giu 2024, 16:56');
	});

	it.each(['astronauta', 'astronauta-locale'])(
		'should format date based on the system locale if the given locale is invalid',
		(locale) => {
			const date = new Date(2024, 5, 4, 16, 56, 48, 0);
			const result = formatDateFromTimestamp(date.getTime(), { includeTime: true, locale });
			expect(result).toBe('Jun 04, 2024, 04:56 PM');
		}
	);

	it('should format date based on the given locale language if the locale arg has a valid language but an invalid subtag', () => {
		const date = new Date(2024, 4, 9);
		const result = formatDateFromTimestamp(date.getTime(), { locale: 'pt-ASTRONAUTA' });
		expect(result).toBe('09 de mai. de 2024');
	});

	it('should format date based on the given locale if the locale arg is valid but with underscores', () => {
		const date = new Date(2024, 4, 9);
		const result = formatDateFromTimestamp(date.getTime(), { locale: 'pt_BR' });
		expect(result).toBe('09 de mai. de 2024');
	});
});
