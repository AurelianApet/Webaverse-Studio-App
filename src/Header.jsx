import * as THREE from 'three';
import React, { useEffect, useRef, useContext, useState } from 'react';
import classnames from 'classnames';

import CharacterHups from './CharacterHups.jsx';
// import { world } from '../world.js'
import game from '../game.js'
import * as hacks from '../hacks.js'
import cameraManager from '../camera-manager.js'
import metaversefile from '../metaversefile-api.js'
import ioManager from '../io-manager.js'

import { Character } from './components/general/character';
import { CharacterSelect } from './components/general/character-select';
import { Inventory } from './components/general/inventory';
import { Tokens } from './tabs/tokens';
// import { Claims } from './tabs/claims';
import { registerIoEventHandler, unregisterIoEventHandler } from './components/general/io-handler';
import { AppContext } from './components/app';
import { User } from './User';
import {emotions} from './components/general/character/Emotions';
import {screenshotPlayer} from '../avatar-screenshotter.js';
import npcManager from '../npc-manager.js';

import styles from './Header.module.css';

//

const pixelRatio = window.devicePixelRatio;
const characterIconSize = 80;
const cameraOffset = new THREE.Vector3(0, 0.05, -0.35);

const allEmotions = [''].concat(emotions);

const CharacterIcon = () => {
    const canvasRefs = [];
    const canvases = (() => {
        const result = [];
        for (let i = 0; i < allEmotions.length; i++) {
            const canvasRef = useRef();
            const canvas = (
                <canvas
                    className={styles.canvas}
                    width={characterIconSize * pixelRatio}
                    height={characterIconSize * pixelRatio}
                    ref={canvasRef}
                    key={i}
                />
            );
            result.push(canvas);
            canvasRefs.push(canvasRef);
        }
        return result;
    })();

    useEffect(() => {
        if (canvasRefs.every(ref => !!ref.current)) {
            (async () => {
                const avatarApp = await metaversefile.createAppAsync({
                    start_url: `./avatars/scillia_drophunter_v15_vian.vrm`, // XXX use the current avatar contentId
                });
                const player = npcManager.createNpc({
                    name: 'character-icon-npc',
                    avatarApp,
                    detached: true,
                });

                for (let i = 0; i < allEmotions.length; i++) {
                    const emotion = allEmotions[i];
                    const canvas = canvasRefs[i].current;
                    await screenshotPlayer({
                        player,
                        canvas,
                        cameraOffset,
                        emotion,
                    });
                }
            })()
        }
    }, canvasRefs.map(ref => ref.current));

    const hp = 80;
    const mp = 20;
    const xp = 40;
    const level = 6;

    return (
        <div className={styles.characterIcon}>
            <div className={styles.main}>
                {canvases}
                <div className={styles.meta}>
                    <div className={styles.text}>
                        <div className={styles.background} />
                        <span className={styles.name}>Anon</span>
                        <span className={styles.level}>Lv. {level}</span>
                    </div>
                    <div className={classnames(styles.stat, styles.hp)}>
                        <div className={styles.label}>HP</div>
                        <progress className={styles.progress} value={hp} max={100} />
                        <div className={styles.value}>{hp}</div>
                    </div>
                    <div className={classnames(styles.stat, styles.mp)}>
                        <div className={styles.label}>MP</div>
                        <progress className={styles.progress} value={mp} max={100} />
                        <div className={styles.value}>{mp}</div>
                    </div>
                    <div className={classnames(styles.stat, styles.xp)}>
                        <img className={styles.barImg} src={`./images/xp-bar.svg`} />
                        <div className={styles.label}>XP</div>
                        <div className={styles.value}>{xp}</div>
                        <progress className={styles.progress} value={xp} max={100} />
                    </div>
                    <div className={styles.limitBar}>
                        <div className={styles.inner} />
                        <div className={styles.label}>Limit</div>
                    </div>
                </div>
            </div>
            <div className={styles.sub}>
                <div className={styles.buttonWrap}>
                    <div className={styles.button}>Tab</div>
                </div>
            </div>
        </div>
    );
};

const HeaderIcon = () => {
    const { state, setState } = useContext( AppContext );

    const handleCharacterBtnClick = () => {

        setState({ openedPanel: ( state.openedPanel === 'CharacterPanel' ? null : 'CharacterPanel' ) });

        if ( state.openedPanel === 'CharacterPanel' ) {

            cameraManager.requestPointerLock();

        }

    };

    return (
        <div
            className={styles.headerIcon}
            onClick={handleCharacterBtnClick}
        >
            {/* <a href="/" className={styles.logo}>
                <img src="images/arrow-logo.svg" className={styles.image} />
            </a> */}
            <CharacterIcon />
        </div>
    );
};

//

