import * as THREE from 'three';

function ensureIndexed(geometry) {
    if (!geometry.index) {
        console.warn("Geometry is not indexed. Converting to indexed geometry.");
        geometry = BufferGeometryUtils.mergeVertices(geometry);
    }
    return geometry;
}

export function subdivideLongEdges(geometry, maxEdgeLength) {
    const newVertices = [];
    const newFaces = [];
    const vertices = geometry.attributes.position.array;
    const faces = geometry.index.array;

    function getVertex(index) {
        return new THREE.Vector3(
            vertices[index * 3],
            vertices[index * 3 + 1],
            vertices[index * 3 + 2]
        );
    }

    function getVertexFromAll(index) {
        let positionArray = new Float32Array((geometry.attributes.position.array.length)+(newVertices.length * 3));

        for (let i = 0; i < geometry.attributes.position.array.length; i++) {
            positionArray[i] = geometry.attributes.position.array[i];
        }

        const startIndex = geometry.attributes.position.array.length;
        for (let i = 0; i < newVertices.length; i++) {
            positionArray[startIndex + i * 3] = newVertices[i].x;
            positionArray[startIndex + i * 3 + 1] = newVertices[i].y;
            positionArray[startIndex + i * 3 + 2] = newVertices[i].z;
        }

        return new THREE.Vector3(
            positionArray[index * 3],
            positionArray[index * 3 + 1],
            positionArray[index * 3 + 2]
        );
    }

    const midpointCache = new Map();

    function getOrCreateMidpoint(v1Index, v2Index) {
        const key = v1Index < v2Index ? `${v1Index}-${v2Index}` : `${v2Index}-${v1Index}`;
        if (!midpointCache.has(key)) {
            const v1 = getVertexFromAll(v1Index);
            const v2 = getVertexFromAll(v2Index);
            const midpoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
            midpointCache.set(key, (vertices.length/3) + newVertices.length);
            newVertices.push(midpoint);
        }
        return midpointCache.get(key);
    }

    // slecht algoritme, miss later nog een keer naar kijken
    let index = 0;
    let cycle = 0;
    const startTimestamp = Date.now();

    for (let i = 0; i < faces.length; i += 3) {
        newFaces.push([faces[i], faces[i + 1], faces[i + 2]]);
    }
    while (true) {
        console.log("cycleStartTimestamp", Date.now() - startTimestamp);
        console.log("index", index);
        // for (let i = 0; i < newFaces.length; i++) {
        //     console.log(i, newFaces[i]);
        // }
        console.log(1, Date.now() - startTimestamp);

        if (index >= newFaces.length) {
            break;
        }

        if (cycle > 100) {
            console.log("Max cycles reached");
            break;
        }
        console.log(2, Date.now() - startTimestamp);
        
        const face = newFaces[index];
        const vertexIndices = face;

        const vertexPositions = vertexIndices.map(index => getVertexFromAll(index, ));
        console.log(3, Date.now() - startTimestamp);

        const edges = [
            { start: vertexPositions[0], startIndex: vertexIndices[0], end: vertexPositions[1], endIndex: vertexIndices[1], excudedPoint: vertexIndices[2] },
            { start: vertexPositions[1], startIndex: vertexIndices[1], end: vertexPositions[2], endIndex: vertexIndices[2], excudedPoint: vertexIndices[0] },
            { start: vertexPositions[2], startIndex: vertexIndices[2], end: vertexPositions[0], endIndex: vertexIndices[0], excudedPoint: vertexIndices[1] },
        ];
        console.log(4, Date.now() - startTimestamp);

        const edgeLengths = edges.map(edge =>
            edge.start.distanceTo(edge.end)
        );

        const longEdges = edgeLengths.filter(len => len > maxEdgeLength);
        console.log(5, Date.now() - startTimestamp);

        if (longEdges.length === 0) {
            //newFaces.push([face[0], face[1], face[2]]);
            index++;
        } else {
            const longestEdge = edgeLengths.indexOf(Math.max(...longEdges));
            console.log(6, Date.now() - startTimestamp);

            const midIndex = getOrCreateMidpoint(edges[longestEdge].startIndex, edges[longestEdge].endIndex);
            console.log(7, Date.now() - startTimestamp);

            newFaces.push([edges[longestEdge].startIndex, midIndex, edges[longestEdge].excudedPoint]);
            newFaces.push([midIndex, edges[longestEdge].endIndex, edges[longestEdge].excudedPoint]);
            console.log(8, Date.now() - startTimestamp);

            // // Subdivide edges and create new faces
            // const midIndices = edges.map(edge => {
            //     if (edge.start.distanceTo(edge.end) > maxEdgeLength) {
            //         return getOrCreateMidpoint(edge.startIndex, edge.endIndex);
            //     }
            //     return null;
            // });

            // todo: Ik kan nog dit doen en dan aan het einde alle driehoeken door midden delen, miss dat dat goed werkt
            // // Logic to create new faces based on which edges are subdivided
            // if (midIndices[0] && midIndices[1] && midIndices[2]) {
            //     // All edges are subdivided: create 4 smaller triangles
            //     newFaces.push([face[0], midIndices[0], midIndices[2]]);
            //     newFaces.push([midIndices[0], face[1], midIndices[1]]);
            //     newFaces.push([midIndices[1], face[2], midIndices[2]]);
            //     newFaces.push([midIndices[0], midIndices[1], midIndices[2]]);
            //     console.log("all edges subdivided");
            // } else if (midIndices[0] && midIndices[1]) {
            //     // Two edges subdivided: create 3 smaller triangles
            //     newFaces.push([face[0], midIndices[0], midIndices[1]]);
            //     newFaces.push([midIndices[0], face[1], face[2]]);
            //     newFaces.push([midIndices[1], face[2], face[0]]);
            //     console.log("two edges subdivided");
            // } else if (midIndices[0]) {
            //     // One edge subdivided: create 2 smaller triangles
            //     newFaces.push([face[0], midIndices[0], face[2]]);
            //     newFaces.push([midIndices[0], face[1], face[2]]);
            //     console.log("one edge subdivided");
            // } else {
            //     // No edges subdivided, just add the original face
            //     newFaces.push([face[0], face[1], face[2]]);
            //     console.log("no edges subdivided");
            // }

            // remove the original face
            newFaces.splice(index, 1);
            console.log(9, Date.now() - startTimestamp);
            
            cycle++;
            index = 0;
        }
    }

    // Update the geometry with new vertices and faces
    let positionArray = new Float32Array((geometry.attributes.position.array.length)+(newVertices.length * 3));

    for (let i = 0; i < geometry.attributes.position.array.length; i++) {
        positionArray[i] = geometry.attributes.position.array[i];
    }

    const startIndex = geometry.attributes.position.array.length;
    for (let i = 0; i < newVertices.length; i++) {
        positionArray[startIndex + i * 3] = newVertices[i].x;
        positionArray[startIndex + i * 3 + 1] = newVertices[i].y;
        positionArray[startIndex + i * 3 + 2] = newVertices[i].z;
    }

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

    console.log(newFaces);
    
    newGeometry.setIndex(newFaces.flat());//new THREE.BufferAttribute(indices2, 3)
    newGeometry.computeVertexNormals();

    return newGeometry;
}

