import * as THREE from 'three';
import metaversefile from './metaversefile-api.js';
// import {getExt, makePromise, parseQuery, fitCameraToBoundingBox} from './util.js';
import Avatar from './avatars/avatars.js';
// import * as audioManager from './audio-manager.js';
import npcManager from './npc-manager.js';
import dioramaManager from './diorama.js';
// import {getRenderer, scene, camera} from './renderer.js';

// import GIF from './gif.js';
// import * as WebMWriter from 'webm-writer';
// const defaultWidth = 512;
// const defaultHeight = 512;
const FPS = 60;
// const videoQuality = 0.99999;
// const videoQuality = 0.95;
const narutoRunSpeed = 59;

// const localVector = new THREE.Vector3();
// const localVector2 = new THREE.Vector3();
// const localVector3 = new THREE.Vector3();
// const localQuaternion = new THREE.Quaternion();
// const localEuler = new THREE.Euler();
// const localMatrix = new THREE.Matrix4();

const _makeLights = () => {
  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 5);
  directionalLight.position.set(1, 1.5, -2);
  directionalLight.updateMatrixWorld();

  return [
    directionalLight,
  ];
};

export const screenshotAvatarUrl = async ({
  start_url,
  width = 300,
  height = 300,
}) => {
  const app = await metaversefile.createAppAsync({
    start_url,
  });
  return await screenshotAvatarApp({
    app,
    width,
    height,
  });
};
export const screenshotAvatarApp = async ({
  app,
  width = 300,
  height = 300,
}) => {
  await Avatar.waitForLoad();
  // await audioManager.waitForLoad();

  const animations = metaversefile.useAvatarAnimations();
  const idleAnimation = animations.find(a => a.name === 'idle.fbx');
  const idleAnimationDuration = idleAnimation.duration;
  const narutoRunAnimation = animations.find(a => a.isNarutoRun);
  const narutoRunAnimationDuration = narutoRunAnimation.duration;

  // load app
  /* const app = await metaversefile.createAppAsync({
    start_url: url,
  }); */

  const position = new THREE.Vector3(0, 1.5, 0);
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const player = npcManager.createNpc({
    name: 'npc',
    avatarApp: app,
    position,
    quaternion,
    scale,
    detached: true,
  });

  let now = 0;
  const timeDiff = 1000/FPS;

  const _setTransform = () => {
    player.position.y = player.avatar.height;
    player.updateMatrixWorld();
  };
  _setTransform();

  const _initializeAnimation = () => {
    player.avatar.setTopEnabled(false);
    player.avatar.setHandEnabled(0, false);
    player.avatar.setHandEnabled(1, false);
    player.avatar.setBottomEnabled(false);
    player.avatar.inputs.hmd.position.y = player.avatar.height;
    player.avatar.inputs.hmd.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    player.avatar.inputs.hmd.updateMatrixWorld();
    player.addAction({
      type: 'emote',
      emotion: 'angry',
    });
  };
  const _preAnimate = () => {
    for (let i = 0; i < FPS*2; i++) {
      _animate(now, timeDiff);
    };
  };
  const _updateTarget = (timestamp, timeDiff) => {
    target.matrixWorld.copy(player.avatar.modelBones.Head.matrixWorld)
      .decompose(target.position, target.quaternion, target.scale);
    target.position.set(player.position.x, target.position.y, player.position.z);
    target.quaternion.copy(player.quaternion);
    target.matrixWorld.compose(target.position, target.quaternion, target.scale);
  };
  const _animate = (timestamp, timeDiff) => {
    player.updateAvatar(timestamp, timeDiff);
  };

  // rendering
  const writeCanvas = document.createElement('canvas');
  writeCanvas.width = width;
  writeCanvas.height = height;

  const localLights = _makeLights();
  const objects = localLights.concat([
    player.avatar.model,
  ]);
  // console.log('got model bones', player.avatar.modelBones);
  // debugger;
  const target = new THREE.Object3D();
  const diorama = dioramaManager.createPlayerDiorama({
    // target: player,
    target,
    objects,
    lights: false,
    // label: true,
    // outline: true,
    // grassBackground: true,
    // glyphBackground: true,
    detached: true,
  });
  diorama.addCanvas(writeCanvas);
  diorama.setClearColor(0xFFFFFF, 1);

  const _render = () => {
    _initializeAnimation();
    _preAnimate();
    _updateTarget(now, timeDiff);
    diorama.update(now, timeDiff);
  };
  _render();

  diorama.destroy();

  return writeCanvas;
};