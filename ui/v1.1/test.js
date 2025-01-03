import * as THREE from 'three';

// Create the scene
const scene = new THREE.Scene();

// Create a camera, which determines what we'll see when we render the scene
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Create a renderer and add it to the DOM
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const lighting = new THREE.AmbientLight(0xffffff);
scene.add(lighting);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


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
        console.log(i);
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
    console.log(closestIndex);

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

// Example usage
var geometry = new THREE.SphereGeometry(1, 32, 32); // Create a sphere
geometry = new THREE.BoxGeometry(1, 1, 1); // Create a cube
// geometry = new THREE.TorusGeometry(1, 0.4, 16, 100); // Create a torus
// geometry = new THREE.CylinderGeometry(1, 1, 2, 32); // Create a cylinder
// geometry = geometry.toNonIndexed(); // Ensure the geometry is non-indexed for simplicity

console.log(geometry);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true });
const mesh = new THREE.Mesh(geometry, material);
const referencePoint = new THREE.Vector3(0, 1, 0); // Reference point on the sphere

colorMeshByDistance(mesh, referencePoint);
scene.add(mesh); // Add to your THREE.js scene

// Create an animation loop
function animate() {
    requestAnimationFrame(animate);

    // Rotate the cube for some basic animation
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;

    // Render the scene from the perspective of the camera
    renderer.render(scene, camera);
}

renderer.render(scene, camera);

// main.js
const worker = new Worker('worker.js');

// Send data to the worker
worker.postMessage({ operation: 'calculate', data: 1000000 });

// Listen for messages from the worker
worker.onmessage = (event) => {
  console.log('Result from worker:', event.data);
};

// Handle errors
worker.onerror = (error) => {
  console.error('Worker error:', error);
};


// Start the animation loop
animate();