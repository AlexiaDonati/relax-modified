import * as Immutable from 'immutable';
import * as saga from 'redux-saga/effects';

import * as store from 'calc2/store';
import { Group, GroupSourceType } from 'calc2/store/groups';
import { loadExercisesFromSource } from 'calc2/utils/exerciseUtils';

export type State = {
    exercises: Immutable.Map<string, Exercise>,

    current: {
        exercise: Exercise,
    } | null,
};

export type Action = (
    | EXERCISES_LOAD_REQUEST
    | EXERCISES_LOAD_SUCCESS
    | EXERCISE_SET_CURRENT
);

export function* rootSaga() {
    yield saga.takeEvery('EXERCISES_LOAD_REQUEST', function* (action: EXERCISES_LOAD_REQUEST) {
        const { source, id, maintainer, setCurrent } = action;

        const state: store.State = yield saga.select(); // retrieve the current state

        // check wether we have already loaded the exercise
        const found = state.exercises.exercises.find(e => (
            e.exerciseInfo.source === source
            && e.exerciseInfo.id === id
            && (!!setCurrent && (setCurrent === 'first' || setCurrent.filename === e.exerciseInfo.filename))
            && (!!setCurrent && (setCurrent === 'first' || setCurrent.index === e.exerciseInfo.index))
        ));
        if (found) {
            const { source, id, filename, index } = found.exerciseInfo;

            // already loaded => just switch the current exercise
            const setCurrent: EXERCISE_SET_CURRENT = {
                type: 'EXERCISE_SET_CURRENT',
                source,
                id,
                filename,
                index,
            };
            yield saga.put(setCurrent);
        }
        else { // fetch
            try {
                if (source !== 'local' && source !== 'gist') {
                    throw new Error(`unsupported source-type ${source}`);
                }

                const loadedExercises: Exercise[] = yield saga.call(loadExercisesFromSource, source, id, maintainer);

                for (const exercise of loadedExercises) { // set the groups element of the verificationGroups element of each exercise
                    const { source, id } = exercise.verificationGroups;
                    if(source === '' as GroupSourceType || id === ''){
                        continue;
                    }

                    const actionGroup: store.Action = {
                        type: 'GROUPS_LOAD_REQUEST',

                        source: source,
                        id: id,

                        setCurrent: undefined,

                        maintainer: exercise.exerciseInfo.maintainer,
                        maintainerGroup: 'misc',

                        hidden: true, // do not show the verification groups of the exercise in the group overview
                    };
                    yield saga.put(actionGroup);

                    yield saga.take('GROUPS_LOAD_SUCCESS');
                    const updatedState: store.State = yield saga.select();

                    const findGroups = updatedState.groups.groups.filter(e => (
                        e.groupInfo.source === source
                        && e.groupInfo.id === id
                    ));
                    exercise.verificationGroups.groups = Array.from(findGroups.values());
                }

                const success: EXERCISES_LOAD_SUCCESS = {
                    type: 'EXERCISES_LOAD_SUCCESS',
                    loadedExercises,
                };

                yield saga.put(success);

                if (setCurrent !== undefined && loadedExercises.length > 0) {
                    // In case the current exercise is specified via :filename and :index
                    if (setCurrent != 'first' && setCurrent.filename && setCurrent.index) {
                        for(var i=0 ; i<loadedExercises.length ; i++) {
                            const e = loadedExercises[i];
                            const { source, id, filename, index } = e.exerciseInfo;

                            if (filename == setCurrent.filename && index == setCurrent.index) {
                                const setCurrent: EXERCISE_SET_CURRENT = {
                                    type: 'EXERCISE_SET_CURRENT',
                                    source,
                                    id,
                                    filename,
                                    index,
                                };
                                yield saga.put(setCurrent);
                                break;
                            }
                        }
                    }
                    
                    // Otherwise, just try using the first exercise
                    else {
                        const { source, id, filename } = loadedExercises[0].exerciseInfo;

                        const setCurrent: EXERCISE_SET_CURRENT = {
                            type: 'EXERCISE_SET_CURRENT',
                            source,
                            id,
                            filename,
                            index: 0,
                        };
                        yield saga.put(setCurrent);
                        
                        const dsPath = loadedExercises[0].datasetPath.split("/");
                        const actionGroup: store.Action = {
                            type: 'GROUP_SET_CURRENT',
                            source: dsPath[0] as GroupSourceType,
                            id: dsPath[1],
                            filename: dsPath[2],
                            index: parseInt(dsPath[3]),
                        };
                        yield saga.put(actionGroup);
                    }
                }
            }
            catch (e) {
                console.error('could not fetch exercise', e);
                window.alert('Could not fetch exercise!\nDefault exercise loaded.\n' + e);
            }
        }
    });

    yield saga.takeEvery('EXERCISE_SET_CURRENT', function* (action: EXERCISE_SET_CURRENT) {
        const state: store.State = yield saga.select();
        const { source, id, filename, index } = action;

        const exercise = state.exercises.exercises.find(e => (
            e.exerciseInfo.source === source
            && e.exerciseInfo.id === id
            && e.exerciseInfo.filename === filename
            && e.exerciseInfo.index === index
        ));

        if (!exercise) {
            console.error('could not find exercise ', exercise);
            return;
        }

        const datasetPath = exercise.datasetPath.split('/');

        const actionGroup: store.Action = {
            type: 'GROUP_SET_CURRENT',
            source: datasetPath[0] as GroupSourceType,
            id: datasetPath[1],
            filename: datasetPath[2],
            index: parseInt(datasetPath[3], 10),
        };

        yield saga.put(actionGroup);
    });
}

