import * as React from 'react';

import { Navigation } from '../components/navigation';
import { NavigationMobile } from '../components/navigation-mobile';

import { ExerciseMaker } from 'calc2/components/exerciseMaker';

export class ExerciseMakerView extends React.Component {
    render() {
        return (
            <div className="view-max">
                <Navigation></Navigation>
                <NavigationMobile></NavigationMobile>

                <ExerciseMaker></ExerciseMaker>
            </div>
        );
    }
}