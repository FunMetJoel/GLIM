import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'

const vieuw3D = document.querySelector('#Vieuwer')
const vieuw3DContainer = document.querySelector('#SceneVieuw')

const scene = new THREE.Scene()

// const camera = new THREE.OrthographicCamera(vieuw3D.clientWidth,vieuw3D.clientWidth,vieuw3D.clientHeight,vieuw3D.clientHeight,0.1,1000)
const camera = new THREE.PerspectiveCamera(75, vieuw3D.clientWidth/vieuw3D.clientHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer({
  canvas: vieuw3D,
})

renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(vieuw3D.clientWidth, vieuw3D.clientHeight)
camera.position.set(5, 7.5, 10);
camera.lookAt(0, 0, 0);

renderer.render(scene, camera)
renderer.setClearColor( 0x130f40, 1);

const pointLight = new THREE.PointLight(0xffffff)
pointLight.position.set(10, 10, 10)
pointLight.intensity = 200

const ambientLight = new THREE.AmbientLight(0xffffff)

const boundingBox = new THREE.BoxGeometry(10, 5, 10)
const boundingBoxMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
const boundingBoxMesh = new THREE.Mesh(boundingBox, boundingBoxMaterial)
boundingBoxMesh.position.set(0, 2.5, 0)
const boxhelper = new THREE.BoxHelper(boundingBoxMesh, 0xffff00)

const connector = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
connector.position.set(0, 5, 0)

const gridHelper = new THREE.GridHelper(10, 10)
const axesHelper = new THREE.AxesHelper(2);

const controls = new OrbitControls(camera, renderer.domElement)

clearScene()

function animate() {
  requestAnimationFrame(animate)

  // torus.rotation.x += 0.01
  // torus.rotation.y += 0.005
  // torus.rotation.z += 0.01

  pointLight.position.x = camera.position.x
  pointLight.position.y = camera.position.y
  pointLight.position.z = camera.position.z

  renderer.render(scene, camera)
}

// Adjust the renderer size and camera aspect ratio on window resize
function onWindowResize() {
  camera.aspect = vieuw3DContainer.clientWidth / vieuw3DContainer.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(vieuw3DContainer.clientWidth, vieuw3DContainer.clientHeight);

  vieuw3D.style = ''
}

window.addEventListener('resize', onWindowResize);

animate()

// When file selected in input, load the stl file and display it
function loadFile(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const contents = e.target.result;
    const loader = new STLLoader();
    const geometry = loader.parse(contents);

    // Clear previous object
    clearScene();

    // Create a material and mesh
    const material = new THREE.MeshStandardMaterial({ color: 0xFF6347 });
    const mesh = new THREE.Mesh(geometry, material);

    // Center and scale the mesh
    geometry.center();
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const maxDim = Math.max(
      boundingBox.max.x - boundingBox.min.x,
      boundingBox.max.y - boundingBox.min.y,
      boundingBox.max.z - boundingBox.min.z
    );
    mesh.scale.setScalar(5 / maxDim);
    mesh.rotateX(-Math.PI / 2);
    mesh.position.set(0, 2.5, 0);

    // Add the mesh to the scene
    scene.add(mesh);
  };

  reader.readAsArrayBuffer(file);
}

modelInput.addEventListener('change', loadFile)

function clearScene() {
  scene.clear();
  scene.add(ambientLight, pointLight);
  scene.add(connector)
  scene.add(gridHelper, axesHelper, boxhelper)
}