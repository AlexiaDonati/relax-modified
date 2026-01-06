
import {Exercise, ExerciseInfo, SourceInfo, ExerciseSourceType} from 'calc2/store/exercise';

const ld_tp1: any = require('../data/tp1.txt');
const LOCAL_DATA: { [id: string]: string } = {
	'tp1': ld_tp1.default ? ld_tp1.default : '',
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
                default:
                    break;
            }
        }

        const ex: Exercise = {
            name: name || '', 
            definition: description || '',
            reference: reference || '',
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

export function loadExercisesFromSource(source: ExerciseSourceType = 'local', id: string, maintainer: string): Promise<Exercise[]> {
    return new Promise<Exercise[]>((resolve, reject) => {
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
    });
}