/*** Copyright 2018 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.css';

import { I18NProvider } from 'calc2/i18n';
import { Store } from 'calc2/store';

import { ConnectedCalc } from './views/calc';
import { Help } from './views/help';
import { Landing } from './views/landing';
import { Imprint } from './views/imprint';
import { ExerciseMakerView } from './views/exMaker';

require('calc2/style/index.scss');

type Props = {
	store: Store,
};

type State = {
	isNavbarOpen: boolean,
};


export class Main extends React.Component<Props, State> {
	
	constructor(props: Props) {
		super(props);
		this.state = {
			isNavbarOpen: true,
		};
	}
	
	componentDidMount(){
		const element = document.getElementById('loadingScreen');
		element?.parentNode?.removeChild(element);
	}

	render() {
		const { store } = this.props;

		return (
			<Router>
				<Provider store={store}>
					<I18NProvider>
						<Switch>
							<Redirect exact from="/" to={`/relax-modified/landing`} />
							<Redirect exact from="/relax" to={`/relax-modified/landing`} />
							<Redirect exact from="/relax-modified" to={`/relax-modified/landing`} />
							<Route path="/relax-modified/landing" component={Landing} />
							<Route path="/relax-modified/help" component={Help} />
							<Route path="/relax-modified/imprint" component={Imprint} />

							<Redirect from="/relax-modified/calc" to="/relax-modified/calc/group/local/uibk/local/0" exact strict />
							<Route path="/relax-modified/calc/:loadType/:source/:id/:filename/:index" component={ConnectedCalc} />
							<Route path="/relax-modified/calc/:loadType/:source/:id" component={ConnectedCalc} />

							<Route path="/relax-modified/exercise-maker" component={ExerciseMakerView} />

							<Route path="/relax-modified/api/:loadType/:source/:id/:filename/:index" component={ConnectedCalc} />
							<Route path="/relax-modified/api/:loadType/:source/:id" component={ConnectedCalc} />
							<Route render={match => (
								<div className="view-min"><h1>404</h1>
									<p>This route doesn't exist</p>
									<span>{JSON.stringify(match)}</span>
								</div>
							)} />
						</Switch>
					</I18NProvider>
				</Provider>
			</Router>
		);
	}
}
