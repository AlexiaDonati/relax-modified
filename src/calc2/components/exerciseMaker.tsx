import * as React from 'react';
import { Button, DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from 'reactstrap';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Group, getGroupPath } from 'calc2/store/groups';
import { Exercise, ExerciseInfo, VerificationGroups } from '../store/exercise';

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

    group: Group | undefined,
    exerciseType: 'relational_algebra' | 'multiset_algebra',
    name: string,
    description: string,
    referenceQuery: string,
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

            group: undefined,
            exerciseType: 'relational_algebra',
            name: '',
            description: '',
            referenceQuery: '',
        };

        // Bind methods
        this.toggleDatasetModal = this.toggleDatasetModal.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
        this.loadReferenceQuery = this.loadReferenceQuery.bind(this);

        this.handleFilenameChange = this.handleFilenameChange.bind(this);
        this.addExerciseToList = this.addExerciseToList.bind(this);
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

    // exercises file

    private handleFilenameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ filename: event.target.value });
    }
    
    private getNumberOfExercises = () => {
        return this.state.exercises.length;
    }

    private addExerciseToList = () => {
        const { group, name, description, referenceQuery, exerciseType } = this.state;
        
        if(!group || name === '' || description === '' || referenceQuery === '') {
            toast.warn('Please fill in all fields and load a reference query before adding the exercise.', {
                position: toast.POSITION.TOP_RIGHT,
                autoClose: 5000,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            return;
        }

        const datasetPath = getGroupPath(group);

        const verificationGroups: VerificationGroups = { //TODO: add verification path
            source: '',
            id: '',
            groups: undefined,
        }

        
        const exerciseInfo: ExerciseInfo = {
            source: 'maker',
            id: (this.state.id).toString(),
            filename: this.state.filename,
            
            index: this.getNumberOfExercises(), /** nth definition within the file */
            maintainer: 'maker',
        };

        const exercise: Exercise = {
            name: name,
            description: description,
            reference: referenceQuery,
            datasetPath: datasetPath,

            verificationGroups: verificationGroups,

            type: exerciseType,

            exerciseInfo: exerciseInfo,
            sourceInfo: {},
        }

        this.state.exercises.push(exercise); // add exercise to file

        this.setState({ // reset current exercise for new exercise
            name: '',
            description: '',
            referenceQuery: '',
        });
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

            fileContent += nameLine + descriptionLine + referenceLine + datasetLine + typeLine + '\n';
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

                <div className="calculator-row">
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
                            <h3>Exercise Information</h3>
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

                            <div>
                                <button onClick={this.loadReferenceQuery}>Load Reference Query from Editor</button>
                                <label>Reference Query: {this.state.referenceQuery}</label>
                            </div>

                            {
                            //TODO: Handle test battery
                            }

                            <div>
                                <button onClick={this.addExerciseToList}>Add Exercise to File</button>
                                <div>{this.getNumberOfExercises()} exercises in file</div>
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


                    </> : "Please select a database to start creating exercises."}

                </div>
            </div>
        );
    }
}