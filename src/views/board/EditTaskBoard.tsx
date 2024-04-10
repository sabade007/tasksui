/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import { useMutation, useQuery } from '@apollo/client';
import { t, useBoard, useBoardHooks } from '@zextras/carbonio-shell-ui';
import { trim } from 'lodash';

import { CommonTaskBoard, type CommonTaskBoardProps } from './CommonTaskBoard';
import { GetTaskDocument, Priority, UpdateTaskDocument } from '../../gql/types';

const EditTaskBoard = (): React.JSX.Element => {
	const { context } = useBoard<{ taskId: string }>();
	const taskId = context?.taskId;
	const { closeBoard } = useBoardHooks();
	const [updateTaskMutation] = useMutation(UpdateTaskDocument);

	const { data: getTaskResult } = useQuery(GetTaskDocument, {
		errorPolicy: 'all',
		variables: {
			taskId: taskId ?? ''
		},
		skip: !taskId
	});

	const {
		title: initialTitle,
		priority: initialPriority,
		description: initialDescription,
		reminderAt: initialReminderAt,
		reminderAllDay: initialReminderAllDay
	} = useMemo(() => {
		if (getTaskResult?.getTask) {
			return getTaskResult.getTask;
		}
		return {
			title: '',
			priority: Priority.Medium,
			description: '',
			reminderAt: undefined,
			reminderAllDay: undefined
		};
	}, [getTaskResult]);

	const onConfirm = useCallback<CommonTaskBoardProps['onConfirm']>(
		({ title, priority, description, reminderAt, reminderAllDay, enableReminder }) => {
			if (!taskId) {
				return;
			}
			const newTitle = title !== initialTitle ? title : undefined;
			const newPriority = priority !== initialPriority ? priority : undefined;
			const newDescription =
				trim(description).length > 0 && description !== initialDescription
					? trim(description)
					: undefined;
			const disablingReminder = !enableReminder && !!initialReminderAt;
			const reminderEnabledAndModified =
				enableReminder &&
				(initialReminderAt !== reminderAt.getTime() || initialReminderAllDay !== reminderAllDay);
			const newReminderAt = disablingReminder
				? 0
				: (reminderEnabledAndModified && enableReminder && reminderAt.getTime()) || undefined;
			const newReminderAllDay =
				disablingReminder || reminderEnabledAndModified ? reminderAllDay || false : undefined;
			updateTaskMutation({
				variables: {
					updateTask: {
						id: taskId,
						description: newDescription,
						priority: newPriority,
						title: newTitle,
						reminderAt: newReminderAt,
						reminderAllDay: newReminderAllDay
					}
				}
			});
			closeBoard();
		},
		[
			closeBoard,
			initialDescription,
			initialPriority,
			initialReminderAllDay,
			initialReminderAt,
			initialTitle,
			taskId,
			updateTaskMutation
		]
	);

	return (
		<>
			{getTaskResult?.getTask && (
				<CommonTaskBoard
					initialTitle={initialTitle}
					initialPriority={initialPriority}
					initialDescription={initialDescription ?? ''}
					initialEnableReminder={!!initialReminderAt}
					initialIsAllDay={initialReminderAllDay ?? false}
					initialDate={initialReminderAt ? new Date(initialReminderAt) : new Date()}
					onConfirm={onConfirm}
					confirmLabel={t('board.confirmButton.edit', 'edit')}
					defaultBoardTabTitle={t('board.editTask.title', 'Edit Task')}
				/>
			)}
		</>
	);
};

export default EditTaskBoard;
