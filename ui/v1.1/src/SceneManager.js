import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { TransformControls } from 'three/addons/controls/TransformControls';

export default class Scene {
    constructor(vieuw3D, vieuw3DContainer) {
        // save the canvas and container elements
        this.vieuw3D = vieuw3D
        this.vieuw3DContainer = vieuw3DContainer
        
        this.bounds = { x: 10, y: 10, z: 10 }
        this.currentGeometry = null
        this.currentGeometryMesh = null
        this.scale = 0.1
        this.position = { x: 0, y: 0, z: 0 }
        this.rotation = { x: 0, y: 0, z: 0 }
        this.doRotate = false
        this.rotationTime = 0
        this.lastAnimationFrameTime = Date.now()

        this.scene = new THREE.Scene()

        // camera stuff
        const aspect = this.vieuw3DContainer.clientWidth / this.vieuw3DContainer.clientHeight
        this.PerspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.PerspectiveCamera.position.set(10, 10, 10);
        this.PerspectiveCamera.lookAt(0, 0, 0);

        const frustumSize = 20;
        this.OrthographicCamera = new THREE.OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.OrthographicCamera.userData.frustumSize = frustumSize;
        this.OrthographicCamera.position.set(10, 10, 10);
        this.OrthographicCamera.lookAt(0, 0, 0);

        this.camera = this.OrthographicCamera

        this.renderer = new THREE.WebGLRenderer({
            canvas: vieuw3D,
        })
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(vieuw3D.clientWidth, vieuw3D.clientHeight)
        this.renderer.setClearColor( 0x130f40, 1);
        this.renderer.render(this.scene, this.camera)

        this.perspectiveOrbitControls = new OrbitControls(this.PerspectiveCamera, this.renderer.domElement)
        this.orthographicOrbitControls = new OrbitControls(this.OrthographicCamera, this.renderer.domElement)
        window.addEventListener('resize', () => this.onResize())
    }

    setupBase() {
        this.pointLight = new THREE.PointLight(0xffffff)
        this.pointLight.position.set(10, 10, 10)
        this.pointLight.intensity = 750
        this.pointLight.userData.keep = true

        this.ambientLight = new THREE.AmbientLight(0xffffff)
        this.ambientLight.intensity = 0.25
        this.ambientLight.userData.keep = true

        const boundingBox = new THREE.BoxGeometry(1, 1, 1)
        this.boundingBoxMesh = new THREE.Mesh(boundingBox)
        
        this.boxhelper = new THREE.BoxHelper(this.boundingBoxMesh, 0xffff00)
        this.boxhelper.userData.keep = true
        this.connector = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
        this.connector.userData.keep = true

        this.setupBoundingBox(this.bounds.x, this.bounds.y, this.bounds.z)

        this.scene.add(this.pointLight, this.ambientLight, this.boxhelper, this.connector)
    }

    setupBoundingBox(width, height, depth) {
        this.boundingBoxMesh.scale.set(width, height, depth)
        this.boundingBoxMesh.position.set(0, height/2, 0)
        this.boxhelper.update()

        this.connector.position.set(0, height, 0)

        this.createGrid(width, depth)

        this.perspectiveOrbitControls.target = new THREE.Vector3(0, height/2, 0)
        this.orthographicOrbitControls.target = new THREE.Vector3(0, height/2, 0)

        this.perspectiveOrbitControls.update()
        this.orthographicOrbitControls.update()
    }

    createGrid(width, height) {
    
        var material = new THREE.LineBasicMaterial({
            color: 0xDD006C,
            opacity: 0.2
        });
    
        for (var i = 0; i <= width; i++) {
            var points = [];
            points.push(new THREE.Vector3(i-(width/2), 0, -height/2));
            points.push(new THREE.Vector3(i-(width/2), 0, height/2));

            const geometry = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.Line( geometry, material );
            this.scene.add(line);
        }

        for (var i = 0; i <= height; i++) {
            var points = [];
            points.push(new THREE.Vector3(-width/2, 0, i-(height/2)));
            points.push(new THREE.Vector3(width/2, 0, i-(height/2)));

            const geometry = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.Line( geometry, material );
            this.scene.add(line);
        }
    }

    clearScene() {
        this.scene.children = this.scene.children.filter(child => child.userData.keep)
    }

