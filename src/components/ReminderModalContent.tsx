/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { Container, Icon, Button, Row, Tooltip } from '@zextras/carbonio-design-system';
import { map } from 'lodash';
import { useTranslation } from 'react-i18next';

import { PriorityIcon } from './PriorityIcon';
import { Text } from './Text';
import { type Priority, Status, type Task } from '../gql/types';

type ReminderItemType = Pick<Task, 'id' | 'title' | 'priority' | 'status'>;

type ReminderGroupType = { date: string; reminders: Array<ReminderItemType> };

interface ReminderGroupProps extends ReminderGroupType {
	completeAction: (item: ReminderItemType) => () => void;
	undoCompleteAction: (item: ReminderItemType) => () => void;
}

interface ReminderItemProps {
	title: string;
	status: Status;
	priority: Priority;
	completeAction: () => void;
	undoCompleteAction: () => void;
}
interface ReminderModalContentProps {
	reminders: Array<ReminderGroupType>;
	completeAction: (item: ReminderItemType) => () => void;
	undoCompleteAction: (item: ReminderItemType) => () => void;
}

const ReminderItem = ({
	title,
	status,
	priority,
	completeAction,
	undoCompleteAction
}: ReminderItemProps): React.JSX.Element => {
	const [t] = useTranslation();

	return (
		<Row wrap={'nowrap'} mainAlignment={'space-between'} gap={'0.25rem'} width={'fill'}>
			<Row flexShrink={1} flexBasis={'fit-content'} gap={'0.25rem'} wrap={'nowrap'} minWidth={'0'}>
				<Row flexShrink={0} minWidth={'fit'}>
					{status !== Status.Complete && <PriorityIcon priority={priority} />}
					{status === Status.Complete && <Icon icon={'Checkmark'} color={'success'} />}
				</Row>
				<Row wrap={'nowrap'} flexShrink={1} minWidth={0} flexGrow={1} mainAlignment={'flex-start'}>
					<Text size={'medium'}>{title}</Text>
				</Row>
				<Row flexShrink={1} flexBasis={'fit-content'}>
					{status === Status.Complete && (
						<Text size={'medium'} weight={'bold'}>
							{t('task.status', {
								context: status.toLowerCase(),
								defaultValue: 'Completed'
							})}
						</Text>
					)}
				</Row>
			</Row>
			<Row flexShrink={0} minWidth={'fit'}>
				{status === Status.Complete && (
					<Tooltip label={t('action.undo')}>
						<Button
							type={'ghost'}
							color={'text'}
							onClick={undoCompleteAction}
							icon={'UndoOutline'}
							size={'large'}
						/>
					</Tooltip>
				)}
				{status !== Status.Complete && (
					<Tooltip label={t('action.complete')}>
						<Button
							type={'ghost'}
							color={'text'}
							onClick={completeAction}
							icon={'CheckmarkCircleOutline'}
							size={'large'}
						/>
					</Tooltip>
				)}
			</Row>
		</Row>
	);
};

const ReminderGroup = ({
	date,
	reminders,
	completeAction,
	undoCompleteAction
}: ReminderGroupProps): React.JSX.Element | null => {
	const [t] = useTranslation();

	const items = useMemo(
		() =>
			map(reminders, (reminder) => (
				<ReminderItem
					key={reminder.id}
					title={reminder.title}
					status={reminder.status}
					priority={reminder.priority}
					completeAction={completeAction(reminder)}
					undoCompleteAction={undoCompleteAction(reminder)}
				/>
			)),
		[completeAction, reminders, undoCompleteAction]
	);

	if (reminders.length === 0) {
		return null;
	}
	return (
		<Container gap={'0.5rem'} height={'fit'} crossAlignment={'flex-start'}>
			<Row gap={'0.5rem'} wrap={'nowrap'}>
				<Text color={'secondary'} size={'medium'}>
					{t('modal.reminder.remindMeOn', 'Remind me on')}
				</Text>
				<Text color={'primary'} size={'medium'}>
					{date}
				</Text>
			</Row>
			<Container gap={'0.5rem'}>{items}</Container>
		</Container>
	);
};

export const ReminderModalContent = ({
	reminders,
	completeAction,
	undoCompleteAction
}: ReminderModalContentProps): React.JSX.Element => {
	const groups = useMemo(
		() =>
			map(reminders, (reminder) => (
				<ReminderGroup
					key={reminder.date}
					completeAction={completeAction}
					undoCompleteAction={undoCompleteAction}
					date={reminder.date}
					reminders={reminder.reminders}
				/>
			)),
		[completeAction, reminders, undoCompleteAction]
	);

	return <Container gap={'1rem'}>{groups}</Container>;
};
