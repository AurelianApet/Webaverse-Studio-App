import React, {useState, useContext, useEffect} from 'react';
import styles from './Location.module.css';
import {sceneManager} from '../../../../scene-manager'
import {scenesBaseUrl} from '../../../../endpoints';
import CustomButton from '../custom-button';
import {AppContext} from '../../app';
import universe from '../../../../universe';
import {makeId} from '../../../../util.js';
import classnames from 'classnames';
import cameraManager from '../../../../camera-manager';


// const sceneNames = await sceneManager.getSceneNamesAsync();
const origSceneList = [];

// sceneNames.forEach(name => {
//   origSceneList.push(`./scenes/${name}`);
// });

//

export const Location = () => {
  const [scenesList, setScenesList] = useState([]);
  const [rooms, setRooms] = useState([]);
  const {
    state,
    setState,
    selectedRoom,
    setSelectedRoom,
  } = useContext(AppContext);

  useEffect(() => {
    (async () => {
        const sceneNames = await sceneManager.getSceneNamesAsync();
        sceneNames.forEach(name => {
          const sceneUrl= sceneManager.getSceneUrl(name)
          if(!origSceneList.includes(sceneUrl)){
            origSceneList.push(sceneUrl);
          }
        });
        setScenesList(origSceneList);
    })();
  }, []);

  const handleSceneSelect = (event, sceneName) => {
    setState({openedModal: null});
    sceneName = sceneName ?? event.target.value;
    universe.pushUrl(`/?src=${encodeURIComponent(sceneName)}`);
  };

  //

  const refreshRooms = async () => {
    const res = await fetch(universe.getWorldsHost());

    if (res.ok) {
      const rooms = await res.json();
      setRooms(rooms);
    } else {
      const text = await res.text();
      console.warn('failed to fetch', res.status, text);
    }
  };

  //

  const stopPropagation = event => {
    event.stopPropagation();
  };

  const handleRoomCreateBtnClick = async () => {
    // const sceneName = selectedScene.trim();
    // const data = null; // Z.encodeStateAsUpdate( world.getState( true ) );

    // const roomName = makeId(5);

    // const res = await fetch(universe.getWorldsHost() + roomName, {
    //   method: 'POST',
    //   body: data,
    // });

    // if (res.ok) {
    //   refreshRooms();
    //   setSelectedRoom(roomName);
    //   universe.pushUrl(
    //     `/?src=${encodeURIComponent(sceneName)}&room=${roomName}`,
    //   );
    // } else {
    //   const text = await res.text();
    //   console.warn('error creating room', res.status, text);
    // }
  };

  const handleRoomSelect = room => {
    // setState({openedPanel: null});

    // if (!universe.isConnected()) {
    //   universe.pushUrl(
    //     `/?src=${encodeURIComponent(selectedScene)}&room=${room.name}`,
    //   );
    // }
  };

  const handleDeleteRoomBtnClick = async (room, event) => {
    event.stopPropagation();

    const res = await fetch(universe.getWorldsHost() + room.name, {
      method: 'DELETE',
    });

    if (res.ok) {
      refreshRooms();
    } else {
      const text = await res.text();
      console.warn('failed to fetch', res.status, text);
    }
  };

  useEffect(() => {
    // refreshRooms();
  }, []);

  return (
    <div className={styles.locationWrap} onClick={stopPropagation}>
      <div className={styles.scenesList} onMouseEnter={() => {cameraManager.canZoom = false;}} onMouseLeave={() => {cameraManager.canZoom = true;}}>
        {scenesList.map((sceneName, i) => {
          const scnName = sceneName
            .replace('.scn', '')
            .replace(scenesBaseUrl, '');
          return (
            <div
              className={styles.scene}
              onMouseDown={e => {
                cameraManager.canZoom = true;
                handleSceneSelect(e, sceneName);
              }}
              key={i}
            >
              <img className={styles.image} src="images/world.jpg" />
              <div className={styles.name}>{scnName}</div>
              <div className={styles.fileLocation}>File: {sceneName}</div>
            </div>
          );
        })}
      </div>
      <div className={styles.roomsList}>
        <div className={styles.create}>
          <CustomButton
            theme="light"
            icon="rooms"
            text="Create Room"
            size={12}
            className={styles.methodButton}
            onClick={handleRoomCreateBtnClick}
          />
        </div>
        {rooms.map((room, i) => (
          <div
            className={styles.room}
            onClick={e => {
              handleRoomSelect(room);
            }}
            key={i}
          >
            <img className={styles.image} src="images/world.jpg" />
            <div className={styles.name}>{room.name}</div>
            <div className={styles.delete}>
              <button
                className={classnames(styles.button, styles.warning)}
                onClick={handleDeleteRoomBtnClick.bind(this, room)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};