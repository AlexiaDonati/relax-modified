/*** Copyright 2018 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Calculator } from 'calc2/components/calculator';
import * as store from 'calc2/store';
import { Group, GROUPS_LOAD_REQUEST, GROUP_SET_DRAFT } from 'calc2/store/groups';
import { EXERCISES_LOAD_REQUEST } from '../store/exercise';

import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { Api } from './api';
import queryString from 'query-string'


type Props = RouteComponentProps<{
	loadType: string,
	source: string,
	id: string,
	filename: string,
	index: string,
}> & {
	groups: store.State['groups'],
	exercises: store.State['exercises'],
	locale: store.State['session']['locale'],
	params: any,
	setDraft(draft: Group): void,
	loadGroup(
		source: GROUPS_LOAD_REQUEST['source'],
		id: string,
		filename: string,
		index: number,
		maintainer: string,
		maintainerGroup: string,
	): void,
	loadExercise(
		source: EXERCISES_LOAD_REQUEST['source'],
		id: string,
		filename: string,
		index: number,
		maintainer: string,
	): void,
};

export class Calc extends React.Component<Props> {
	
	private init: boolean;
	private apiView: boolean = false;
	private params: any = {};
	
	constructor(props: Props) {
		super(props);
		this.init = false;
	}

	componentDidMount() {
		/*this.setState({
			params: queryString.parse(this.props.location.search)
		})*/
		this.apiView = this.props.location.pathname.split("/")[2] == "api"
		this.params = queryString.parse(this.props.location.search)

		// It's necessary to load remote group synchronouly
		if (this.apiView) {
			this.loadGroup(this.props);
		}
	}

	componentDidUpdate(prevProps: Props): void {
		const { params } = this.props.match;
		const { params: prevParams } = prevProps.match;
		if (
			this.init === false
			|| params.source !== prevParams.source
			|| params.id !== prevParams.id
			|| params.filename !== prevParams.filename
			|| params.index !== prevParams.index
		) {
			// change/load
			this.init = true;

			if(params.loadType === 'group'){
				this.loadGroup(this.props);
			}
			else if (params.loadType === 'exercise'){
				this.loadExercise(this.props);
			}		
		}
	}

	private loadGroup(props: Props) {
		const { source, id, filename, index } = props.match.params;

		this.props.loadGroup(source, id, filename, Number.parseInt(index, 10), '', '');
	}

	private loadExercise(props: Props) {
		const { source, id, filename, index } = props.match.params;

		this.props.loadExercise(source, id, filename, Number.parseInt(index, 10), '');
	}

	componentWillReceiveProps(nextProps: Props): void {
		const { params } = this.props.match;
		const { params: nextParams } = nextProps.match;
		if (
			nextParams.source !== params.source || nextParams.id !== params.id || nextParams.filename !== params.filename
			|| nextParams.index !== params.index
		) {
			// change/load
		}
	}

	render() {
		const { locale } = this.props;
		const currentGroup = this.props.groups.current;
		const currentExercise = this.props.exercises.current;

		if (currentGroup !== null && (this.apiView == true || currentExercise !== null)) {
			if (this.apiView == true) {
				return (
					<Api
						group={currentGroup.group}
						locale={locale}
						params={this.params}
					/>
				);
			} else if (currentExercise !== null) {
				return (
					<Calculator
						group={currentGroup.group}
						exercise={currentExercise.exercise}
						locale={locale}
						setDraft={this.props.setDraft}
					/>
				);
			}
		}
		else {
			return <div>loading ...</div>;
		}
	}
}

export const ConnectedCalc = connect((state: store.State) => {

	// save current dataset to local storage to be shown as 'recently used groups'
	const lsGists = localStorage.getItem('groups');
	
	
	if(state.groups.current && Object.keys(state.groups.current.group.sourceInfo).length > 0) {
		if(!lsGists) {
			localStorage.setItem('groups', JSON.stringify([{name: state.groups.current.group.groupName.fallback, group: state.groups.current.group}]));
		} 
		else {
			let parsedGroups = JSON.parse(lsGists) as any[];
			// remove group from and add again to maintain order
			parsedGroups = parsedGroups.filter(r => r.name !== state!.groups!.current!.group.groupName.fallback);
			parsedGroups.push({name: state.groups.current.group.groupName.fallback, group: state.groups.current.group});
			localStorage.setItem('groups', JSON.stringify(parsedGroups));
		}
	}
	
	
	return {
		groups: state.groups,
		exercises: state.exercises,
		locale: state.session.locale,
	};
}, (dispatch) => {
	return {
		loadGroup: (
			source: GROUPS_LOAD_REQUEST['source'],
			id: string,
			filename: string,
			index: number,
			maintainer: string,
			maintainerGroup: string,
		) => {
			const action: GROUPS_LOAD_REQUEST = {
				type: 'GROUPS_LOAD_REQUEST',
				source,
				id,
				maintainer,
				maintainerGroup,
				setCurrent: {
					filename,
					index,
				},
			};

			dispatch(action);
		},
		setDraft: (draft: Group) => {
			const action: GROUP_SET_DRAFT = {
				type: 'GROUP_SET_DRAFT',
				draft,
			};
			dispatch(action);
		},

		loadExercise: (
			source: EXERCISES_LOAD_REQUEST['source'],
			id: string,
			filename: string,
			index: number,
			maintainer: string,
		) => {
			const action: EXERCISES_LOAD_REQUEST = {
				type: 'EXERCISES_LOAD_REQUEST',
				source,
				id,
				maintainer,
				setCurrent: {
					filename,
					index,
				},
			};

			dispatch(action);
		},
	};
})(Calc);
