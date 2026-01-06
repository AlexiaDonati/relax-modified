/*** Copyright 2018 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { AppContainer } from 'react-hot-loader';

import 'custom-event-polyfill';
import './404.html';
import { i18n } from './i18n';
import Main from './main.hot';

import { store } from './store';
import { loadStaticGroups } from 'calc2/store/groups';
import { loadStaticExercises } from 'calc2/store/exercise';
import { SET_LOCALE } from 'calc2/store/session';

// app
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
	<AppContainer>
		<Main store={store} />
	</AppContainer>
);

// init
{
	const action: SET_LOCALE = {
		type: 'SET_LOCALE',
		locale: i18n.language,
	};
	store.dispatch(action);
}

// load all predefined groups
for (const action of loadStaticGroups()) {
	store.dispatch(action);
}

// load all predefined exercises
for (const action of loadStaticExercises()) {
	store.dispatch(action);
}