// Create the scene
const scene = new THREE.Scene();

// Create a camera, which determines what we'll see when we render the scene
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 1;
camera.position.y = 0.5;
camera.position.x = 0.5;

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
//geometry = new THREE.BoxGeometry(1, 1, 1); // Create a cube
// create triangle geometry
geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
    1, 1, 0,
]);

const indices = [
    0, 2, 1, // First triangle (top-left, bottom-left, top-right)
    1, 2, 3, // Second triangle (top-right, bottom-left, bottom-right)
  ];
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
geometry.setIndex(indices);//new THREE.BufferAttribute(indices, 1));

// geometry = new THREE.TorusGeometry(1, 0.4, 16, 100); // Create a torus
// geometry = new THREE.CylinderGeometry(1, 1, 2, 32); // Create a cylinder
// geometry = geometry.toNonIndexed(); // Ensure the geometry is non-indexed for simplicity

console.log(geometry);

geometry = subdivideLongEdges(geometry, 0.4);
// geometry = subdivideLongEdges(geometry, 0.1);
// geometry = subdivideLongEdges(geometry, 0.1);
// geometry = subdivideLongEdges(geometry, 0.1);

// Remove first 3 elements from index array
// geometry.index.array = geometry.index.array.slice(6);

console.log(geometry);

const material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const mesh = new THREE.Mesh(geometry, material);

const wireframeMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
wireframeMesh.position.z = 0.01; // Slightly offset to prevent z-fighting
const referencePoint = new THREE.Vector3(0, 1, 0); // Reference point on the sphere

geometry = ensureIndexed(geometry);
//mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
//colorMeshByDistance(mesh, referencePoint);
scene.add(mesh); // Add to your THREE.js scene
scene.add(wireframeMesh);

// Create an animation loop
function animate() {
    requestAnimationFrame(animate);

    // Rotate the cube for some basic animation
    // mesh.rotation.x += 0.01;
    // mesh.rotation.y += 0.01;

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