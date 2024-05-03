/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import {
	type Action,
	Container,
	useModal,
	useSnackbar,
	Text
} from '@zextras/carbonio-design-system';
import {
	addBoard,
	closeBoard,
	getBoardById,
	reopenBoards,
	setCurrentBoard
} from '@zextras/carbonio-shell-ui';
import { useTranslation } from 'react-i18next';

import { useCompleteAction } from './useCompleteAction';
import { useReopenAction } from './useReopenAction';
import { useTrashAction } from './useTrashAction';
import { TASKS_ROUTE } from '../constants';
import { Status, type Task } from '../gql/types';

function getSnackbarTitle(title: string): string {
	return title.length > 50 ? title.substring(0, 50).concat('...') : title;
}

export const useActions = (task: Pick<Task, 'id' | 'title' | 'status'>): Action[] => {
	const { id, title, status } = task;
	const [t] = useTranslation();
	const createModal = useModal();

	const createSnackbar = useSnackbar();
	const completeAction = useCompleteAction(id);
	const reopenAction = useReopenAction(id);
	const trashAction = useTrashAction(id);

	const openDeleteModal = useCallback(() => {
		const closeModal = createModal({
			title: t('modal.delete.header', 'This action is irreversible'),
			size: 'medium',
			confirmLabel: t('modal.delete.button.confirm', 'Delete permanently'),
			confirmColor: 'error',
			onConfirm: () => {
				trashAction().then(() => {
					const boardId = `edit-task-${task.id}`;
					const board = getBoardById(boardId);
					if (board) {
						closeBoard(boardId);
					}
					closeModal();
					createSnackbar({
						type: 'success',
						key: `snackbar-${Date.now()}`,
						label: t('snackbar.permanentlyDeletedTask', 'Task permanently deleted'),
						hideButton: true
					});
				});
			},
			showCloseIcon: true,
			onClose: () => {
				closeModal();
			},
			children: (
				<Container padding={{ vertical: 'large' }}>
					<Text overflow="break-word" size="medium">
						{t(
							'modal.delete.body',
							'You will delete permanently this task. You will not be able to recover this tasks anymore. This action is irreversible.'
						)}
					</Text>
				</Container>
			)
		});
	}, [createModal, createSnackbar, t, task.id, trashAction]);

	const reopenActionHandler = useCallback(() => {
		reopenAction().then(() => {
			createSnackbar({
				type: 'success',
				key: `snackbar-${Date.now()}`,
				label: t('snackbar.uncompleteTask', 'Task "{{taskTitle}}" uncompleted', {
					replace: {
						taskTitle: getSnackbarTitle(title)
					}
				}),
				hideButton: true
			});
		});
	}, [createSnackbar, reopenAction, t, title]);

	const completeActionHandler = useCallback(() => {
		completeAction().then(() => {
			createSnackbar({
				type: 'success',
				key: `snackbar-${Date.now()}`,
				label: t('snackbar.completeTask', 'Task "{{taskTitle}}" completed', {
					replace: {
						taskTitle: getSnackbarTitle(title)
					}
				}),
				hideButton: true
			});
		});
	}, [completeAction, createSnackbar, t, title]);

	const editAction = useCallback<Action['onClick']>(() => {
		const board = getBoardById(`edit-task-${task.id}`);
		if (board) {
			setCurrentBoard(board.id);
			reopenBoards();
		} else {
			addBoard({
				id: `edit-task-${task.id}`,
				url: `${TASKS_ROUTE}/edit`,
				title: t('board.editTask.title', 'Edit Task'),
				context: { taskId: task.id }
			});
		}
	}, [t, task.id]);

	return useMemo<Action[]>((): Action[] => {
		const orderedActions: Action[] = [
			{
				id: 'edit',
				label: t('action.edit', 'Edit'),
				icon: 'Edit2Outline',
				onClick: editAction
			},
			{
				id: 'delete',
				label: t('action.delete', 'Delete'),
				icon: 'Trash2Outline',
				onClick: openDeleteModal,
				color: 'error'
			}
		];
		if (status === Status.Complete) {
			orderedActions.unshift({
				id: 'uncomplete',
				label: t('action.uncomplete', 'Uncomplete'),
				icon: 'RadioButtonOffOutline',
				onClick: reopenActionHandler
			});
		} else if (status === Status.Open) {
			orderedActions.unshift({
				id: 'complete',
				label: t('action.complete', 'Complete'),
				icon: 'CheckmarkCircle2Outline',
				onClick: completeActionHandler
			});
		}
		return orderedActions;
	}, [completeActionHandler, editAction, openDeleteModal, reopenActionHandler, status, t]);
};
