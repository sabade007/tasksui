/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, Suspense, useEffect } from 'react';

import {
	ACTION_TYPES,
	addBoard,
	addBoardView,
	addRoute,
	registerActions,
	type SecondaryBarComponentProps,
	Spinner
} from '@zextras/carbonio-shell-ui';
import { useTranslation } from 'react-i18next';
import { Route } from 'react-router-dom';

import { RemindersManager } from './components/RemindersManager';
import { TASKS_APP_ID, TASKS_ROUTE } from './constants';
import { ProvidersWrapper } from './providers/ProvidersWrapper';

const LazyAppView = lazy(() => import(/* webpackChunkName: "appView" */ './views/app/AppView'));

const LazySecondaryBarView = lazy(
	() => import(/* webpackChunkName: "secondaryView" */ './views/secondary-bar/SecondaryBarView')
);

const LazyNewTaskBoardView = lazy(
	() => import(/* webpackChunkName: "newTaskView" */ './views/board/NewTaskBoard')
);

const LazyEditTaskBoardView = lazy(
	() => import(/* webpackChunkName: "editTaskView" */ './views/board/EditTaskBoard')
);

const AppView = (): React.JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<LazyAppView />
	</Suspense>
);

const SecondaryBarView = (props: SecondaryBarComponentProps): React.JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<LazySecondaryBarView {...props} />
	</Suspense>
);

const NewTaskBoardView = (): React.JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<ProvidersWrapper>
			<LazyNewTaskBoardView />
		</ProvidersWrapper>
	</Suspense>
);

const EditTaskBoardView = (): React.JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<ProvidersWrapper>
			<LazyEditTaskBoardView />
		</ProvidersWrapper>
	</Suspense>
);

const App = (): React.ReactNode => {
	const [t] = useTranslation();

	useEffect(() => {
		const appNameLabel = t('label.app_name', 'Tasks');

		addRoute({
			route: TASKS_ROUTE,
			position: 600,
			visible: true,
			label: appNameLabel,
			primaryBar: 'CheckmarkCircle2Outline',
			secondaryBar: SecondaryBarView,
			appView: AppView
		});

		// boards
		addBoardView({
			route: `${TASKS_ROUTE}/new`,
			component: NewTaskBoardView
		});
		addBoardView({
			route: `${TASKS_ROUTE}/edit`,
			component: EditTaskBoardView
		});
	}, [t]);

	useEffect(() => {
		// create button actions
		registerActions({
			id: 'new-task',
			type: ACTION_TYPES.NEW,
			action: () => ({
				id: 'new-task',
				label: t('label.new', 'New Task'),
				icon: 'CheckmarkCircle2Outline',
				onClick: (): void => {
					addBoard({ url: `${TASKS_ROUTE}/new`, title: t('board.newTask.title', 'New Task') });
				},
				disabled: false,
				primary: true,
				group: TASKS_APP_ID
			})
		});
	}, [t]);

	return (
		<Route path={`/:module/:taskId?`}>
			<ProvidersWrapper>
				<RemindersManager />
			</ProvidersWrapper>
		</Route>
	);
};

export default App;
