/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import {
	Accordion,
	type AccordionItemType,
	Container,
	IconButton,
	Tooltip
} from '@zextras/carbonio-design-system';
import { useUserAccount } from '@zextras/carbonio-shell-ui';
import { flatMap, map, noop } from 'lodash';
import { useTranslation } from 'react-i18next';

function buildCollapsedItem(item: AccordionItemType): React.JSX.Element[] {
	const element = (
		<Tooltip label={item.label}>
			<IconButton
				customSize={{ iconSize: 'large', paddingSize: 'small' }}
				icon={item.icon || ''}
				onClick={item.onClick || noop}
				backgroundColor={(item.active && 'highlight') || undefined}
				iconColor={item.iconCustomColor || item.iconColor}
			/>
		</Tooltip>
	);
	const list: React.JSX.Element[] = [element];
	if (item.items && item.items.length > 0) {
		list.push(...flatMap(item.items, (subItem) => buildCollapsedItem(subItem)));
	}
	return list;
}

const SecondaryBarView = ({ expanded }: { expanded: boolean }): React.JSX.Element => {
	const [t] = useTranslation();
	const { name } = useUserAccount();

	const items = useMemo<AccordionItemType[]>(
		() => [
			{
				id: 'id1',
				label: name,
				icon: 'HomeOutline',
				open: true,
				items: [
					{
						id: 'id2',
						icon: 'CheckmarkCircle2Outline',
						label: t('secondaryBar.allTasks', 'All Tasks'),
						onClick: (ev): void => {
							ev.stopPropagation();
						},
						active: true
					}
				],
				onClick: (ev: React.SyntheticEvent | KeyboardEvent): void => {
					ev.stopPropagation();
				}
			}
		],
		[name, t]
	);

	const collapsedItems = useMemo(() => map(items, (item) => buildCollapsedItem(item)), [items]);

	return (
		<Container
			height="auto"
			orientation="vertical"
			mainAlignment="flex-start"
			crossAlignment="flex-start"
		>
			{(expanded && <Accordion role="menuitem" items={items} />) || (
				<Container mainAlignment={'flex-start'}>{collapsedItems}</Container>
			)}
		</Container>
	);
};
export default SecondaryBarView;
