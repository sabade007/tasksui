/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Modal } from '@zextras/carbonio-design-system';
import { getNotificationManager, updatePrimaryBadge } from '@zextras/carbonio-shell-ui';
import { isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import {
	chain,
	cloneDeep,
	differenceBy,
	filter,
	find,
	findIndex,
	flatMap,
	flatten,
	forEach,
	groupBy,
	intersectionWith,
	isEqual,
	map,
	pullAt,
	reduce,
	remove,
	some
} from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { ReminderModalContent } from './ReminderModalContent';
import { ReminderModalFooter } from './ReminderModalFooter';
import { REMINDER_TIMEOUT_LIMIT, REMINDERS_INTERVAL_UPDATE, TASKS_ROUTE } from '../constants';
import { FindTasksDocument, Status, type Task, UpdateTaskStatusDocument } from '../gql/types';
import { debounceWithAllArgs, formatDateFromTimestamp } from '../utils';

type TaskWithReminder = Pick<Task, 'id' | 'title' | 'priority' | 'reminderAllDay' | 'status'> & {
	reminderAt: NonNullable<Task['reminderAt']>;
};

type ReminderEntity = TaskWithReminder & {
	_reminderTimeout: NodeJS.Timeout | boolean;
	getKey(): string;
	/** Whether the reminder is within the range of time inside which it has to be shown to the user */
	isVisible(): boolean;
	/** Whether the reminder is valid to trigger a notification */
	isValid(): boolean;
	/** Start the timeout for the reminder */
	startTimeout(callback: (...reminders: ReminderEntity[]) => void): NodeJS.Timeout | boolean;
	/** Clear the timeout for the reminder */
	clearTimout(): void;
	/** Identify reminders which have already been shown from the ones which have not */
	hasAlreadyBeenReminded(): boolean;
	/** Identify reminders which have a timeout not yet started */
	isFutureReminder(): boolean;
};

function buildReminderEntity(task: TaskWithReminder): ReminderEntity {
	return {
		...task,
		_reminderTimeout: false,
		getKey(): string {
			return formatDateFromTimestamp(task.reminderAt, {
				includeTime: task.reminderAllDay !== true
			});
		},
		isVisible(): boolean {
			// show only reminders of the current day
			return (
				isToday(task.reminderAt) && (task.reminderAllDay || isBefore(task.reminderAt, Date.now()))
			);
		},
		isValid(): boolean {
			// reminder could trigger a notification if it is set for the current day, but also for the future,
			// because the session could be open at midnight, and at that moment the reminders of
			// tomorrow should be shown instead of the one of today
			return isToday(task.reminderAt) || isAfter(task.reminderAt, Date.now());
		},
		startTimeout(callback): NodeJS.Timeout | boolean {
			// start a timeout to trigger the reminder only when the reminder is in the future or in the current moment
			const reminderTime = task.reminderAllDay
				? startOfDay(task.reminderAt).getTime()
				: task.reminderAt;
			const epochDiffFromNow = reminderTime - Date.now();
			if (epochDiffFromNow >= 0) {
				if (epochDiffFromNow <= REMINDER_TIMEOUT_LIMIT) {
					this._reminderTimeout = setTimeout(() => {
						callback(this);
					}, epochDiffFromNow);
				} else {
					this._reminderTimeout = true;
				}
			}
			return this._reminderTimeout;
		},
		clearTimout(): void {
			if (typeof this._reminderTimeout !== 'boolean') {
				clearTimeout(this._reminderTimeout);
				this._reminderTimeout = false;
			}
		},
		hasAlreadyBeenReminded(): boolean {
			return this._reminderTimeout === false;
		},
		isFutureReminder(): boolean {
			return this._reminderTimeout === true;
		}
	} satisfies ReminderEntity;
}

function isTaskWithReminder(task: Partial<Task> | null | undefined): task is TaskWithReminder {
	return typeof task?.reminderAt === 'number';
}

export const RemindersManager = (): React.JSX.Element => {
	const [t] = useTranslation();
	const notificationManager = getNotificationManager();

	// query used to register new task when the list changes
	const { data: remindersData, previousData: remindersPreviousData } = useQuery(FindTasksDocument, {
		variables: {
			status: Status.Open
		},
		fetchPolicy: 'cache-only',
		errorPolicy: 'all'
	});
	// lazy query used to load data at first load
	const [findRemindersLazyQuery] = useLazyQuery(FindTasksDocument, {
		variables: { status: Status.Open }
	});
	const [updateTaskStatus] = useMutation(UpdateTaskStatusDocument);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	// Array of group of reminders.
	// Each group represents a date block,
	// with the date formatted and the list of reminders for that date
	const [modalReminders, setModalReminders] = useState<
		Array<{ date: string; reminders: TaskWithReminder[] }>
	>([]);
	const modalRemindersRef = useRef<Array<{ date: string; reminders: TaskWithReminder[] }>>([]);
	// map of tasks keyed by reminder date (formatted)
	const remindersByDateRef = useRef<Record<string, ReminderEntity[]>>({});
	const location = useLocation();
	// both memo and ref to have a var which trigger rerender on update and one which does not
	const isTasksView = useMemo(() => location.pathname.includes(TASKS_ROUTE), [location.pathname]);
	const isTasksViewRef = useRef<boolean>(isTasksView);
	const isBadgeVisibleRef = useRef<boolean>(false);
	const remindersToStartRef = useRef<ReminderEntity[]>([]);
	const updateTimeoutsIntervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		isTasksViewRef.current = isTasksView;
	}, [isTasksView]);

	const getVisibleReminders = useCallback(
		() =>
			// Extract all reminders that have to be shown and order them by date ascending.
			// Exclude from this list the ones that have an active timer
			chain(remindersByDateRef.current)
				.reduce<typeof modalReminders>((accumulator, reminderGroup, dateKey) => {
					// show reminders which are visible
					// (check only the first one since they are grouped by datetime)
					if (reminderGroup.length > 0 && reminderGroup[0].isVisible()) {
						// Pick only reminders which cannot trigger a notification anymore. In other words,
						// filter out reminders with an active timout, which need to be shown in a different group
						const remindersToShow = reminderGroup.filter((reminder) =>
							reminder.hasAlreadyBeenReminded()
						);
						if (remindersToShow.length > 0) {
							accumulator.push({
								date: dateKey,
								reminders: remindersToShow
							});
						}
					}
					return accumulator;
				}, [])
				// Sort reminders by date. All-day entries are shown as first group for the day
				.sortBy((reminderModalEntry) => reminderModalEntry.date)
				.value(),
		[]
	);

	const notifyReminders = useCallback(
		(badgeCount: number | undefined) => {
			notificationManager.notify({ showPopup: false, playSound: true });
			// show badge only if view is not within "tasks" module
			if (!isTasksViewRef.current) {
				updatePrimaryBadge(
					{ show: true, count: badgeCount, showCount: badgeCount !== undefined },
					TASKS_ROUTE
				);
				isBadgeVisibleRef.current = true;
			}
		},
		[notificationManager]
	);

	const _showReminder = useCallback(
		(...reminders: ReminderEntity[]): void => {
			setIsModalOpen((alreadyOpen) => {
				if (alreadyOpen) {
					// Distinguish between new reminders and already existing reminders:
					// place new reminders on the bottom of the existing list,
					// and keep already existing reminders at same position. For these, update only the status
					// (for now), to avoid having updated titles under a wrong reminder date.
					setModalReminders((prevState) => {
						const newState = cloneDeep(prevState);
						const newReminders: ReminderEntity[] = [];
						const prevRemindersFlat = flatMap(
							newState,
							(prevStateEntry) => prevStateEntry.reminders
						);
						forEach(reminders, (reminder) => {
							const existingReminder = find(
								prevRemindersFlat,
								(prevReminder) => prevReminder.id === reminder.id
							);
							if (existingReminder) {
								existingReminder.status = reminder.status;
							} else {
								newReminders.push(reminder);
							}
						});
						const remindersByDate = groupBy(newReminders, (reminder) => reminder.getKey());
						const newReminderEntries = map(remindersByDate, (reminderGroup, dateKey) => ({
							date: dateKey,
							reminders: reminderGroup
						}));
						newState.push(...newReminderEntries);
						return newState;
					});
					// keep modal open
					return true;
				}
				const remindersByDate = groupBy(reminders, (reminder) => reminder.getKey());
				const reminderEntries = map(remindersByDate, (reminderGroup, dateKey) => ({
					date: dateKey,
					reminders: reminderGroup
				}));
				const remindersByDateList = getVisibleReminders();
				// re-build list entirely and place new reminders on top
				const newModalReminders = [...reminderEntries, ...remindersByDateList];
				setModalReminders(newModalReminders);
				// open modal if there is something to show
				const shouldOpenModal = newModalReminders.length > 0;
				// reset timout for reminders shown with this call so that they result as already seen in next modals
				forEach(reminders, (reminder) => {
					reminder.clearTimout();
				});
				return shouldOpenModal;
			});
		},
		[getVisibleReminders]
	);

	useEffect(() => {
		const diffNewDate = differenceBy(
			modalReminders,
			modalRemindersRef.current,
			(item) => item.date
		);

		modalRemindersRef.current = modalReminders;

		if (diffNewDate.length > 0) {
			// notify with a sound the opening of the modal or the adding of a new reminder in the modal
			notifyReminders(flatMap(modalReminders, (reminderGroup) => reminderGroup.reminders).length);
		}
	}, [modalReminders, notifyReminders]);

	const showReminderDebounced = useMemo(() => debounceWithAllArgs(_showReminder), [_showReminder]);

	const registerReminder = useCallback(
		(reminder: ReminderEntity): void => {
			const remindersByDate = remindersByDateRef.current;
			const dateKey = reminder.getKey();
			if (remindersByDate[dateKey] === undefined) {
				remindersByDate[dateKey] = [];
			}
			// add reminder to the map only if it is not completed, and it is not yet registered
			if (
				reminder.status !== Status.Complete &&
				!some(
					remindersByDate[dateKey],
					(registeredReminder) => registeredReminder.id === reminder.id
				)
			) {
				reminder.startTimeout(showReminderDebounced);
				remindersByDate[dateKey].push(reminder);
			}
		},
		[showReminderDebounced]
	);

	const unregisterReminder = useCallback((reminder: ReminderEntity): void => {
		const remindersByDate = remindersByDateRef.current;
		const dateKey = reminder.getKey();
		if (remindersByDate[dateKey] !== undefined) {
			const removedItems = remove(
				remindersByDate[dateKey],
				(registeredReminder) => registeredReminder.id === reminder.id
			);
			if (remindersByDate[dateKey].length === 0) {
				delete remindersByDate[dateKey];
			}
			forEach(removedItems, (item) => {
				// clear timout for the removed reminders
				item.clearTimout();
			});
		}
	}, []);

	const findRegisteredReminder = useCallback(
		(
			reminder: Pick<ReminderEntity, 'id'>
		): { key: string; index: number } | { key: undefined; index: undefined } =>
			// Find the previous position of the reminder by searching inside all the entries.
			// Retrieve both the dateKey and the index with a "reduce" to make a single cycle.
			// The two fields are both valued or both undefined, there cannot be a hybrid situation.
			reduce<
				typeof remindersByDateRef.current,
				{ key: string; index: number } | { key: undefined; index: undefined }
			>(
				remindersByDateRef.current,
				(result, reminders, key) => {
					const reminderIndex = findIndex(reminders, (item) => item.id === reminder.id);
					if (reminderIndex >= 0) {
						return { key, index: reminderIndex };
					}
					return result;
				},
				{ key: undefined, index: undefined }
			),
		[]
	);

	const updateRegisteredReminder = useCallback(
		(reminder: ReminderEntity): void => {
			const remindersByDate = remindersByDateRef.current;
			const { key: prevKey, index: prevIndex } = findRegisteredReminder(reminder);
			const newDateKey = reminder.getKey();
			if (!prevKey || remindersByDate[prevKey] === undefined || prevIndex < 0) {
				// if the reminder was not truly registered, register it
				registerReminder(reminder);
				return;
			}
			// if the reminder was truly registered
			// clear the timeout of the previous object
			remindersByDate[prevKey][prevIndex].clearTimout();
			if (reminder.status === Status.Complete) {
				// if the status has changed and now the task is completed, clear the previous position
				pullAt(remindersByDate[prevKey], prevIndex);
				return;
			}
			// if the status is still not complete, start the new timer
			reminder.startTimeout(showReminderDebounced);
			if (prevKey === newDateKey) {
				// if the key is not changed (reminderAt and reminderAllDay are not changed) update the reminder keeping the same position
				remindersByDate[prevKey][prevIndex] = reminder;
				return;
			}
			// otherwise clear the previous position and push the item to the new dateKey map
			pullAt(remindersByDate[prevKey], prevIndex);
			// delete the entry from the map if there is no reminder left for it
			if (remindersByDate[prevKey].length === 0) {
				delete remindersByDate[prevKey];
			}
			if (remindersByDate[newDateKey] === undefined) {
				remindersByDate[newDateKey] = [];
			}
			remindersByDate[newDateKey].push(reminder);
		},
		[findRegisteredReminder, registerReminder, showReminderDebounced]
	);

	const registerRemindersFromTasks = useCallback(
		(tasks: Array<Partial<Task> | null>) => {
			forEach(tasks, (task) => {
				if (isTaskWithReminder(task)) {
					const reminder = buildReminderEntity(task);
					if (reminder.isValid()) {
						registerReminder(reminder);
					}
				}
			});
		},
		[registerReminder]
	);

	useEffect(() => {
		// init reminders manager by requesting all tasks with the lazy query
		remindersByDateRef.current = {};
		findRemindersLazyQuery()
			.then((result) => {
				if (result?.data?.findTasks) {
					registerRemindersFromTasks(result.data.findTasks);
				}
			})
			.then(() => {
				// show reminders on the first load of the module
				showReminderDebounced();
			});

		return (): void => {
			// on unload cleanup timers
			const allReminders = flatten(Object.values(remindersByDateRef.current));
			allReminders.forEach((reminder) => {
				reminder.clearTimout();
			});
			showReminderDebounced.cancel();
			updateTimeoutsIntervalRef.current && clearInterval(updateTimeoutsIntervalRef.current);
		};
	}, [findRemindersLazyQuery, registerRemindersFromTasks, showReminderDebounced]);

	const startFutureReminders = useCallback(() => {
		forEach(remindersToStartRef.current, (reminder) => {
			reminder.startTimeout(showReminderDebounced);
		});
	}, [showReminderDebounced]);

	const checkForFutureRemindersToStart = useCallback(() => {
		const remindersToStart = reduce<typeof remindersByDateRef.current, ReminderEntity[]>(
			remindersByDateRef.current,
			(accumulator, remindersForDate) =>
				accumulator.concat(filter(remindersForDate, (reminder) => reminder.isFutureReminder())),
			[]
		);
		remindersToStartRef.current = remindersToStart;
		if (remindersToStart.length === 0 && updateTimeoutsIntervalRef.current) {
			clearInterval(updateTimeoutsIntervalRef.current);
		} else if (remindersToStart.length > 0 && !updateTimeoutsIntervalRef.current) {
			updateTimeoutsIntervalRef.current = setInterval(
				startFutureReminders,
				REMINDERS_INTERVAL_UPDATE
			);
		}
	}, [startFutureReminders]);

	useEffect(() => {
		// listen for changes to the list which don't trigger an update of the modal:
		// - remove those which have been removed (compare previous data with current one)
		// - register those which have been added (compare current data with previous one)
		const removedTasks = differenceBy(
			remindersPreviousData?.findTasks ?? [],
			remindersData?.findTasks ?? [],
			(task) => task?.id
		);
		removedTasks.forEach((task) => {
			if (isTaskWithReminder(task)) {
				const reminder = buildReminderEntity(task);
				unregisterReminder(reminder);
			}
		});
		const addedTasks = differenceBy(
			remindersData?.findTasks ?? [],
			remindersPreviousData?.findTasks ?? [],
			(task) => task?.id
		);
		registerRemindersFromTasks(addedTasks);
		checkForFutureRemindersToStart();
	}, [
		checkForFutureRemindersToStart,
		registerRemindersFromTasks,
		remindersData?.findTasks,
		remindersPreviousData?.findTasks,
		unregisterReminder,
		updateRegisteredReminder
	]);

	useEffect(() => {
		// listen for changes to the list which need to trigger an update of the modal:
		// - update registered reminders of those which reminder has been updated
		const modifiedTasks = intersectionWith(
			remindersData?.findTasks ?? [],
			remindersPreviousData?.findTasks ?? [],
			(newTask, prevTask) =>
				newTask !== null &&
				prevTask !== null &&
				newTask.id === prevTask.id &&
				!isEqual(newTask, prevTask)
		);
		const updatedReminders = modifiedTasks.reduce<ReminderEntity[]>((accumulator, task) => {
			if (isTaskWithReminder(task)) {
				const reminder = buildReminderEntity(task);
				updateRegisteredReminder(reminder);
				accumulator.push(reminder);
			}
			return accumulator;
		}, []);
		if (modifiedTasks.length > 0 && isModalOpen) {
			showReminderDebounced(...updatedReminders);
		}
		checkForFutureRemindersToStart();
	}, [
		checkForFutureRemindersToStart,
		isModalOpen,
		remindersData?.findTasks,
		remindersPreviousData?.findTasks,
		showReminderDebounced,
		updateRegisteredReminder
	]);

	const flatMapOfModalReminders = useMemo(
		() => flatMap(modalReminders, ({ reminders }) => reminders),
		[modalReminders]
	);

	const closeModalHandler = useCallback(() => {
		setIsModalOpen(false);
	}, []);

	const completeTaskHandler = useCallback(
		(task: Pick<Task, 'id'>) => () =>
			updateTaskStatus({
				variables: {
					id: task.id,
					status: Status.Complete
				},
				optimisticResponse: {
					updateTask: {
						id: task.id,
						status: Status.Complete
					}
				}
			}),
		[updateTaskStatus]
	);

	const updateTaskToOpen = useCallback(
		(task: Pick<Task, 'id'>) => () =>
			updateTaskStatus({
				variables: {
					id: task.id,
					status: Status.Open
				},
				optimisticResponse: {
					updateTask: {
						id: task.id,
						status: Status.Open
					}
				}
			}),
		[updateTaskStatus]
	);

	const completeAllHandler = useCallback(() => {
		forEach(flatMapOfModalReminders, (reminder) => {
			if (reminder.status !== Status.Complete) {
				completeTaskHandler(reminder)();
			}
		});
	}, [completeTaskHandler, flatMapOfModalReminders]);

	const undoAllHandler = useCallback(() => {
		forEach(flatMapOfModalReminders, (reminder) => {
			if (reminder.status === Status.Complete) {
				updateTaskToOpen(reminder)();
			}
		});
	}, [flatMapOfModalReminders, updateTaskToOpen]);

	const isActionForAllAvailable = useMemo(
		() => flatMapOfModalReminders.length > 1,
		[flatMapOfModalReminders]
	);

	const showCompleteAll = useMemo(
		() =>
			isActionForAllAvailable &&
			some(flatMapOfModalReminders, (reminder) => reminder.status !== Status.Complete),
		[flatMapOfModalReminders, isActionForAllAvailable]
	);

	const secondaryActionLabel = useMemo(
		() =>
			showCompleteAll
				? t('modal.reminder.completeAll', 'Complete all')
				: t('modal.reminder.undoAll', 'Undo all'),
		[showCompleteAll, t]
	);

	const secondaryActionHandler = useMemo(
		() => (showCompleteAll ? completeAllHandler : undoAllHandler),
		[completeAllHandler, showCompleteAll, undoAllHandler]
	);

	const secondaryActionIcon = useMemo(
		() => (showCompleteAll ? 'CheckmarkCircleOutline' : 'UndoOutline'),
		[showCompleteAll]
	);

	useEffect(() => {
		if (isTasksView && isBadgeVisibleRef.current) {
			// hide badge when entering tasks view if it is visible
			updatePrimaryBadge({ show: false }, TASKS_ROUTE);
		}
	}, [isTasksView]);

	return (
		<Modal
			title={t('modal.reminder.title', 'Tasks reminders')}
			open={isModalOpen && isTasksView}
			onClose={closeModalHandler}
			closeIconTooltip={t('modal.close', 'Close')}
			customFooter={
				<ReminderModalFooter
					closeAction={closeModalHandler}
					showSecondaryAction={isActionForAllAvailable}
					secondaryAction={secondaryActionHandler}
					secondaryLabel={secondaryActionLabel}
					secondaryIcon={secondaryActionIcon}
				/>
			}
			maxHeight={'90vh'}
		>
			<ReminderModalContent
				reminders={modalReminders}
				completeAction={completeTaskHandler}
				undoCompleteAction={updateTaskToOpen}
			/>
		</Modal>
	);
};
