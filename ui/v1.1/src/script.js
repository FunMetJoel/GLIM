import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'

import Scene from './SceneManager.js'
import { getOuterPoint, ensureIndexed, colorByDistance, subdivideLongEdges } from './geometryCalculations.js'

var currentGeometry = null

const vieuw3D = document.querySelector('#Vieuwer')
const vieuw3DContainer = document.querySelector('#SceneVieuw')
const scaleInput = document.querySelector('#scale-input')
const unitInput = document.querySelector('#model-unit')
const positionInputs = document.querySelectorAll('.position-input')
const rotationInputs = document.querySelectorAll('.rotation-input')
const doRotateInput = document.querySelector('#doRotation')
const calculateRotationBoundsButton = document.querySelector('#calculateRotationBounds')

const scene = new Scene(vieuw3D, vieuw3DContainer)
scene.setupBase()
scene.animate()
scene.createGrid(10, 10)
scene.setBounds(10, 6, 6)

// const event = new CustomEvent('transformChanged', { detail: { position: this.position, rotation: this.rotation } })
scene.addEventListener('transformChanged', function(event){
  positionInputs[0].value = Math.round(event.detail.position.x * 10)
  positionInputs[1].value = Math.round(event.detail.position.y * 10)
  positionInputs[2].value = Math.round(event.detail.position.z * 10)

  rotationInputs[0].value = Math.round(event.detail.rotation.x)
  rotationInputs[1].value = Math.round(event.detail.rotation.y)
  rotationInputs[2].value = Math.round(event.detail.rotation.z)

  console.log('transformChanged', event.detail)
});

const switchCameraButton = document.querySelector('#switchCamButton')
switchCameraButton.addEventListener('click', scene.switchCamera.bind(scene))

const modelInput = document.querySelector('#model-input')

function loadStlFile(event){
  const file = event.target.files[0]
  const reader = new FileReader()
  reader.onload = function (e) {
      const loader = new STLLoader()
      const geometry = loader.parse(e.target.result)
      geometry.center()
      currentGeometry = geometry
      scene.setGeometry(currentGeometry)
  }
  reader.readAsArrayBuffer(file)
}

// When file selected in input, load the stl file and display it
modelInput.addEventListener('change', loadStlFile)

function calculateScale(){
  var scale = parseFloat(scaleInput.value) / 100
  if (isNaN(scale)){
    scale = 1
  }
  if (unitInput.value === 'mm'){
    scale = scale * 0.1
  } else if (unitInput.value === 'cm'){
    scale = scale
  } else if (unitInput.value === 'dm'){
    scale = scale * 10
  } else if (unitInput.value === 'm'){
    scale = scale * 100
  } else if (unitInput.value === 'in'){
    scale = scale * 2.54
  } else if (unitInput.value === 'ft'){
    scale = scale * 30.48
  }

  scene.scale = scale
  scene.reloadScene()
}

scaleInput.addEventListener('change', calculateScale)
unitInput.addEventListener('change', calculateScale)

positionInputs.forEach(element => {
  element.addEventListener('change', function(){
    var position = {
      x: parseFloat(positionInputs[0].value)*0.1,
      y: parseFloat(positionInputs[1].value)*0.1,
      z: parseFloat(positionInputs[2].value)*0.1
    }
    scene.setPosition(position)
  })
});

rotationInputs.forEach(element => {
  element.addEventListener('change', function(){
    var rotation = {
      x: parseFloat(rotationInputs[0].value),
      y: parseFloat(rotationInputs[1].value),
      z: parseFloat(rotationInputs[2].value)
    }
    scene.setRotation(rotation)
  })
});

doRotateInput.addEventListener('change', function(){
  scene.setDoRotate(doRotateInput.checked)
});

calculateRotationBoundsButton.addEventListener('click', function(){
  if (currentGeometry === null){
    return
  }

  const geometry = currentGeometry.clone()
  geometry.scale(scene.scale, scene.scale, scene.scale)
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateX(scene.rotation.x / 180 * Math.PI)
  geometry.rotateY(scene.rotation.z / 180 * Math.PI)
  geometry.rotateZ(-scene.rotation.y / 180 * Math.PI)
  geometry.translate(scene.position.x, scene.position.y, scene.position.z)

  const output = getOuterPoint(geometry);

  console.log(output.maxDistance);
  
  // Create circle of size maxDistance
  const circleGeometry = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < 100; i++) {
    const angle = i / 100 * Math.PI * 2;
    const x = Math.cos(angle) * output.maxDistance;
    const z = Math.sin(angle) * output.maxDistance;
    vertices.push(x, 0, z);
  }

  vertices.push(output.maxDistance, 0, 0);

  circleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({ color: 0x0000ff });

  const circle = new THREE.Line(circleGeometry, material);

  scene.scene.add(circle);

  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }));

  scene.scene.add(mesh);
});

const sliceButton = document.querySelector('#sliceButton')

sliceButton.addEventListener('click', function(){
  if (currentGeometry === null){
    return
  }

  console.log('clone geometry')
  var geometry = currentGeometry.clone()

  console.log('indexing geometry')
  geometry = ensureIndexed(geometry)

  console.log(geometry)

  console.log('subdivide long edges')
  geometry = subdivideLongEdges(geometry, 9)

  console.log(geometry)

  console.log('color by distance')
  colorByDistance(geometry, { x: 0, y: 0, z: 0 })

  console.log('add sliced geometry')
  scene.addSlicedGeometry(geometry)
});