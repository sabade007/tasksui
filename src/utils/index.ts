/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { debounce, flatten } from 'lodash';

export function formatDateFromTimestamp(
	timestamp: number,
	options?: { includeTime?: boolean; locale?: string }
): string {
	const fixedLocale = options?.locale?.replaceAll('_', '-');
	const format: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: '2-digit'
	};
	if (options?.includeTime) {
		format.hour = '2-digit';
		format.minute = '2-digit';
	}
	try {
		return Intl.DateTimeFormat(fixedLocale, format).format(timestamp);
	} catch (e) {
		if (e instanceof RangeError) {
			// try to format with only the language part of the locale
			// if there is no hyphen, use the system language by passing locale undefined
			const hyphenIndex = fixedLocale?.indexOf('-') ?? -1;
			return formatDateFromTimestamp(timestamp, {
				locale: hyphenIndex > -1 ? fixedLocale?.substring(0, hyphenIndex) : undefined,
				includeTime: options?.includeTime
			});
		}
		throw e;
	}
}

export function identity<Type>(arg: Type | null): arg is Type {
	return arg !== null;
}

export function debounceWithAllArgs<T extends Parameters<typeof debounce>[0]>(
	...[callback, wait, options]: Parameters<typeof debounce<T>>
): ReturnType<typeof debounce<T>> {
	let collectedArgs: Array<Parameters<T>> = [];
	const debouncedFn = debounce(
		() => {
			const returnValue = callback(...flatten(collectedArgs));
			collectedArgs = [];
			return returnValue;
		},
		wait,
		options
	);
	const cancelFn = (): void => {
		debouncedFn.cancel();
		collectedArgs = [];
	};
	const flushFn = (): ReturnType<T> | undefined => debouncedFn.flush();
	const invokerFn = (...args: Parameters<T>): ReturnType<T> => {
		collectedArgs.push(args);
		return debouncedFn();
	};
	invokerFn.cancel = cancelFn;
	invokerFn.flush = flushFn;

	return invokerFn;
}
