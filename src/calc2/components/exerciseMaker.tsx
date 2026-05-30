import * as React from 'react';
import { Button, DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from 'reactstrap';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Group, getGroupPath } from 'calc2/store/groups';
import { Exercise, VerificationGroups } from '../store/exercise';

import { EditorRelalg } from 'calc2/components/editorRelalg';
import { EditorBagalg } from 'calc2/components/editorBagalg';

import { MenuConnected } from 'calc2/components/menu';
import { GroupRelationList } from '../components/groupRelationList';

type Props = {};

type State = {
    datasetModal: boolean,

    id: number,
    filename: string,
    exercises: Exercise[],

    // current exercise
    selectedExerciseIndex: number | null,

    group: Group | undefined,
    exerciseType: 'relational_algebra' | 'multiset_algebra',
    name: string,
    description: string,
    referenceQuery: string,

    testBatterySource: 'local' | 'gist',
    testBattery: string,
};

export class ExerciseMaker extends React.Component<Props, State> {
    private refEditorRelalg = React.createRef<EditorRelalg>();
    private refEditorBagalg = React.createRef<EditorBagalg>();

    constructor(props: Props) {
        super(props);

        toast.configure();

        this.state = {
            datasetModal: false,

            id: Date.now(),
            filename: 'exercises',
            exercises: [],
            
            selectedExerciseIndex: null,

            group: undefined,
            exerciseType: 'relational_algebra',
            name: '',
            description: '',
            referenceQuery: '',

            testBatterySource: 'gist',
            testBattery: '',
        };

        // Bind methods
        this.toggleDatasetModal = this.toggleDatasetModal.bind(this);
        this.loadReferenceQuery = this.loadReferenceQuery.bind(this);

        this.saveExerciseToList = this.saveExerciseToList.bind(this);
        this.cancelExerciseEdit = this.cancelExerciseEdit.bind(this);
    }

    private toggleDatasetModal() {
		this.setState({
			datasetModal: !this.state.datasetModal,
		});
	}

    private getCurrentEditor() {
		switch (this.state.exerciseType) {
			case 'relational_algebra':
				return this.refEditorRelalg;
			case 'multiset_algebra':
				return this.refEditorBagalg;
		}
	}

    // current exercise info 

