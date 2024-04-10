/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export const ICON_REGEXP = {
	closeModal: /^icon: Close$/i,
	closeDisplayer: /^icon: CloseOutline$/i,
	completeAction: /^icon: CheckmarkCircle2Outline$/i,
	uncompleteAction: /^icon: RadioButtonOffOutline$/i,
	editAction: /^icon: Edit2Outline$/i,
	deleteAction: /^icon: Trash2Outline$/i,
	highPriority: /^icon: ArrowheadUp$/i,
	inputCalendarIcon: /^icon: CalendarOutline$/i,
	lowPriority: /^icon: ArrowheadDown$/i,
	mediumPriority: /^icon: MinusOutline$/i,
	reminderExpired: /^icon: AlertTriangle$/i,
	reminderComplete: /^icon: Checkmark$/i,
	reminderCompleteAction: /^icon: CheckmarkCircleOutline$/i,
	reminderUndoAction: /^icon: UndoOutline$/i,
	switchOff: /^icon: ToggleLeftOutline$/i,
	switchOn: /^icon: ToggleRight$/i
} as const;

export const TEST_ID_SELECTOR = {
	tooltip: 'tooltip',
	hoverBar: 'hover-bar',
	listItem: 'list-item',
	listItemContent: 'list-item-content',
	dropdown: 'dropdown-popper-list',
	modal: 'modal'
};

export const EMPTY_DISPLAYER_HINT = 'Start organizing your day.';
export const EMPTY_LIST_HINT = "It looks like there's nothing here.";

export const TIMERS = {
	modal: { delayOpen: 1 }
};