export type ExerciseSourceType = 'http' | 'gist' | 'local';

export type ExerciseType = 'relational_algebra' | 'multiset_algebra' | 'sql';

export type Exercise = {
    name: string,
    description: string,
    reference: string,
    datasetPath: string

    verificationGroups : VerficationGroups

    type: ExerciseType,

    exerciseInfo: ExerciseInfo,
    sourceInfo: SourceInfo,
};

export type ExerciseInfo = {
    source: ExerciseSourceType,
    id: string,
    filename: string,
    index: number, /** nth definition within the file */
    maintainer: string,
};

export type SourceInfo = {
    author?: string,
    authorUrl?: string,
    url?: string,
    lastModified?: Date,
};

export type VerficationGroups = {
    source: string,
    id: string,
    
    groups: Group[] | undefined,
};

// region actions

export type EXERCISES_LOAD_REQUEST = {
    type: 'EXERCISES_LOAD_REQUEST',
    source: string,
    id: string,
    maintainer: string,

    setCurrent?: 'first' | { 
        filename: string,
        index: number,
    },
};

type EXERCISES_LOAD_SUCCESS = {
    type: 'EXERCISES_LOAD_SUCCESS',
    loadedExercises: Exercise[],
};

type EXERCISE_SET_CURRENT = {
    type: 'EXERCISE_SET_CURRENT',
    source: ExerciseSourceType,
    id: string,
    filename: string,
    index: number,
};

// region: action creators

export function loadStaticExercises() {
    const exercises: {
        source: ExerciseSourceType, 
        id: string,
        maintainer: string,
    }[] = [
        {
            source: 'local',
            id: 'tp3',
            maintainer: 'TP3',
        },
        {
            source: 'local',
            id: 'tp5',
            maintainer: 'TP5',
        },
        /*
        {
            source: 'gist',
            id: 'enter gist id here',
            maintainer: 'misc',
        },
        */
        // Add source information of the exercises that must be loaded automatically here !
    ];

    const actions: EXERCISES_LOAD_REQUEST[] = (
        exercises.map(({ source, id, maintainer}) => {
            const action: EXERCISES_LOAD_REQUEST = {
                type: 'EXERCISES_LOAD_REQUEST',

                source,
                id,
                maintainer,

                setCurrent: undefined, // do not set a current exercise when loading the page
            };

            return action;
        })
    );

    return actions;
}

export function reduce(oldState: State | undefined, action: store.Action): State {
    if (!oldState) {
        return {
            exercises: Immutable.Map(),
            current: null,
        };
    }

    switch (action.type) {
        case 'EXERCISE_SET_CURRENT': {
            const { source, id, filename, index } = action;

            const exercise = oldState.exercises.find(e => (
                e.exerciseInfo.source === source
                && e.exerciseInfo.id === id
                && e.exerciseInfo.filename === filename
                && e.exerciseInfo.index === index
            ));

            if (!exercise) {
                console.error('could not find exercise ', exercise);
                return oldState;
            }

            return {
                ...oldState,
                current: {
                    ...oldState.current,
                    exercise,
                },
            };
        }

        case 'EXERCISES_LOAD_SUCCESS': {
            const { loadedExercises } = action;
            let newState = oldState;

            for (const exercise of loadedExercises) {
                newState = {
                    ...newState,
                    exercises: newState.exercises.set(getExercisePath(exercise), exercise),
                };
            }
            return newState;
        }

		default: {
			return oldState;
		}
    }
}

function getExercisePath(e: Exercise) {
    const { source, id, filename, index } = e.exerciseInfo;
    return `${source}/${id}/${filename}/${index}`;
}
