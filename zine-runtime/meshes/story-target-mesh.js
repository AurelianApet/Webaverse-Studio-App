import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class StoryTargetMesh extends THREE.Mesh {
  constructor() {
    const baseHeight = 0.2;
    const baseWidth = 0.03;
    const centerSpacing = baseWidth;
    
    const _addYs = geometry => {
      const ys = new Float32Array(geometry.attributes.position.array.length / 3);
      for (let i = 0; i < ys.length; i++) {
        ys[i] = 1 - geometry.attributes.position.array[i * 3 + 1] / baseHeight;
      }
      geometry.setAttribute('y', new THREE.BufferAttribute(ys, 1));
    };
    const _addDirection = (geometry, direction) => {
      const directions = new Float32Array(geometry.attributes.position.array.length);
      for (let i = 0; i < directions.length / 3; i++) {
        directions[i + 0] = direction.x;
        directions[i + 1] = direction.y;
        directions[i + 2] = direction.z;
      }
      geometry.setAttribute('direction', new THREE.BufferAttribute(directions, 3));
    };

    // top geometry
    const topGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth)
      .translate(0, baseHeight / 2 + centerSpacing, 0);
    _addYs(topGeometry);
    _addDirection(topGeometry, new THREE.Vector3(0, 1, 0));
    // other geometries
    const leftGeometry = topGeometry.clone()
      .rotateZ(Math.PI / 2);
    _addDirection(leftGeometry, new THREE.Vector3(-1, 0, 0));
    const bottomGeometry = topGeometry.clone()
      .rotateZ(Math.PI);
    _addDirection(bottomGeometry, new THREE.Vector3(0, -1, 0));
    const rightGeometry = topGeometry.clone()
      .rotateZ(-Math.PI / 2);
    _addDirection(bottomGeometry, new THREE.Vector3(1, 0, 0));
    const forwardGeometry = topGeometry.clone()
      .rotateX(-Math.PI / 2);
    _addDirection(bottomGeometry, new THREE.Vector3(0, 0, -1));
    const backGeometry = topGeometry.clone()
      .rotateX(Math.PI / 2);
    _addDirection(bottomGeometry, new THREE.Vector3(0, 0, 1));
    // merged geometry
    const geometries = [
      topGeometry,
      leftGeometry,
      bottomGeometry,
      rightGeometry,
      forwardGeometry,
      backGeometry,
    ];
    const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
    
    // const material = new THREE.MeshBasicMaterial({
    //   color: 0x333333,
    // });
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
          needsUpdate: true,
        },
        uPress: {
          value: 0,
          needsUpdate: true,
        },
      },
      vertexShader: `\
        uniform float uTime;
        uniform float uPress;
        attribute float y;
        attribute vec3 direction;
        varying float vY;
        varying vec2 vUv;
        varying vec3 vDirection;

        void main() {
          vUv = uv;
          vY = y;
          vDirection = direction; // XXX offset by direction and time
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `\
        varying vec2 vUv;
        varying float vY;
        varying vec3 vDirection;

        void main() {
          vec3 c = vec3(0.1, 0.1, 0.1);
          gl_FragColor = vec4(c, 1.);
          gl_FragColor.rgb += vY * 0.15;
          // gl_FragColor.rg += vUv * 0.2;
        }
      `,
      transparent: true,
    });

    super(geometry, material);

    this.name = 'storyTargetMesh';
  }
}