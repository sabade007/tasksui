/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { Container, Icon, Row } from '@zextras/carbonio-design-system';
import { capitalize } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { PriorityIcon } from './PriorityIcon';
import { Reminder } from './Reminder';
import { Text } from './Text';
import type { Task } from '../gql/types';
import { useReminder } from '../hooks/useReminder';
import type { OneOrMany } from '../types/utils';
import { formatDateFromTimestamp } from '../utils';

type TaskDetailsProps = Pick<
	Task,
	'createdAt' | 'priority' | 'reminderAt' | 'reminderAllDay' | 'description'
>;

const ScrollableContainer = styled(Container)`
	overflow-y: auto;
`;

const DetailItem = ({
	label,
	children
}: {
	label: string;
	children: OneOrMany<React.ReactNode>;
}): React.JSX.Element | null =>
	children ? (
		<Container
			height={'auto'}
			width={'auto'}
			mainAlignment={'flex-start'}
			crossAlignment={'flex-start'}
			flexGrow={1}
			flexShrink={1}
			flexBasis={'fit-content'}
		>
			<Text size={'small'} color={'gray1'}>
				{label}
			</Text>
			<Text size={'medium'} color={'gray0'} overflow={'break-word'}>
				<Row gap={'0.5rem'} wrap={'nowrap'}>
					{children}
				</Row>
			</Text>
		</Container>
	) : null;

export const TaskDetails = ({
	createdAt,
	priority,
	reminderAt,
	reminderAllDay,
	description
}: TaskDetailsProps): React.JSX.Element => {
	const [t, { language }] = useTranslation();
	const { isExpired } = useReminder(reminderAt, reminderAllDay);

	const creationDate = useMemo(
		() => formatDateFromTimestamp(createdAt, { includeTime: false, locale: language }),
		[createdAt, language]
	);

	return (
		<ScrollableContainer mainAlignment={'flex-start'}>
			<Container
				background={'gray6'}
				padding={'1rem'}
				gap={'1rem'}
				height={'auto'}
				mainAlignment={'flex-start'}
				crossAlignment={'flex-start'}
			>
				<Container
					height={'auto'}
					orientation={'horizontal'}
					gap={'1rem'}
					crossAlignment={'flex-start'}
				>
					<DetailItem label={t('displayer.details.creationDate', 'Creation date')}>
						{creationDate}
					</DetailItem>
					<DetailItem label={t('displayer.details.priority', 'Priority')}>
						<PriorityIcon priority={priority} />
						{t('task.priority', {
							context: priority.toLowerCase(),
							defaultValue: capitalize(priority)
						})}
					</DetailItem>
					<DetailItem label={t('displayer.details.reminder', 'Reminder')}>
						{reminderAt && (
							<>
								<Reminder
									reminderAt={reminderAt}
									reminderAllDay={reminderAllDay}
									overflow={'break-word'}
									size={'medium'}
								/>
								{isExpired && (
									<Container height={'fit'} width={'fit'} flexShrink={0}>
										<Icon icon={'AlertTriangle'} color={'warning'} />
									</Container>
								)}
							</>
						)}
					</DetailItem>
				</Container>
				<DetailItem label={t('displayer.details.description', 'Description')}>
					{description}
				</DetailItem>
			</Container>
		</ScrollableContainer>
	);
};
