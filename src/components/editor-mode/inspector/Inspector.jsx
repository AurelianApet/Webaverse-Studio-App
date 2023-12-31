
import React, {useState, useEffect, useContext} from 'react';
import classnames from 'classnames';

import {world2canvas} from '../../../ThreeUtils.js';
import {world} from '../../../../world.js';
import game from '../../../../game.js';

import {AppContext} from '../../app';

import styles from './inspector.module.css';

//

export const Inspector = () => {

    const {state, setState, setSelectedApp, selectedApp} = useContext(AppContext);
    const [hoverPosition, setHoverPosition] = useState(null);
    const [selectPosition, setSelectPosition] = useState(null);
    const [epoch, setEpoch] = useState(0);

    const [dragging, setDragging] = useState(false);

    //

    useEffect(() => {

        const hoverchange = (event) => {

            if (! selectedApp && ! dragging) {

                const {position} = event.data;

                if (position) {

                    const worldPoint = world2canvas(position);
                    setHoverPosition(worldPoint);

                } else {

                    setHoverPosition(null);

                }

            } else {

                setHoverPosition(null);

            }

        };

        world.appManager.addEventListener('hoverchange', hoverchange);

        return () => {

            world.appManager.removeEventListener('hoverchange', hoverchange);

        };

    }, [ selectedApp, dragging, hoverPosition ]);

    useEffect(() => {

        const dragchange = e => {

            const {dragging} = e.data;
            setDragging(dragging);
            setHoverPosition(null);

        };

        world.appManager.addEventListener('dragchange', dragchange);

        const selectchange = e => {

            setSelectedApp(e.data.app);

        };

        world.appManager.addEventListener('selectchange', selectchange);

        return () => {

            world.appManager.removeEventListener('dragchange', dragchange);
            world.appManager.removeEventListener('selectchange', selectchange);

        };

    }, [ dragging ]);

    useEffect(() => {

        game.setHoverEnabled(true);

        return () => {
            game.setHoverEnabled(false);

            game.setMouseSelectedObject(null);
            game.setMouseHoverObject(null);
        }

    }, [ ]);

    let localEpoch = epoch;

    useEffect(() => {

        const frame = (event) => {

            if (selectedApp) {

                const position = game.getMouseSelectedPosition();

                if (position) {

                    const worldPoint = world2canvas(position, selectPosition);

                    if (worldPoint.z > 0) {

                        setSelectPosition(worldPoint);
                        setEpoch(++ localEpoch);

                    } else {

                        setSelectPosition(null);

                    }

                } else {

                    setSelectPosition(null);

                }

            } else {

                setSelectPosition(null);

            }

        };

        world.appManager.addEventListener('frame', frame);

        return () => {

            world.appManager.removeEventListener('frame', frame);

        };

    }, [ ]);

    const bindPosition = selectPosition || hoverPosition || null;

    //

    return bindPosition ? (
        <div className={ classnames(styles.inspector) } style={ bindPosition ? {
            transform: `translateX(${bindPosition.x*100}vw) translateY(${bindPosition.y*100}vh)`,
        } : null}>
            <img src="/images/popup.svg" style={bindPosition ? {
                transform: `scale(${bindPosition.z})`,
                transformOrigin: '0 100%',
            } : null} />
        </div>
    ) : null;

};