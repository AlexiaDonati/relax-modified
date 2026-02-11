
import { Exercise, ExerciseInfo, SourceInfo, ExerciseSourceType, VerficationGroups } from 'calc2/store/exercise';
import { Group, GroupSourceType } from 'calc2/store/groups';

const ld_tp3: any = require('../data/tp3.txt');
const LOCAL_DATA: { [id: string]: string } = {
	'tp3': ld_tp3.default ? ld_tp3.default : '',
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

        for (const line of lines) {
            const m = line.match(/^\s*([A-Za-z_]+)\s*:\s*(.*)$/);
            if (!m) { continue; }

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
                default:
                    break;
            }
        }
        
        const verificationGroups: VerficationGroups = {
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