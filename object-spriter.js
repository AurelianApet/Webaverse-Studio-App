import * as THREE from 'three';
import {getRenderer, scene} from './renderer.js';
import {fitCameraToBoundingBox} from './util.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4D = new THREE.Vector4();
const localColor = new THREE.Color();
const localMatrix = new THREE.Matrix4();

const defaultSize = 2048;
const defaultNumAnimationFrames = 128;
const defaultNumSpritesheetFrames = 8;

const _addPreviewLights = scene => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 2, 3);
  directionalLight.updateMatrixWorld();
  scene.add(directionalLight);
};

const sideScene = new THREE.Scene();
sideScene.autoUpdate = false;
_addPreviewLights(sideScene);
const sideCamera = new THREE.PerspectiveCamera();

const _makeSpritesheetRenderTarget = (w, h) => new THREE.WebGLRenderTarget(w, h, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping,
});
const createObjectSpriteAnimation = (app, {
  // canvas,
  size = defaultSize,
  numFrames = defaultNumAnimationFrames,
} = {}, {
  type = 'texture',
} = {}) => {
  // const {devicePixelRatio: pixelRatio} = window;

  // console.log('create object sprite', app, size, numFrames);

  const renderer = getRenderer();
  // const size = renderer.getSize(localVector2D);
  const pixelRatio = renderer.getPixelRatio();

  const numFramesPow2 = Math.pow(2, Math.ceil(Math.log2(numFrames)));
  const numFramesPerRow = Math.ceil(Math.sqrt(numFramesPow2));
  const frameSize = size / numFramesPerRow;

  // create render target
  let renderTarget;
  if (type === 'texture') {
    renderTarget = _makeSpritesheetRenderTarget(size * pixelRatio, size * pixelRatio);
  } else if (type === 'imageBitmap') {
    const requiredWidth = frameSize * numFramesPerRow * pixelRatio;
    const requiredHeight = frameSize * numFramesPerRow * pixelRatio;
    if (requiredWidth > renderer.domElement.width || requiredHeight > renderer.domElement.height) {
      // console.log('resize to', requiredWidth / pixelRatio, requiredHeight / pixelRatio, pixelRatio);
      renderer.setSize(requiredWidth / pixelRatio, requiredHeight / pixelRatio);
      renderer.setPixelRatio(pixelRatio);
    }
  }

  // push old state
  let oldRenderTarget;
  if (type === 'texture') {
    oldRenderTarget = renderer.getRenderTarget();
  }
  const oldViewport = renderer.getViewport(localVector4D);
  const oldClearColor = renderer.getClearColor(localColor);
  const oldClearAlpha = renderer.getClearAlpha();
  
  {
    const originalParent = app.parent;
    sideScene.add(app);
    sideScene.updateMatrixWorld();

    if (type === 'texture') {
      renderer.setRenderTarget(renderTarget);
    }
    renderer.setClearColor(0xffffff, 0);
    renderer.clear();

    for (let i = 0; i < numFrames; i++) {
      const y = Math.floor(i / numFramesPerRow);
      const x = i - y * numFramesPerRow;
    
      // set up side camera
      const angle = (i / numFrames) * Math.PI * 2;
      const physicsObjects = app.getPhysicsObjects();
      if (physicsObjects.length > 0) {
        const physicsObject = physicsObjects[0];
        const {physicsMesh} = physicsObject;
        sideCamera.position.copy(physicsMesh.geometry.boundingBox.getCenter(localVector3))
          .add(
            localVector.set(Math.cos(angle), 0, Math.sin(angle))
              .applyQuaternion(app.quaternion)
              .multiplyScalar(2)
          );
        fitCameraToBoundingBox(sideCamera, physicsMesh.geometry.boundingBox, 1.2);
      } else {
        sideCamera.position.copy(app.position)
          .add(
            localVector.set(Math.cos(angle), 0, Math.sin(angle))
              .applyQuaternion(app.quaternion)
              .multiplyScalar(2)
          );
        sideCamera.quaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            sideCamera.position,
            app.position,
            localVector2.set(0, 1, 0)
          )
        );
      }
      sideCamera.updateMatrixWorld();
      
      // render side scene
      renderer.setViewport(x*frameSize, y*frameSize, frameSize, frameSize);
      renderer.render(sideScene, sideCamera);
    }

    if (originalParent) {
      originalParent.add(app);
    } else {
      sideScene.remove(app);
    }
  }

  // pop old state
  if (type === 'texture') {
    renderer.setRenderTarget(oldRenderTarget);
  }
  renderer.setViewport(oldViewport);
  renderer.setClearColor(oldClearColor, oldClearAlpha);

  // return result
  if (type === 'texture') {
    return {
      result: renderTarget.texture,
      numFrames,
      frameSize,
      numFramesPerRow,
    };
  } else if (type === 'imageBitmap') {
    return (async () => {
      const imageBitmap = await createImageBitmap(renderer.domElement, 0, 0, size, size, {
        // imageOrientation: 'flipY',
      });
      return {
        result: imageBitmap,
        numFrames,
        frameSize,
        numFramesPerRow,
      }
    })();
  } else {
    throw new Error('Unknown type');
  }
};
const createObjectSpriteSheet = async (app, {
  size = defaultSize,
  numFrames = defaultNumSpritesheetFrames,
} = {}) => {
  const renderer = getRenderer();
  const pixelRatio = renderer.getPixelRatio();

  const numFramesPow2 = Math.pow(2, Math.ceil(Math.log2(numFrames)));
  const numFramesPerRow = Math.ceil(Math.sqrt(numFramesPow2));
  const frameSize = size / numFramesPerRow;

  // create render target
  const requiredWidth = frameSize * numFramesPerRow * pixelRatio;
  const requiredHeight = frameSize * numFramesPerRow * pixelRatio;
  if (requiredWidth > renderer.domElement.width || requiredHeight > renderer.domElement.height) {
    renderer.setSize(requiredWidth / pixelRatio, requiredHeight / pixelRatio);
    renderer.setPixelRatio(pixelRatio);
  }

  // push old state
  const oldViewport = renderer.getViewport(localVector4D);
  const oldClearColor = renderer.getClearColor(localColor);
  const oldClearAlpha = renderer.getClearAlpha();
  
  const originalParent = app.parent;
  sideScene.add(app);
  sideScene.updateMatrixWorld();

  // clear
  renderer.setClearColor(0xffffff, 0);
  renderer.clear();

  // get size
  const physicsObjects = app.getPhysicsObjects();
  let worldWidth, worldHeight;
  const fitScale = 1.2;
  if (physicsObjects.length > 0) {
    const physicsObject = physicsObjects[0];
    const {physicsMesh} = physicsObject;
    const size = physicsMesh.geometry.boundingBox.getSize(localVector);
    worldWidth = Math.max(size.x, size.z);
    worldHeight = size.y;
  } else {
    worldWidth = 1;
    worldHeight = 1;
  }
  worldWidth *= fitScale;
  worldHeight *= fitScale;

  // render
  for (let i = 0; i < numFrames; i++) {
    const y = Math.floor(i / numFramesPerRow);
    const x = i - y * numFramesPerRow;
  
    // set up side camera
    const angle = (i / numFrames) * Math.PI * 2;
    if (physicsObjects.length > 0) {
      const physicsObject = physicsObjects[0];
      const {physicsMesh} = physicsObject;
      sideCamera.position.copy(physicsMesh.geometry.boundingBox.getCenter(localVector3))
        .add(
          localVector.set(Math.cos(angle), 0, Math.sin(angle))
            .applyQuaternion(app.quaternion)
            .multiplyScalar(2)
        );
      fitCameraToBoundingBox(sideCamera, physicsMesh.geometry.boundingBox, fitScale);
    } else {
      sideCamera.position.copy(app.position)
        .add(
          localVector.set(Math.cos(angle), 0, Math.sin(angle))
            .applyQuaternion(app.quaternion)
            .multiplyScalar(2)
        );
      sideCamera.quaternion.setFromRotationMatrix(
        localMatrix.lookAt(
          sideCamera.position,
          app.position,
          localVector2.set(0, 1, 0)
        )
      );
    }
    sideCamera.updateMatrixWorld();
    
    // render side scene
    renderer.setViewport(x*frameSize, y*frameSize, frameSize, frameSize);
    renderer.render(sideScene, sideCamera);
  }

  // pop old state
  if (originalParent) {
    originalParent.add(app);
  } else {
    sideScene.remove(app);
  }
  renderer.setViewport(oldViewport);
  renderer.setClearColor(oldClearColor, oldClearAlpha);

  const imageBitmap = await createImageBitmap(renderer.domElement, 0, 0, size, size, {
    // imageOrientation: 'flipY',
  });
  return {
    result: imageBitmap,
    numFrames,
    frameSize,
    numFramesPerRow,
    worldWidth,
    worldHeight,
  };
};

export {
  createObjectSpriteAnimation,
  createObjectSpriteSheet,
};