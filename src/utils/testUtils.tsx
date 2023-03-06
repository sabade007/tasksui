/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { ReactElement, useMemo } from 'react';

import { ApolloProvider } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import {
	ByRoleMatcher,
	ByRoleOptions,
	GetAllBy,
	queries,
	queryHelpers,
	render,
	RenderOptions,
	RenderResult,
	screen,
	within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalManager, SnackbarManager } from '@zextras/carbonio-design-system';
import { PreviewManager } from '@zextras/carbonio-ui-preview';
import { GraphQLError } from 'graphql';
import { filter } from 'lodash';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';

import i18next, { i18n } from 'i18next';
import { Mock } from './mockUtils';
import { StyledWrapper } from '../providers/StyledWrapper';

export type UserEvent = ReturnType<(typeof userEvent)['setup']>;

/**
 * Matcher function to search a string in more html elements and not just in a single element.
 */
const queryAllByTextWithMarkup: GetAllBy<[string | RegExp]> = (container, text) =>
	screen.queryAllByText((_content, element) => {
		if (element && element instanceof HTMLElement) {
			const hasText = (singleNode: Element): boolean => {
				const regExp = RegExp(text);
				return singleNode.textContent != null && regExp.test(singleNode.textContent);
			};
			const childrenDontHaveText = Array.from(element.children).every((child) => !hasText(child));
			return hasText(element) && childrenDontHaveText;
		}
		return false;
	});

const getByTextWithMarkupMultipleError = (
	container: Element | null,
	text: string | RegExp
): string => `Found multiple elements with text: ${text}`;
const getByTextWithMarkupMissingError = (
	container: Element | null,
	text: string | RegExp
): string => `Unable to find an element with text: ${text}`;

type ByRoleWithIconOptions = ByRoleOptions & {
	icon: string | RegExp;
};
/**
 * Matcher function to search an icon button through the icon data-testid
 */
const queryAllByRoleWithIcon: GetAllBy<[ByRoleMatcher, ByRoleWithIconOptions]> = (
	container,
	role,
	{ icon, ...options }
) =>
	filter(
		screen.queryAllByRole('button', options),
		(element) => within(element).queryByTestId(icon) !== null
	);
const getByRoleWithIconMultipleError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string => `Found multiple elements with role ${role} and icon ${options.icon}`;
const getByRoleWithIconMissingError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string => `Unable to find an element with role ${role} and icon ${options.icon}`;

const [
	queryByTextWithMarkup,
	getAllByTextWithMarkup,
	getByTextWithMarkup,
	findAllByTextWithMarkup,
	findByTextWithMarkup
] = queryHelpers.buildQueries<[string | RegExp]>(
	queryAllByTextWithMarkup,
	getByTextWithMarkupMultipleError,
	getByTextWithMarkupMissingError
);

const [
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
] = queryHelpers.buildQueries<[ByRoleMatcher, ByRoleWithIconOptions]>(
	queryAllByRoleWithIcon,
	getByRoleWithIconMultipleError,
	getByRoleWithIconMissingError
);

const customQueries = {
	// byTextWithMarkup
	queryByTextWithMarkup,
	getAllByTextWithMarkup,
	getByTextWithMarkup,
	findAllByTextWithMarkup,
	findByTextWithMarkup,
	// byRoleWithIcon
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
};

function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Utility to generate an error for mocks that can be decoded with {@link decodeError}
 * @param message
 */
export function generateError(message: string): GraphQLError {
	return new GraphQLError(`Controlled error: ${message}`);
}

const getAppI18n = (): i18n => {
	const newI18n = i18next.createInstance();
	newI18n
		// init i18next
		// for all options read: https://www.i18next.com/overview/configuration-options
		.init({
			lng: 'en',
			fallbackLng: 'en',
			debug: false,

			interpolation: {
				escapeValue: false // not needed for react as it escapes by default
			},
			resources: { en: { translation: {} } }
		});
	return newI18n;
};

interface WrapperProps {
	children?: React.ReactNode | undefined;
	initialRouterEntries?: string[];
	mocks?: Mock[];
}

const Wrapper = ({ mocks, initialRouterEntries, children }: WrapperProps): JSX.Element => {
	const i18nInstance = useMemo(() => getAppI18n(), []);

	const ApolloProviderWrapper: React.FC = ({ children: apolloChildren }) =>
		mocks ? (
			<MockedProvider mocks={mocks} cache={global.apolloClient.cache}>
				{apolloChildren}
			</MockedProvider>
		) : (
			<ApolloProvider client={global.apolloClient}>{apolloChildren}</ApolloProvider>
		);

	return (
		<ApolloProviderWrapper>
			<MemoryRouter
				initialEntries={initialRouterEntries}
				initialIndex={(initialRouterEntries?.length || 1) - 1}
			>
				<StyledWrapper>
					<I18nextProvider i18n={i18nInstance}>
						<SnackbarManager>
							<ModalManager>
								<PreviewManager>{children}</PreviewManager>
							</ModalManager>
						</SnackbarManager>
					</I18nextProvider>
				</StyledWrapper>
			</MemoryRouter>
		</ApolloProviderWrapper>
	);
};

function customRender(
	ui: React.ReactElement,
	{
		initialRouterEntries = ['/'],
		mocks,
		...options
	}: WrapperProps & {
		options?: Omit<RenderOptions, 'queries' | 'wrapper'>;
	} = {}
): RenderResult<typeof queries & typeof customQueries> {
	return render(ui, {
		wrapper: ({ children }: Pick<WrapperProps, 'children'>) => (
			<Wrapper initialRouterEntries={initialRouterEntries} mocks={mocks}>
				{children}
			</Wrapper>
		),
		queries: { ...queries, ...customQueries },
		...options
	});
}

type SetupOptions = Pick<WrapperProps, 'initialRouterEntries' | 'mocks'> & {
	renderOptions?: Omit<RenderOptions, 'queries' | 'wrapper'>;
	setupOptions?: Parameters<(typeof userEvent)['setup']>[0];
};

export const setup = (
	ui: ReactElement,
	options?: SetupOptions
): { user: UserEvent } & ReturnType<typeof customRender> => ({
	user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime, ...options?.setupOptions }),
	...customRender(ui, {
		initialRouterEntries: options?.initialRouterEntries,
		mocks: options?.mocks,
		...options?.renderOptions
	})
});
