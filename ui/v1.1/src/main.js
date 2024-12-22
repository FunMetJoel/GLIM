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
camera.position.set(10, 10, 10);
camera.lookAt(0, 0, 0);

renderer.render(scene, camera)
renderer.setClearColor( 0x130f40, 1);


const geometry = new THREE.TorusGeometry(1, 0.3, 16, 100)
const material = new THREE.MeshStandardMaterial({ color: 0xFF6347 })
const torus = new THREE.Mesh(geometry, material)

scene.add(torus)

const pointLight = new THREE.PointLight(0xffffff)
pointLight.position.set(10, 10, 10)
pointLight.intensity = 200

scene.add(pointLight)

const ambientLight = new THREE.AmbientLight(0xffffff)
scene.add(ambientLight)

const gridHelper = new THREE.GridHelper(10, 10)
const axesHelper = new THREE.AxesHelper(5);
scene.add(gridHelper, axesHelper)

const controls = new OrbitControls(camera, renderer.domElement)

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
    scene.clear();
    scene.add(ambientLight, pointLight);
    scene.add(gridHelper, axesHelper)

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
    mesh.scale.setScalar(10 / maxDim);

    // Add the mesh to the scene
    scene.add(mesh);
  };

  reader.readAsArrayBuffer(file);
}

modelInput.addEventListener('change', loadFile)