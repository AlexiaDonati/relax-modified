import * as React from 'react';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import * as Immutable from 'immutable';
import memoize from 'memoize-one';

import { i18n, T } from 'calc2/i18n';
import * as store from 'calc2/store';
import { Exercise } from '../store/exercise';
import classNames from 'classnames';

type Props = {
    exercises: store.State['exercises']['exercises'],
    current: store.State['exercises']['current'],

    locale: store.State['session']['locale'],
    exerciseLoaded: Function,
};

export class MenuExercise extends React.Component<Props> {
	constructor(props: Props) {
		super(props);
	}

    private getExercisesByHeadlineName = memoize((exercises: Props['exercises'], locale: string) => {
        let exercisesByHeadlineName = Immutable.OrderedMap<string | null, Exercise[]>();

        // collect all exercises and group them by group-name
        for (const exercise of exercises.values()) {
            let maintainer: string | null = null;

            maintainer = exercise.exerciseInfo.maintainer;

            const exercises = [
                ...(exercisesByHeadlineName.get(maintainer) || []),
                exercise,
            ];
            exercises.sort((a, b) => a.name.localeCompare(b.name));

            exercisesByHeadlineName = exercisesByHeadlineName.set(maintainer, exercises);
        }

        return exercisesByHeadlineName;
    });

    render(): JSX.Element {
        const { current, locale } = this.props;
        const exercisesByHeadlineName = this.getExercisesByHeadlineName(this.props.exercises, locale);

        return (
            <div className="container">
				<div className="row">
                    <h4>load an Exercise</h4>
                        <ul id="groups-selector-list">
                            {exercisesByHeadlineName.map((exercises: Exercise[], headline: any) => (
                                <li key={`${headline}`}>
                                    {!headline ? <T id="calc.maintainer-groups.misc" /> : headline}
                                    <ul>
                                        {exercises.map((exercise: Exercise, i: any) => {
                                            const path = `/relax/calc/exercise/${exercise.exerciseInfo.source}/${exercise.exerciseInfo.id}/${exercise.exerciseInfo.filename}/${exercise.exerciseInfo.index}`;

                                            return (
                                                <li key={path} className={classNames({
                                                    active: current && current.exercise.exerciseInfo === exercise.exerciseInfo,
                                                })}>
                                                    <NavLink to={path} onClick={()=>{this.props.exerciseLoaded(); }}>{exercise.name}</NavLink>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </li>
                            )).valueSeq().toArray()}
                        </ul>
                </div>
            </div>
        );
    };
}

export const MenuExerciseConnected = connect((state: store.State) => {
    return {
        exercises: state.exercises.exercises,
        current: state.exercises.current,
        locale: state.session.locale,
    };
})(MenuExercise);