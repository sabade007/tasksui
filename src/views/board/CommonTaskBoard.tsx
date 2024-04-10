/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
	Button,
	type ButtonProps,
	Checkbox,
	type CheckboxProps,
	Container,
	DateTimePicker,
	type DateTimePickerProps,
	Icon,
	type IconProps,
	Input,
	type InputProps,
	Padding,
	Select,
	type SelectItem,
	type SingleSelectionOnChange,
	Switch,
	type SwitchProps,
	TextArea,
	type TextAreaProps
} from '@zextras/carbonio-design-system';
import { t, useBoardHooks } from '@zextras/carbonio-shell-ui';
import { find, size, trim } from 'lodash';

import { CustomSelectLabelFactory } from '../../components/CustomSelectLabelFactory';
import { Text } from '../../components/Text';
import {
	ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT,
	TASK_DESCRIPTION_MAX_LENGTH,
	TASK_TITLE_MAX_LENGTH,
	TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT
} from '../../constants';
import { Priority } from '../../gql/types';

const PrioritySelectionItem = ({
	icon,
	iconColor,
	label
}: {
	icon: IconProps['icon'];
	iconColor: IconProps['color'];
	label: string;
}): React.JSX.Element => (
	<Container width="fit" mainAlignment="flex-start" orientation="horizontal" gap={'1rem'}>
		<Icon icon={icon} color={iconColor} />
		<Text>{label}</Text>
	</Container>
);

const priorityItems: Array<SelectItem> = [
	{
		label: t('task.priority', {
			context: 'high',
			defaultValue: 'High'
		}),
		value: Priority.High,
		customComponent: (
			<PrioritySelectionItem
				icon={'ArrowheadUp'}
				iconColor={'error'}
				label={t('task.priority', {
					context: 'high',
					defaultValue: 'High'
				})}
			/>
		)
	},
	{
		label: t('task.priority', {
			context: 'medium',
			defaultValue: 'Medium'
		}),
		value: Priority.Medium,
		customComponent: (
			<PrioritySelectionItem
				icon={'MinusOutline'}
				iconColor={'gray1'}
				label={t('task.priority', {
					context: 'medium',
					defaultValue: 'Medium'
				})}
			/>
		)
	},
	{
		label: t('task.priority', {
			context: 'low',
			defaultValue: 'Low'
		}),
		value: Priority.Low,
		customComponent: (
			<PrioritySelectionItem
				icon={'ArrowheadDown'}
				iconColor={'info'}
				label={t('task.priority', {
					context: 'low',
					defaultValue: 'Low'
				})}
			/>
		)
	}
];

function isPriorityValidValue(value: string): value is Priority {
	return (Object.values(Priority) as string[]).includes(value);
}

type OnConfirmArg = {
	title: string;
	description: string;
	priority: Priority;
} & (
	| {
			enableReminder: false;
			reminderAllDay?: never;
			reminderAt?: never;
	  }
	| {
			enableReminder: true;
			reminderAllDay: boolean;
			reminderAt: Date;
	  }
);

export interface CommonTaskBoardProps {
	initialTitle: string;
	initialPriority: Priority;
	initialDescription: string;
	initialEnableReminder: boolean;
	initialIsAllDay: boolean;
	initialDate: Date;
	onConfirm: (arg: OnConfirmArg) => void;
	banner?: React.JSX.Element;
	confirmLabel: string;
	defaultBoardTabTitle: string;
}

