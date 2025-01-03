import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

function ensureIndexed(geometry) {
    if (!geometry.index) {
        console.warn("Geometry is not indexed. Converting to indexed geometry.");
        geometry = BufferGeometryUtils.mergeVertices(geometry);
    }
    return geometry;
}

function calculateGeodesicDistances(geometry, startIndex) {
    const vertices = geometry.attributes.position.array;
    const vertexCount = vertices.length / 3;

    // Build adjacency list
    const adjacencyList = Array.from({ length: vertexCount }, () => []);
    const indexArray = geometry.index.array;
    for (let i = 0; i < indexArray.length; i += 3) {
        const a = indexArray[i];
        const b = indexArray[i + 1];
        const c = indexArray[i + 2];
        adjacencyList[a].push(b, c);
        adjacencyList[b].push(a, c);
        adjacencyList[c].push(a, b);
    }

    // check for points in same position
    for (let i = 0; i < adjacencyList.length; i++) {
        // get position of vertex i
        const x = vertices[i * 3];
        const y = vertices[i * 3 + 1];
        const z = vertices[i * 3 + 2];

        // check if there are other vertices with the same position
        for (let j = i + 1; j < adjacencyList.length; j++) {
            // get position of vertex j
            const x2 = vertices[j * 3];
            const y2 = vertices[j * 3 + 1];
            const z2 = vertices[j * 3 + 2];

            // check if the positions are the same
            if (x == x2 && y == y2 && z == z2) {
                adjacencyList[i].push(j);
                adjacencyList[j].push(i);
            }
        }
    }

    // Dijkstra's algorithm to compute shortest paths
    const distances = Array(vertexCount).fill(Infinity);
    distances[startIndex] = 0;
    const visited = Array(vertexCount).fill(false);
    const priorityQueue = [[startIndex, 0]];

    while (priorityQueue.length > 0) {
        priorityQueue.sort((a, b) => a[1] - b[1]); // Sort by distance
        const [current, dist] = priorityQueue.shift();
        if (visited[current]) continue;
        visited[current] = true;

        for (const neighbor of adjacencyList[current]) {
            const dx = vertices[neighbor * 3] - vertices[current * 3];
            const dy = vertices[neighbor * 3 + 1] - vertices[current * 3 + 1];
            const dz = vertices[neighbor * 3 + 2] - vertices[current * 3 + 2];
            const edgeLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const newDist = dist + edgeLength;
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                priorityQueue.push([neighbor, newDist]);
            }
        }
    }

    for (let i = 0; i < distances.length; i++) {
        if (distances[i] === Infinity) {
            distances[i] = 0; // Set unreachable vertices to 0
        }
    }

    return distances;
}

function colorMeshByDistance(mesh, referencePoint) {
    const geometry = mesh.geometry;
    geometry.computeBoundingBox(); // Ensure bounding box is computed

    // Find the closest vertex to the reference point
    const position = geometry.attributes.position;
    console.log(position.getX(0), position.getY(0), position.getZ(0));
    let closestIndex = 0;
    let closestDistance = Infinity;
    for (let i = 0; i < position.count; i++) {
        const dx = position.getX(i) - referencePoint.x;
        const dy = position.getY(i) - referencePoint.y;
        const dz = position.getZ(i) - referencePoint.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < closestDistance) {
            closestDistance = dist;
            closestIndex = i;
        }
    }

    // Calculate geodesic distances
    const distances = calculateGeodesicDistances(geometry, closestIndex);
    console.log(distances);

    // Normalize distances for coloring
    const maxDistance = Math.max(...distances);
    const colors = [];
    for (let i = 0; i < distances.length; i++) {
        const t = distances[i] / maxDistance; // Normalize
        colors.push(t, 0, 1 - t); // Map to a blue-red gradient
    }

    // Apply vertex colors
    const colorAttr = new THREE.Float32BufferAttribute(colors, 3);
    geometry.setAttribute('color', colorAttr);

    // Use a material that supports vertex colors
    mesh.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
    });
}

