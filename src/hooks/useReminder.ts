/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import { formatDateFromTimestamp } from '../utils';

type UseReminderReturnType = {
	isExpired: boolean;
	formattedDate: string;
};

export const useReminder = (
	reminderAt: number | null | undefined,
	reminderAllDay: boolean | null | undefined
): UseReminderReturnType => {
	const {
		i18n: { language }
	} = useTranslation();

	const isExpired = useMemo(() => {
		if (reminderAt) {
			const now = Date.now();
			if (reminderAllDay) {
				const reminderAtMidnight = new Date(reminderAt);
				reminderAtMidnight.setHours(0, 0, 0, 0);
				const nowAtMidnight = new Date(now);
				nowAtMidnight.setHours(0, 0, 0, 0);
				return reminderAtMidnight.getTime() - nowAtMidnight.getTime() < 0;
			}

			return reminderAt - now < 0;
		}
		return false;
	}, [reminderAllDay, reminderAt]);

	const formattedDate = useMemo(() => {
		if (reminderAt) {
			return formatDateFromTimestamp(reminderAt, {
				includeTime: reminderAllDay !== true,
				locale: language
			});
		}
		return '';
	}, [language, reminderAllDay, reminderAt]);

	return { isExpired, formattedDate };
};
