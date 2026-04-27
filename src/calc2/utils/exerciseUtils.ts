
import { Exercise, ExerciseInfo, SourceInfo, ExerciseSourceType, VerificationGroups, ExerciseType } from 'calc2/store/exercise';

const ld_tp3: any = require('../data/tp3.txt');
const ld_tp5: any = require('../data/tp5.txt');
const LOCAL_DATA: { [id: string]: string } = {
	'tp3': ld_tp3.default ? ld_tp3.default : '',
    'tp5': ld_tp5.default ? ld_tp5.default : '',
};

export function parseExercisesFromDefinition(text: string, groupInfo: ExerciseInfo, sourceInfo: SourceInfo) {
    const exercises: Exercise[] = [];

    if (!text) {
        return exercises;
    }

    // split blocks by blank line(s)
    const blocks = text.split(/\r?\n\s*\r?\n/).map(b => b.trim()).filter(b => b.length > 0);

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const lines = block.split(/\r?\n/);

        let name = '';
        let description = '';
        let reference = '';
        let datasetPath = '';
        let testsPath = ['', ''];
        let type = '';

        let currentKey: string | null = null;

        for (const line of lines) {
            const m = line.match(/^\s*([A-Za-z_]+)\s*:\s*(.*)$/);

            if (m){ // if the line starts with "key: value",
                const key = m[1].toLowerCase();
                let val = m[2].trim();

                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.substring(1, val.length - 1);
                }

                switch (key) {
                    case 'exercise':
                        name = val;
                        break;
                    case 'description':
                        description = val;
                        break;
                    case 'reference':
                        reference = val;
                        break;
                    case 'dataset':
                        datasetPath = val;
                        break;
                    case 'tests':
                        testsPath = val.split("/");
                        break;
                    case 'type':
                        type = val;
                        break;
                    default:
                        console.warn('unknown key ' + key + '.');
                }

                currentKey = key;
            }
            else { // else it is a continuation of the previous key 
                if (currentKey === null) {
                    console.warn('line does not match expected format: ' + line);
                    continue;
                }
                switch (currentKey) {
                    case 'description':
                        description += '\n' + line.trim();
                        break;
                    case 'reference':
                        reference += '\n' + line.trim();
                        break;
                    default:
                        console.warn('unexpected continuation line for key ' + currentKey + ': ' + line);
                }
            }
        }

        if (name === '' || description === '' || reference === '' || datasetPath === '') {
            console.warn('definition of index ' + i + ' exercise is missing required fields, skipping exercise.');
            continue;
        }

        if(type === '') {
            console.warn('exercise type not specified for exercise ' + name + ', using "relational_algebra" as default.');
            type = 'relational_algebra';
        }
        else if(type !== 'relational_algebra' && type !== 'multiset_algebra' && type !== 'sql') {
            console.warn('unknown exercise type "' + type + '" for exercise ' + name + ', using "relational_algebra" as default.');
            type = 'relational_algebra';
        }
        
        const verificationGroups: VerificationGroups = {
            source: testsPath[0],
            id: testsPath[1],

            groups: undefined,
        };

        const ex: Exercise = {
            name: name || '', 
            description: description || '',
            reference: reference || '',
            datasetPath: datasetPath || '',
            
            verificationGroups: verificationGroups,

            type: type as ExerciseType,

            exerciseInfo: {
                ...groupInfo,
                index: i,
            },
            sourceInfo: sourceInfo || {},
        };

        exercises.push(ex);
    }

    return exercises;
}

export function loadExercisesFromSource(source: ExerciseSourceType, id: string, maintainer: string): Promise<Exercise[]> {
    return new Promise<Exercise[]>((resolve, reject) => {

        function gist_success(data: gist.Gist) {
            const newExercises: Exercise[] = [];
            
            for (const filename in data.files) {
                if (!data.files.hasOwnProperty(filename)) { continue; } 

                const author = data.owner === null ? 'anonymous' : data.owner.login;
                const authorUrl = data.owner === null ? undefined : data.owner.html_url;

                const info: ExerciseInfo = {
                    source,
                    id: data.id,
                    filename,
                    index: -1,
                    maintainer: maintainer,
                };

                const sourceInfo: SourceInfo = {
                    author,
                    authorUrl,
                    lastModified: new Date(data.updated_at),
                    url: data.url,
                };

                try {
                    newExercises.push(...parseExercisesFromDefinition(data.files[filename].content, info, sourceInfo));
                }
                catch (e) {
                    const msg = 'could not parse given group from gist with id "' + id + '": ' + e;
                    console.error(msg, id, e, filename, data);
                    reject(new Error(msg));
                }
            }

            resolve(newExercises);
        }

        switch (source) {
            case 'gist': {
                jQuery.ajax({
                    url: `https://api.github.com/gists/${id}`,
                    dataType: 'json',
                    success: gist_success,
                    crossDomain: true,
                    statusCode: {
                        403: function (data: any) {
                            reject(new Error(data.responseJSON.message));
                        },
                        404: function () {
                            reject(new Error('gist ' + id + ' not found'));
                        },
                    },
                    timeout: 10000,
                    async: false,
                });
                break;
            }
            case 'local': {
                try {
                    const data: string = LOCAL_DATA[id];
                    const info: ExerciseInfo = {
                        source,
                        id,
                        filename: 'local',
                        index: -1,
                        maintainer: maintainer,
                    };
                    const newExercises = parseExercisesFromDefinition(data, info, {});
            
                    resolve(newExercises);
                }
                catch (e) {
                    let msg = 'cannot parse exercises file: ' + (e as Error).message;
                    msg += '<br>see log for more information';
                    console.error(msg, e);
                    reject(new Error(msg));
                }
                break;
            }
            default:
                reject(new Error('unknown source ' + source));
        }
    });
}