/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import { Container, Icon, Row } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { ContextualMenu } from './ContextualMenu';
import { ListItemHoverBar } from './ListItemHoverBar';
import { PriorityIcon } from './PriorityIcon';
import { Reminder } from './Reminder';
import { HoverContainer, ListItemContainer } from './StyledComponents';
import { Text } from './Text';
import { LIST_ITEM_HEIGHT } from '../constants';
import { type Task, Status } from '../gql/types';
import { useActions } from '../hooks/useActions';
import { useReminder } from '../hooks/useReminder';

type ListItemContentProps = Pick<
	Task,
	'id' | 'priority' | 'reminderAt' | 'reminderAllDay' | 'title' | 'status'
> & {
	visible?: boolean;
	onClick?: (id: string) => void;
};

const ReminderIconContainer = styled(Container)`
	height: ${({ theme }): string => `${parseFloat(theme.sizes.font.small) * 1.5}rem`};
`;

const ContentContainer = styled(Container)`
	overflow: hidden;
`;

export const ListItemContent = React.memo<ListItemContentProps>(function ListItemContentFn({
	id,
	priority,
	reminderAt,
	title,
	reminderAllDay,
	onClick,
	status,
	// others props
	visible
}) {
	const [t] = useTranslation();
	const { isExpired: isReminderExpired } = useReminder(reminderAt, reminderAllDay);
	const actions = useActions({ id, title, status });

	const clickHandler = useCallback<React.MouseEventHandler<HTMLDivElement>>(() => {
		onClick?.(id);
	}, [id, onClick]);

	const missingReminderLabel = useMemo(
		() => t('tasksListItem.reminder.doNotRemindMe', 'Do not remind me'),
		[t]
	);

	const preventTextSelection = useCallback<React.MouseEventHandler<HTMLDivElement>>((e) => {
		if (e.detail > 1) {
			e.preventDefault();
		}
	}, []);

	return (
		<Container data-testid={id} height={LIST_ITEM_HEIGHT}>
			{visible && (
				<ContextualMenu actions={actions}>
					<ListItemContainer
						height={'fit'}
						crossAlignment={'flex-end'}
						onMouseDown={preventTextSelection}
						onClick={clickHandler}
						data-testid={'list-item-content'}
					>
						<HoverContainer
							height={LIST_ITEM_HEIGHT}
							wrap="nowrap"
							mainAlignment="flex-start"
							crossAlignment="center"
							padding={{ all: 'small' }}
							width="fill"
							gap={'1rem'}
						>
							<ContentContainer
								orientation="vertical"
								height={'auto'}
								maxHeight={'100%'}
								gap={'0.25rem'}
								width="fill"
								mainAlignment={'flex-start'}
							>
								<Row gap={'0.25rem'} width="fill" wrap="nowrap">
									{status === Status.Complete && (
										<Container width={'fit'} height={'fit'} flexShrink={0}>
											<Icon size={'large'} icon={'Checkmark'} color={'success'} />
										</Container>
									)}
									<Text overflow="ellipsis" size="medium">
										{title}
									</Text>
									<Container margin={{ left: 'auto' }} width={'fit'} height={'fit'} flexShrink={0}>
										<PriorityIcon priority={priority} />
									</Container>
								</Row>
								<Row
									gap={'0.25rem'}
									width="fill"
									wrap="nowrap"
									mainAlignment="space-between"
									crossAlignment={'flex-start'}
								>
									<Container
										flexShrink={1}
										flexGrow={1}
										flexBasis="auto"
										mainAlignment="flex-start"
										orientation="horizontal"
										minWidth={0}
										width="auto"
										height={'auto'}
										wrap={'wrap-reverse'}
										crossAlignment={'flex-start'}
									>
										{reminderAt ? (
											<>
												<Text size="small">
													{t('tasksListItem.reminder.remindMeOn', 'Remind me on')}&nbsp;
												</Text>
												<Container width={'fit'} height={'fit'} flexShrink={0} maxWidth={'100%'}>
													<Reminder reminderAt={reminderAt} reminderAllDay={reminderAllDay} />
												</Container>
											</>
										) : (
											<Text color="secondary" size="small">
												{missingReminderLabel}
											</Text>
										)}
									</Container>
									{isReminderExpired && (
										<ReminderIconContainer width={'fit'} flexShrink={0}>
											<Icon icon="AlertTriangle" color="warning" />
										</ReminderIconContainer>
									)}
								</Row>
							</ContentContainer>
						</HoverContainer>
						<ListItemHoverBar actions={actions} />
					</ListItemContainer>
				</ContextualMenu>
			)}
		</Container>
	);
});
