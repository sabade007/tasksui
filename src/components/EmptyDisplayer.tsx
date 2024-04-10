/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useContext } from 'react';

import { Container, Padding } from '@zextras/carbonio-design-system';

import { Text } from './Text';
import { ListContext } from '../contexts';
import { useRandomPlaceholder } from '../hooks/useRandomPlaceholder';

interface EmptyDisplayerProps {
	translationKey: string;
}

export const EmptyDisplayer = ({ translationKey }: EmptyDisplayerProps): React.JSX.Element => {
	const { isFull } = useContext(ListContext);
	const [randomPlaceholder] = useRandomPlaceholder<{
		title: string;
		message?: string;
	}>(translationKey, {
		context: (isFull && 'limitReached') || '',
		defaultValue: [
			isFull
				? {
						title: 'You have reached the maximum number of tasks.',
						message: 'Delete your previous tasks to create more.'
					}
				: {
						title: 'Start organizing your day.',
						message: 'Click the "NEW" button to create a Task.'
					}
		]
	});

	return (
		<Container>
			<Padding all="medium">
				<Text color="gray1" overflow="break-word" weight="bold" size="large" centered>
					{randomPlaceholder?.title || ''}
				</Text>
			</Padding>
			<Text size="small" color="gray1" overflow="break-word" width="60%" centered>
				{randomPlaceholder?.message || ''}
			</Text>
		</Container>
	);
};