    private handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ name: event.target.value });
    }

    private handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({ description: event.target.value });
    }

    private async loadReferenceQuery(){
        const editor = this.getCurrentEditor();
        if (editor && editor.current) {
            const query = editor.current.getText();

            if(!query || query.trim() === ''){
                toast.warn('The editor is empty. Please enter a reference query before loading it.', {
                    position: toast.POSITION.TOP_RIGHT,
                    autoClose: 5000,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
                return;
            }

            const isWellFormed = await editor.current.wellFormedQuery();
            if(!isWellFormed){
                toast.warn('The reference query returned an error. Please fix it before loading it.', {
                    position: toast.POSITION.TOP_RIGHT,
                    autoClose: 5000,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
                return;
            }

            this.setState({ referenceQuery: query });
        }
    }

    private handleTestBatteryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ testBattery: event.target.value });
    }

    private checkGistExists = async (gistId: string): Promise<boolean> => {
        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`);
            console.log(response);
            return response.ok;
        }
        catch (e) {
            toast.error('An error occurred while verifying the test battery Gist. Please try again later.', {
                position: toast.POSITION.TOP_RIGHT,
                autoClose: 5000,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            return false;
        }
    }

    // add or update exercise 

    private cancelExerciseEdit = () => {
        this.setState({
            selectedExerciseIndex: null,
            name: '',
            description: '',
            referenceQuery: '',
            testBattery: '',
        });
    }

    private loadExerciseToEdit = (index: number) => {
        const exercise = this.state.exercises[index];
        if (!exercise) {
            toast.error('Exercise not found.', {
                position: toast.POSITION.TOP_RIGHT,
                autoClose: 5000,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            return;
        }

        if(exercise.type !== 'relational_algebra' && exercise.type !== 'multiset_algebra') {
            return;
        }

        this.setState({
            selectedExerciseIndex: index,
            name: exercise.name,
            description: exercise.description,
            referenceQuery: exercise.reference,

            testBatterySource: exercise.verificationGroups.source as ('local' | 'gist'),
            testBattery: exercise.verificationGroups.id,
            
            exerciseType: exercise.type,
        });
    }

    private saveExerciseToList = async () => {
        const { group, name, description, referenceQuery, testBatterySource, testBattery, exerciseType, selectedExerciseIndex } = this.state;
        
        if(!group || name === '' || description === '' || referenceQuery === '') {
            toast.warn('Please fill in all required fields and load a reference query before adding the exercise.', {
                position: toast.POSITION.TOP_RIGHT,
                autoClose: 5000,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            return;
        }

        const datasetPath = getGroupPath(group);

        if(testBatterySource === 'gist' && testBattery !== '') {
            const exists = await this.checkGistExists(testBattery);

            if (!exists) {
                toast.warn('The specified test battery Gist was not found. Please check the identifier and try again.', {
                    position: toast.POSITION.TOP_RIGHT,
                    autoClose: 5000,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
                return;
            }
        }

        const exercise: Exercise = {
            name: name,
            description: description,
            reference: referenceQuery,
            datasetPath: datasetPath,

            verificationGroups: { 
                source: testBatterySource,
                id: testBattery,
                groups: undefined,
            },

            type: exerciseType,

            exerciseInfo: {
                source: 'maker',
                id: (this.state.id).toString(),
                filename: this.state.filename,
                index: selectedExerciseIndex === null ? this.getNumberOfExercises() : selectedExerciseIndex,
                maintainer: 'maker',
            },
            sourceInfo: {},
        }

        if (selectedExerciseIndex === null) {
            this.setState(state => ({
                exercises: [...state.exercises, exercise],
                name: '',
                description: '',
                referenceQuery: '',
                testBattery: '',
            }));
        }
        else {
            this.setState(state => {
                const exercises = state.exercises.slice();
                const existing = exercises[selectedExerciseIndex];
                exercise.exerciseInfo = {
                    ...existing.exerciseInfo,
                    filename: state.filename,
                    index: selectedExerciseIndex,
                };
                exercises[selectedExerciseIndex] = exercise;

                return {
                    exercises,
                    selectedExerciseIndex: null,
                    name: '',
                    description: '',
                    referenceQuery: '',
                };
            });
        }
    }

    // exercises file

    private handleFilenameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ filename: event.target.value });
    }
    
    private getNumberOfExercises = () => {
        return this.state.exercises.length;
    }

    private downloadExercise = () => {
        if(this.getNumberOfExercises() <= 0){
            toast.warn('Please add at least one exercise to the file before downloading it.', {
                position: toast.POSITION.TOP_RIGHT,
                autoClose: 5000,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            return;
        }

        const { filename, exercises } = this.state;

        const filename_with_extension = filename + '.txt';

        let fileContent = '';
        for (const exercise of exercises) {
            const nameLine = `exercise: ${exercise.name}\n`;
            const descriptionLine = `description: ${exercise.description}\n`;
            const referenceLine = `reference: ${exercise.reference}\n`;
            const datasetLine = `dataset: ${exercise.datasetPath}\n`;
            const typeLine = `type: ${exercise.type}\n`;

            let testBatteryLine = '';
            if(exercise.verificationGroups.id !== '') {
                testBatteryLine = `test_battery: ${exercise.verificationGroups.source}/${exercise.verificationGroups.id}\n`;
            }

            fileContent += nameLine + descriptionLine + referenceLine + datasetLine + typeLine + testBatteryLine + '\n';
        }

        const file = new Blob([fileContent], { type: 'text/plain' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = filename_with_extension;
        a.click();
    }

    render() {
        const { group, exerciseType } = this.state;

        return (
            <div className="calculator">

                <div className={group ? "calculator-row" : "select-database"}>
                    <div className="groups-container">
                        <button 
                            className="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" 
                            onClick={this.toggleDatasetModal}
                        >
                            <span>Select Database</span>
                        </button>

                        <div>
                            {group &&
                                <GroupRelationList
                                    tables={group.tables}
                                    replace={(text: string) => {
                                        const editor = this.getCurrentEditor();
                                        if (editor && editor.current) {
                                            editor.current.replaceSelection(text);
                                        }
                                    }}
                                    onElementClick={null}
                                />
                            }
                        </div>
                    </div>
                                
                    <Modal isOpen={this.state.datasetModal} toggle={this.toggleDatasetModal}>
                        <ModalHeader toggle={this.toggleDatasetModal}>Select Database</ModalHeader>

                        <ModalBody>
                            <div>
                                <MenuConnected
                                    loadType="variable"
                                    datasetLoaded={(group: Group) => {
                                        this.setState({ group, datasetModal: false });
                                    }}
                                    loadGroupTab={() => { }}
                                />
                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <Button color="secondary" onClick={this.toggleDatasetModal}>Close</Button>
                        </ModalFooter>
                    </Modal>

                    {group ? <>
                        <div className="calculator-container">
                            <div className="exercise-type-dropdown">
                                <UncontrolledDropdown>
                                    <DropdownToggle>Select Query Language</DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={() => this.setState({ exerciseType: 'relational_algebra' })}>Relational Algebra</DropdownItem>
                                        <DropdownItem onClick={() => this.setState({ exerciseType: 'multiset_algebra' })}>Multiset Algebra</DropdownItem>
                                    </DropdownMenu>
                                </UncontrolledDropdown>
                                <div className="exercise-type">{exerciseType === 'relational_algebra' ? 'Relational Algebra' : 'Multiset Algebra'}</div>
                            </div>

                            {exerciseType === 'relational_algebra' && 
                                <EditorRelalg 
                                    group={group}
                                    exercise={undefined}
                                    exerciseMode={false}

                                    ref={this.refEditorRelalg}
									relInsertModalToggle={() => { }}
                                />
                            }

                            {exerciseType === 'multiset_algebra' && 
                                <EditorBagalg 
                                    group={group}
                                    exercise={undefined}
                                    exerciseMode={false}

                                    ref={this.refEditorBagalg}
                                    relInsertModalToggle={() => { }}
                                />
                            }
                        </div>
 
                        <div className="groups-container exercise-info">
                            <div className="exercise-category">
                                <h4>Exercise Information</h4>

                                <div>
                                    <div className="exercise-input">
                                        <label>Name: </label>
                                        <input type="textarea" 
                                            name="name"
                                            onChange={this.handleNameChange}
                                            value={this.state.name}
                                            placeholder="name..."
                                        />
                                    </div>

                                    <div className="exercise-input">
                                        <label>Description: </label>
                                        <textarea
                                            name="description"
                                            onChange={this.handleDescriptionChange}
                                            value={this.state.description}
                                            placeholder="description..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="exercise-input">
                                        <label>Reference Query: </label>
                                        <textarea
                                            name="referenceQuery"
                                            value={this.state.referenceQuery}
                                            placeholder="load a query..."
                                            readOnly
                                        />
                                    </div>
                                    
                                    <button onClick={this.loadReferenceQuery}>Load Reference Query from Editor</button>
                                </div>

                                <div>
                                    <span>Test Battery (optional): </span> 
                                    <div className="testbattery-dropdown">
                                        <UncontrolledDropdown>
                                            <DropdownToggle>Select Source</DropdownToggle>
                                            <DropdownMenu>
                                                <DropdownItem onClick={() => this.setState({ testBatterySource: 'local' })}>local</DropdownItem>
                                                <DropdownItem onClick={() => this.setState({ testBatterySource: 'gist' })}>Gist</DropdownItem>
                                            </DropdownMenu>
                                        </UncontrolledDropdown>
                                        <div className="testbattery-source">{this.state.testBatterySource === 'local' ? 'local' : 'Gist'}</div>
                                    </div>
                                
                                    <div className="exercise-input">
                                        <label>id: </label>
                                        <input type="textarea" 
                                            name="testBattery"
                                            onChange={this.handleTestBatteryChange}
                                            value={this.state.testBattery}
                                            placeholder={`${this.state.testBatterySource === 'local' ? 'Local' : 'Gist'} identifier...`}
                                        />
                                    </div>

                                    {
                                    //TODO: Handle the creation of new test battery
                                    }
                                </div>

                                <div className="exercise-item">
                                    <button onClick={this.saveExerciseToList}>
                                        {this.state.selectedExerciseIndex === null ? 'Add Exercise to File' : 'Update Exercise'}
                                    </button>

                                    {this.state.selectedExerciseIndex !== null && (
                                        <button type="button" onClick={this.cancelExerciseEdit}>
                                            Cancel Edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            <hr />

                            <div className="exercise-list">
                                <h4>Defined Exercises</h4>
                                
                                {this.state.exercises.length === 0 ? (
                                    <div>No exercises added yet.</div>
                                ) : (
                                    <div> 
                                        <div>{this.getNumberOfExercises()} exercises in file</div>
                                        <ul>
                                            {this.state.exercises.map((exercise, index) => (
                                                <li key={index}><div className={`exercise-item ${this.state.selectedExerciseIndex === index && 'selected-exercise'}`}>
                                                    <strong>{exercise.name}</strong>

                                                    {this.state.selectedExerciseIndex === index ? (<span>(editing)</span>
                                                    ) : (
                                                        <button type="button" onClick={() => this.loadExerciseToEdit(index)}>
                                                            Edit
                                                        </button>
                                                    )}
                                                </div></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <hr />

                            <div className="exercise-input">
                                <label>File Name: </label>
                                <input type="textarea" 
                                    name="name"
                                    onChange={this.handleFilenameChange}
                                    value={this.state.filename}
                                    placeholder="file name..."
                                />
                            </div>

                            <button onClick={this.downloadExercise}>Download Exercise Text File</button>  
                        </div>


                    </> : "Please select a reference dataset to start creating exercises."}
                </div>
            </div>
        );
    }
}