export const CommonTaskBoard = ({
	initialTitle,
	initialPriority,
	initialDescription,
	initialEnableReminder,
	initialIsAllDay,
	initialDate,
	onConfirm,
	banner,
	confirmLabel,
	defaultBoardTabTitle
}: CommonTaskBoardProps): React.JSX.Element => {
	const { updateBoard } = useBoardHooks();
	useEffect(() => {
		if (initialTitle) {
			updateBoard({ title: initialTitle });
		}
	}, [initialTitle, updateBoard]);

	const [titleValue, setTitleValue] = useState(initialTitle);

	const onTitleChange = useCallback<NonNullable<InputProps['onChange']>>(
		(ev) => {
			setTitleValue(ev.target.value);
			if (size(ev.target.value) === 0) {
				updateBoard({ title: defaultBoardTabTitle });
			} else {
				updateBoard({ title: ev.target.value });
			}
		},
		[defaultBoardTabTitle, updateBoard]
	);

	const [selectedPriority, setSelectedPriority] = useState(initialPriority);

	const onPriorityChange = useCallback<SingleSelectionOnChange>((value) => {
		if (value && isPriorityValidValue(value)) {
			setSelectedPriority(value);
		}
	}, []);

	const prioritySelection = useMemo(() => {
		const selectItem = find(
			priorityItems,
			(priorityItem) => priorityItem.value === selectedPriority
		);
		if (selectItem) {
			return selectItem;
		}
		console.error('Invalid priority select item');
		return priorityItems[1];
	}, [selectedPriority]);

	const [enableReminder, setEnableReminder] = useState(initialEnableReminder);

	const [date, setDate] = useState<Date | null>(initialDate);

	const handleChange = useCallback<NonNullable<DateTimePickerProps['onChange']>>((newDateValue) => {
		setDate(newDateValue);
	}, []);

	const onClickEnableReminder = useCallback<NonNullable<SwitchProps['onClick']>>(
		() =>
			setEnableReminder((prevState) => {
				if (prevState) {
					setDate(initialDate);
				}
				return !prevState;
			}),
		[initialDate]
	);

	const [isAllDay, setIsAllDay] = useState(initialIsAllDay);

	const onClickAllDayCheckbox = useCallback<NonNullable<CheckboxProps['onClick']>>(
		() =>
			setIsAllDay((prevState) => {
				if (!prevState && date === null) {
					setDate(initialDate);
				}
				return !prevState;
			}),
		[date, initialDate]
	);

	const [descriptionValue, setDescriptionValue] = useState(initialDescription);

	const onChangeDescription = useCallback<NonNullable<TextAreaProps['onChange']>>((event) => {
		setDescriptionValue(event.currentTarget.value);
	}, []);

	const isConfirmDisabled = useMemo(
		() =>
			date === null ||
			titleValue.length > TASK_TITLE_MAX_LENGTH ||
			trim(titleValue).length === 0 ||
			descriptionValue.length > TASK_DESCRIPTION_MAX_LENGTH,
		[date, descriptionValue.length, titleValue]
	);

	const onClickConfirmButton = useCallback<NonNullable<ButtonProps['onClick']>>(() => {
		if (enableReminder) {
			onConfirm({
				title: titleValue,
				description: descriptionValue,
				priority: selectedPriority,
				reminderAllDay: isAllDay,
				enableReminder: true,
				reminderAt: date as Date
			});
		} else {
			onConfirm({
				title: titleValue,
				description: descriptionValue,
				priority: selectedPriority,
				enableReminder: false
			});
		}
	}, [date, descriptionValue, enableReminder, isAllDay, onConfirm, selectedPriority, titleValue]);

	return (
		<Container
			crossAlignment={'flex-end'}
			background={'gray5'}
			padding={{ horizontal: 'large', bottom: '2.625rem' }}
		>
			<Padding vertical={'small'}>
				<Button
					disabled={isConfirmDisabled}
					size={'medium'}
					label={confirmLabel}
					onClick={onClickConfirmButton}
				/>
			</Padding>
			{banner}
			<Container
				background={'gray6'}
				mainAlignment={'flex-start'}
				crossAlignment={'flex-start'}
				padding={{ horizontal: 'small', top: 'small' }}
				gap={'0.5rem'}
			>
				<Text weight={'bold'} overflow={'ellipsis'}>
					{t('board.label.details', 'Details')}
				</Text>
				<Container
					orientation={'horizontal'}
					height={'fit'}
					gap={'0.5rem'}
					crossAlignment={'flex-start'}
				>
					<Input
						label={t('board.input.title.label', 'Title*')}
						backgroundColor={'gray5'}
						borderColor={'gray3'}
						value={titleValue}
						onChange={onTitleChange}
						hasError={titleValue.length > TASK_TITLE_MAX_LENGTH}
						description={
							titleValue.length > TASK_TITLE_MAX_LENGTH
								? t(
										'board.input.description.error.label',
										'Maximum length allowed is 1024 characters'
									)
								: undefined
						}
					/>
					<Select
						items={priorityItems}
						background={'gray5'}
						label={t('board.select.priority.label', 'Priority')}
						onChange={onPriorityChange}
						selection={prioritySelection}
						LabelFactory={CustomSelectLabelFactory}
					/>
				</Container>
				<Switch
					value={enableReminder}
					onClick={onClickEnableReminder}
					label={t('board.switch.enableReminder.label', 'Enable reminder')}
				/>

				{enableReminder && (
					<DateTimePicker
						width={'fill'}
						label={t('board.dateTimePicker.reminder.label', 'Reminder')}
						defaultValue={date || undefined}
						includeTime={!isAllDay}
						onChange={handleChange}
						dateFormat={
							isAllDay
								? ALL_DAY_DATE_TIME_PICKER_DATE_FORMAT
								: TIME_SPECIFIC_DATE_TIME_PICKER_DATE_FORMAT
						}
						hasError={date === null}
						errorLabel={
							date === null
								? t(
										'board.dateTimePicker.description.error.label',
										'The reminder option is enabled, set date and time for it or disable the reminder'
									)
								: undefined
						}
					/>
				)}
				{enableReminder && (
					<Checkbox
						value={isAllDay}
						onClick={onClickAllDayCheckbox}
						label={t('board.checkbox.allDay.label', 'Remind me at every login throughout the day')}
					/>
				)}
				<Text weight={'bold'}>{t('board.label.description', 'Description')}</Text>
				<TextArea
					borderColor={'gray3'}
					label={t('board.textArea.taskDescription.label', 'Task Description')}
					value={descriptionValue}
					onChange={onChangeDescription}
					hasError={descriptionValue.length > TASK_DESCRIPTION_MAX_LENGTH}
					description={
						descriptionValue.length > TASK_DESCRIPTION_MAX_LENGTH
							? t(
									'board.textArea.description.error.label',
									'Maximum length allowed is 4096 characters'
								)
							: undefined
					}
				/>
			</Container>
		</Container>
	);
};
