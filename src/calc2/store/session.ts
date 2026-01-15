/*** Copyright 2018 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as store from 'calc2/store';

export type Action = (
  | SET_LOCALE
  | SET_EXERCISE_MODE
);

export type State = {
  locale: 'en' | 'de' | 'es' | string,
  exerciseMode : boolean
};


export type SET_LOCALE = {
  type: 'SET_LOCALE',
  locale: string,
};

export type SET_EXERCISE_MODE = {
  type: 'SET_EXERCISE_MODE',
  exerciseMode: boolean,
};

export function reduce(oldState: State | undefined, action: store.Action): State {
  if (!oldState) {
    oldState = {
      locale: 'en',
      exerciseMode: false
    };
  }

  switch (action.type) {
    case 'SET_LOCALE': {
      let { locale } = action;

      // strip to core lang
      locale = locale.match(/([a-zA-Z]+)/)![1];

      return {
        ...oldState,
        locale: locale,
      };
    }

    case 'SET_EXERCISE_MODE': {
      let { exerciseMode } = action;

      return {
        ...oldState,
        exerciseMode: exerciseMode,
      }
    }

    default: {
      return oldState;
    }
  }
}