export default function Header() {

    const { state, setState, selectedApp } = useContext( AppContext );
    const localPlayer = metaversefile.useLocalPlayer();
    const _getWearActions = () => localPlayer.getActionsArray().filter(action => action.type === 'wear');

    const dioramaCanvasRef = useRef();
    const panelsRef = useRef();

    const [address, setAddress] = useState(false);
    const [nfts, setNfts] = useState(null);
    // const [apps, setApps] = useState(world.appManager.getApps().slice());
    // const [claims, setClaims] = useState([]);
    // const [dragging, setDragging] = useState(false);
    const [loginFrom, setLoginFrom] = useState('');
    const [wearActions, setWearActions] = useState(_getWearActions());

    //

    const stopPropagation = ( event ) => {

        event.stopPropagation();

    };

    //

    useEffect( () => {

        localPlayer.addEventListener('wearupdate', e => {

            const wearActions = _getWearActions();
            setWearActions( wearActions );

            const mouseDomEquipmentHoverObject = game.getMouseDomEquipmentHoverObject();

            if (mouseDomEquipmentHoverObject && !wearActions.some(action => action.type === 'wear' && action.instanceId === mouseDomEquipmentHoverObject.instanceId)) {

                game.setMouseDomEquipmentHoverObject(null);

            }

        });

    }, []);

    useEffect( () => {

        const pointerlockchange = e => {

            const { pointerLockElement } = e.data;

            if ( pointerLockElement && state.openedPanel !== null) {

                setState({ openedPanel: null });

            }

        };

        cameraManager.addEventListener( 'pointerlockchange', pointerlockchange );

        return () => {

            cameraManager.removeEventListener( 'pointerlockchange', pointerlockchange );

        };

    }, [ state.openedPanel ] );

    /* useEffect(() => {

        const pickup = e => {

            const {app} = e.data;
            const {contentId} = app;
            const newClaims = claims.slice();

            newClaims.push({ contentId });
            setClaims( newClaims );

        };

        world.appManager.addEventListener( 'pickup', pickup );

        return () => {

            world.appManager.removeEventListener( 'pickup', pickup );

        };

    }, [ claims ] ); */

    useEffect(() => {

        if ( selectedApp && panelsRef.current ) {

            panelsRef.current.scrollTo(0, 0);

        }

    }, [ selectedApp, panelsRef.current ] );

    useEffect( () => {

        const handleNonInputKey = ( event ) => {

            switch ( event.which ) {

                case 191: { // /

                    if ( ! state.openedPanel === 'MagicPanel' && ! ioManager.inputFocused() ) {

                        setState({ openedPanel: 'MagicPanel' });

                    }

                    return true;

                }

            }

            return false;

        };

        const handleAnytimeKey = ( event ) => {

            switch ( event.which ) {

                case 9: { // tab

                    setState({ openedPanel: ( state.openedPanel === 'CharacterPanel' ? null : 'CharacterPanel' ) });

                    if ( state.openedPanel === 'CharacterPanel' && ! cameraManager.pointerLockElement ) {

                        cameraManager.requestPointerLock();

                    }

                    return true;

                }

            }

            return false;

        };

        const keydown = ( event ) => {

            let handled = false;
            const inputFocused = document.activeElement && ['INPUT', 'TEXTAREA'].includes( document.activeElement.nodeName );

            if ( ! inputFocused )  {

                handled = handleNonInputKey( event );

            }

            if ( ! handled ) {

                handled = handleAnytimeKey( event );

            }

            if ( handled ) {

                return false;

            } else {

                return true;

            }

        };

        registerIoEventHandler( 'keydown', keydown );

        return () => {

            unregisterIoEventHandler( 'keydown', keydown );

        };

    }, [ state.openedPanel, selectedApp ] );

    const npcManager = metaversefile.useNpcManager();
    const [npcs, setNpcs] = useState(npcManager.npcs);

    useEffect( () => {

        npcManager.addEventListener('npcadd', e => {

            const {player} = e.data;
            const newNpcs = npcs.concat([player]);
            setNpcs(newNpcs);

        });

        npcManager.addEventListener('npcremove', e => {

            const {player} = e.data;
            const newNpcs = npcs.slice().splice(npcs.indexOf(player), 1);
            setNpcs(newNpcs);

        });

    }, []);

    // tmp code [will be remove in next PRs]

    const claimsOpen = ( state.openedPanel === 'ClaimsPanel' ? 'claims' : false );

    const toggleClaimsOpen = () => {

        if ( claimsOpen ) {

            setState({ openedPanel: null });

        } else {

            setState({ openedPanel: 'ClaimsPanel' });

        }

    };

    //

	return (
        <div className={styles.container} onClick={ stopPropagation } >
            <CharacterHups
              localPlayer={localPlayer}
              npcs={npcs}
            />
            {/* <div className={styles.inner}> */}
                <HeaderIcon />
                <User
                    address={address}
                    setAddress={setAddress}
                    setLoginFrom={setLoginFrom}
                />
                <div className={styles.tabs}>
                    <Character
                        panelsRef={panelsRef}
                        wearActions={wearActions}
                        dioramaCanvasRef={dioramaCanvasRef}
                        game={game}
                    />
                    <CharacterSelect
                        
                    />
                    <Inventory
                    
                    />
                    {/* <Claims
                        open={ claimsOpen }
                        toggleOpen={ toggleClaimsOpen }
                        claims={claims}
                        panelsRef={panelsRef}
                    /> */}
                    <Tokens
                        nfts={nfts}
                        hacks={hacks}
                        address={address}
                        setNfts={setNfts}
                        loginFrom={loginFrom}
                    />
                </div>
            {/* </div> */}
        </div>
    );

};