    animate() {
        requestAnimationFrame(() => this.animate())
        
        this.pointLight.position.copy(this.OrthographicCamera.position)

        if (this.doRotate && this.currentGeometryMesh) {
            const rotationSpeed = 0.001 * (Date.now() - this.lastAnimationFrameTime)
            console.log(rotationSpeed)
            this.rotationTime += rotationSpeed
            const t = this.rotationTime
            this.currentGeometryMesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotationSpeed)

            const circleLength = Math.sqrt(this.position.x ** 2 + this.position.z ** 2)
            this.currentGeometryMesh.position.set(
                Math.cos(-t) * circleLength, 
                this.position.y + (this.bounds.y / 2), 
                Math.sin(-t) * circleLength
            )
        }

        this.renderer.render(this.scene, this.camera)
        this.lastAnimationFrameTime = Date.now()
    }

    onResize() {
        const aspect = this.vieuw3DContainer.clientWidth / this.vieuw3DContainer.clientHeight
        this.PerspectiveCamera.aspect = aspect
        this.PerspectiveCamera.updateProjectionMatrix()
        
        const frustumSize = this.OrthographicCamera.userData.frustumSize;
        this.OrthographicCamera.left = (frustumSize * aspect) / -2;
        this.OrthographicCamera.right = (frustumSize * aspect) / 2;
        this.OrthographicCamera.top = frustumSize / 2;
        this.OrthographicCamera.bottom = frustumSize / -2;
        this.OrthographicCamera.updateProjectionMatrix()

        this.renderer.setSize(this.vieuw3DContainer.clientWidth, this.vieuw3DContainer.clientHeight)
        this.renderer.render(this.scene, this.camera)

        this.vieuw3D.style = ''
    }

    reloadScene() {
        var start = new Date();
        this.clearScene()
        this.setupBoundingBox(this.bounds.x, this.bounds.y, this.bounds.z)
        this.rotationTime = 0

        if (this.currentGeometry) {
            const geometry = this.currentGeometry.clone()

            // Create a material and mesh
            const material = new THREE.MeshStandardMaterial({ color: 0xFF6347 });
            
            // Define the box bounds in world space
            const boxMin = new THREE.Vector3(-2.5, -2.5, -2.5);
            const boxMax = new THREE.Vector3(2.5, 2.5, 2.5);
            const insideColor = new THREE.Color(0x00ff00); // Color for inside the box
            const outsideColor = new THREE.Color(0xff0000); // Color for outside the box

    

            this.currentGeometryMesh = new THREE.Mesh(geometry, material);
            
            this.currentGeometryMesh.scale.setScalar(this.scale);
            this.currentGeometryMesh.rotateX(-Math.PI / 2);
            this.currentGeometryMesh.rotateX(this.rotation.x / 180 * Math.PI);
            this.currentGeometryMesh.rotateY(this.rotation.y / 180 * Math.PI);
            this.currentGeometryMesh.rotateZ(this.rotation.z / 180 * Math.PI);
            this.currentGeometryMesh.position.set(this.position.x, this.position.y + (this.bounds.y / 2), this.position.z);


            // Add the mesh to the scene
            this.scene.add(this.currentGeometryMesh);
        }
    }

    setBounds(width, height, depth) {
        this.bounds = { x: width, y: height, z: depth }
        this.reloadScene()
    }

    loadFile(event) {
        const file = event.target.files[0]
        const reader = new FileReader()

        reader.onload = function(e) {
            const contents = e.target.result
            const loader = new STLLoader()
            const geometry = loader.parse(contents)

            this.currentGeometry = geometry
            this.reloadScene()
            

        }.bind(this)

        reader.readAsArrayBuffer(file)
    }

    switchCamera() {
        if (this.camera === this.PerspectiveCamera) {
            this.camera = this.OrthographicCamera
        } else {
            this.camera = this.PerspectiveCamera
        }
    }

    setScale(scale) {
        this.scale = scale
        this.reloadScene()
    }

    setGeometry(geometry) {
        this.currentGeometry = geometry
        this.reloadScene()
    }

    setPosition(position) {
        this.position = position
        this.reloadScene()
    }

    setRotation(rotation) {
        this.rotation = rotation
        this.reloadScene()
    }

    setDoRotate(doRotate) {
        console.log(doRotate)
        this.doRotate = doRotate
        this.reloadScene()
    }
}