export default class Scene {
    constructor(vieuw3D, vieuw3DContainer) {
        // save the canvas and container elements
        this.vieuw3D = vieuw3D
        this.vieuw3DContainer = vieuw3DContainer
        
        this.bounds = { x: 10, y: 10, z: 10 }
        this.currentGeometry = null
        this.currentGeometryMesh = null
        this.slicedGeometryMesh = null
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
        this.TransformControls = new TransformControls(this.camera, this.renderer.domElement)
        this.TransformControls.userData.keep = true
        window.addEventListener('resize', () => this.onResize())

        this.TransformControls.addEventListener('dragging-changed', function (event) {
            this.perspectiveOrbitControls.enabled = !event.value;
            this.orthographicOrbitControls.enabled = !event.value;
        }.bind(this));

        this.transformChangedEventTarget = new EventTarget()

        this.TransformControls.setRotationSnap(THREE.MathUtils.degToRad(1))
        this.TransformControls.setTranslationSnap(0.1)

        this.TransformControls.addEventListener('change', function (event) {

            if (!this.currentGeometryMesh) return

            this.position = {
                x: this.currentGeometryMesh.position.x,
                y: this.currentGeometryMesh.position.y - (this.bounds.y / 2),
                z: this.currentGeometryMesh.position.z
            }

            this.rotation = {
                x: (this.currentGeometryMesh.rotation.x / Math.PI * 180) + 90,
                y: (this.currentGeometryMesh.rotation.y / Math.PI * 180),
                z: this.currentGeometryMesh.rotation.z / Math.PI * 180
            }

            console.log(this.position, this.rotation)

            const nEvent = new CustomEvent('transformChanged', { detail: { position: this.position, rotation: this.rotation } })
            this.transformChangedEventTarget.dispatchEvent(nEvent)
            
        }.bind(this));


        window.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 't': // Press 't' for translate mode
                    this.TransformControls.setMode('translate');
                    break;
                case 'r': // Press 'r' for rotate mode
                    this.TransformControls.setMode('rotate');
                    break;
                case 'Control':
                    this.TransformControls.setTranslationSnap(1)
                    this.TransformControls.setRotationSnap(THREE.MathUtils.degToRad(10))
                    break;
                case 'Escape':
                    this.TransformControls.detach()
                    break;
            }
        });

        window.addEventListener('keyup', (event) => {
            switch (event.key) {
                case 'Control':
                    this.TransformControls.setTranslationSnap(0.1)
                    this.TransformControls.setRotationSnap(THREE.MathUtils.degToRad(1))
                    break;
            }
        });

        this.scene.add(this.TransformControls)

    }

    addEventListener(eventName, callback) {
        this.transformChangedEventTarget.addEventListener(eventName, callback)
    }

    removeEventListener(eventName, callback) {
        this.transformChangedEventTarget.removeEventListener(eventName, callback)
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

        this.roerboon = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.75), new THREE.MeshStandardMaterial({ color: 0xffffff }))
        this.roerboon.userData.keep = true
        this.roerboon.rotateX(Math.PI / 2)
        this.roerboon.position.set(0, 0.25, 0)

        
        this.setupBoundingBox(this.bounds.x, this.bounds.y, this.bounds.z)

        this.scene.add(this.pointLight, this.ambientLight, this.boxhelper, this.connector, this.roerboon)
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

        this.roerboon.rotateZ(0.3)

        if (this.doRotate && this.slicedGeometryMesh) {
            const rotationSpeed = 0.001 * (Date.now() - this.lastAnimationFrameTime)
            this.rotationTime += rotationSpeed
            const t = this.rotationTime
            this.slicedGeometryMesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotationSpeed)
            this.connector.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotationSpeed)

            const circleLength = Math.sqrt(this.position.x ** 2 + this.position.z ** 2)
            this.slicedGeometryMesh.position.set(
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
            const boxMin = new THREE.Vector3(-this.bounds.x/2, 0, -this.bounds.z/2);
            const boxMax = new THREE.Vector3(this.bounds.x/2, this.bounds.y, this.bounds.z/2);
            const insideColor = new THREE.Color(0x00ff00); // Color for inside the box
            const outsideColor = new THREE.Color(0xff0000); // Color for outside the box
         
            material.onBeforeCompile = function (shader) {
                shader.uniforms.boxMin = { value: boxMin };
                shader.uniforms.boxMax = { value: boxMax };
                shader.uniforms.insideColor = { value: insideColor };
                shader.uniforms.outsideColor = { value: outsideColor };
            
                shader.vertexShader = `
                    varying vec3 vWorldPosition;
                    ${shader.vertexShader}
                `.replace(
                    `#include <worldpos_vertex>`,
                    `
                        #include <worldpos_vertex>
                        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    `
                );
            
                shader.fragmentShader = `
                    uniform vec3 boxMin;
                    uniform vec3 boxMax;
                    uniform vec3 insideColor;
                    uniform vec3 outsideColor;
                    varying vec3 vWorldPosition;
                    ${shader.fragmentShader}
                `.replace(
                    `#include <dithering_fragment>`,
                    `
                        vec3 color = outsideColor;
                        if (vWorldPosition.x > boxMin.x && vWorldPosition.x < boxMax.x &&
                            vWorldPosition.y > boxMin.y && vWorldPosition.y < boxMax.y &&
                            vWorldPosition.z > boxMin.z && vWorldPosition.z < boxMax.z) {
                            color = insideColor;
                        }
            
                        // Combine the color with the default lighting and shadows
                        vec3 finalColor = color * (gl_FragColor.rgb / gl_FragColor.a);
                        gl_FragColor = vec4(finalColor, 1.0);
            
                        #include <dithering_fragment>
                    `
                );
            };
            
            // transparent material
            const transpartenMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.4 });
            this.currentGeometryMesh = new THREE.Mesh(geometry, transpartenMaterial);
            
            this.currentGeometryMesh.scale.setScalar(this.scale);
            this.currentGeometryMesh.rotateX(-Math.PI / 2);
            this.currentGeometryMesh.rotateX(this.rotation.x / 180 * Math.PI);
            this.currentGeometryMesh.rotateY(this.rotation.y / 180 * Math.PI);
            this.currentGeometryMesh.rotateZ(this.rotation.z / 180 * Math.PI);
            this.currentGeometryMesh.position.set(this.position.x, this.position.y + (this.bounds.y / 2), this.position.z);

            this.TransformControls.attach(this.currentGeometryMesh)

            // Add the mesh to the scene
            this.scene.add(this.currentGeometryMesh);

            if (this.slicedGeometryMesh) {
                this.slicedGeometryMesh.rotation.x = this.currentGeometryMesh.rotation.x
                this.slicedGeometryMesh.rotation.y = this.currentGeometryMesh.rotation.y
                this.slicedGeometryMesh.rotation.z = this.currentGeometryMesh.rotation.z
                
                this.slicedGeometryMesh.position.x = this.currentGeometryMesh.position.x
                this.slicedGeometryMesh.position.y = this.currentGeometryMesh.position.y
                this.slicedGeometryMesh.position.z = this.currentGeometryMesh.position.z
                
                this.scene.add(this.slicedGeometryMesh)
            }
            
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

    async createSlicedMesh () {
        this.slicedGeometryMesh = this.currentGeometryMesh.clone()
        // Create a material and mesh
        const material = new THREE.MeshStandardMaterial({ color: 0xFF6347 });
                    
        // Define the box bounds in world space
        const boxMin = new THREE.Vector3(-this.bounds.x/2, 0, -this.bounds.z/2);
        const boxMax = new THREE.Vector3(this.bounds.x/2, this.bounds.y, this.bounds.z/2);
        const insideColor = new THREE.Color(0x00ff00); // Color for inside the box
        const outsideColor = new THREE.Color(0xff0000); // Color for outside the box

        material.onBeforeCompile = function (shader) {
            shader.uniforms.boxMin = { value: boxMin };
            shader.uniforms.boxMax = { value: boxMax };
            shader.uniforms.insideColor = { value: insideColor };
            shader.uniforms.outsideColor = { value: outsideColor };

            shader.vertexShader = `
                varying vec3 vWorldPosition;
                ${shader.vertexShader}
            `.replace(
                `#include <worldpos_vertex>`,
                `
                    #include <worldpos_vertex>
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                `
            );

            shader.fragmentShader = `
                uniform vec3 boxMin;
                uniform vec3 boxMax;
                uniform vec3 insideColor;
                uniform vec3 outsideColor;
                varying vec3 vWorldPosition;
                ${shader.fragmentShader}
            `.replace(
                `#include <dithering_fragment>`,
                `
                    vec3 color = outsideColor;
                    if (vWorldPosition.x > boxMin.x && vWorldPosition.x < boxMax.x &&
                        vWorldPosition.y > boxMin.y && vWorldPosition.y < boxMax.y &&
                        vWorldPosition.z > boxMin.z && vWorldPosition.z < boxMax.z) {
                        color = insideColor;
                    }

                    // Combine the color with the default lighting and shadows
                    vec3 finalColor = color * (gl_FragColor.rgb / gl_FragColor.a);
                    gl_FragColor = vec4(finalColor, 1.0);

                    #include <dithering_fragment>
                `
            );
        };

        this.slicedGeometryMesh.material = material

        this.slicedGeometryMesh.geometry = ensureIndexed(this.slicedGeometryMesh.geometry);
        
        const slicedMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true });
        // const mesh = new THREE.Mesh(geometry, slicedMaterial);
        this.slicedGeometryMesh.material = slicedMaterial;
        const referencePoint = new THREE.Vector3(0, 1, 0); // Reference point on the sphere
        colorMeshByDistance(this.slicedGeometryMesh, referencePoint);

        this.scene.add(this.slicedGeometryMesh);
    }

    addSlicedGeometry(geometry) {
        this.slicedGeometryMesh = this.currentGeometryMesh.clone()
        const slicedMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true });
        this.slicedGeometryMesh.material = slicedMaterial;
        this.slicedGeometryMesh.geometry = geometry;
        this.reloadScene()
    }

    switchCamera() {
        if (this.camera === this.PerspectiveCamera) {
            this.camera = this.OrthographicCamera
        } else {
            this.camera = this.PerspectiveCamera
        }
        this.TransformControls.camera = this.camera
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