import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

export function getOuterPoint(geometry) {
    // gets the point where the x and z values are the greatest
    let maxDistance = 0
    let farthestPoint = null
    console.log(geometry)

    const positionAttribute = geometry.attributes.position;

    // Loop through all vertices
    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const z = positionAttribute.getZ(i);

        // Calculate distance from the line f(x, z) = 0
        const distance = Math.sqrt(x * x + z * z);

        // Check if it's the farthest distance
        if (distance > maxDistance) {
            maxDistance = distance;
            farthestPoint = { x, z };
        }
    }

    return { farthestPoint, maxDistance };
}

export function ensureIndexed(geometry) {
    if (!geometry.index) {
        console.warn("Geometry is not indexed. Converting to indexed geometry.");
        geometry = BufferGeometryUtils.mergeVertices(geometry);
    }
    return geometry;
}

export function calculateGeodesicDistances(geometry, startIndex) {
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

export function colorByDistance(geometry, referencePoint) {
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
        const t1 = Math.max(0, (1-Math.abs(-4*t)));
        const t2 = Math.max(0, (1-Math.abs(-4*t+2)));
        const t3 = Math.max(0, (1-Math.abs(-4*t+4)));

        colors.push(t1, t2, t3); // Map to a blue-red gradient
    }

    // Apply vertex colors
    const colorAttr = new THREE.Float32BufferAttribute(colors, 3);
    geometry.setAttribute('color', colorAttr);
}

// export function subdivideLongEdges(geometry, maxEdgeLength) {
//     const newVertices = [];
//     const newFaces = [];
//     const vertices = geometry.attributes.position.array;
//     const faces = geometry.index.array;

//     function getVertex(index) {
//         return new THREE.Vector3(
//             vertices[index * 3],
//             vertices[index * 3 + 1],
//             vertices[index * 3 + 2]
//         );
//     }

//     const midpointCache = new Map();

//     function getOrCreateMidpoint(v1Index, v2Index) {
//         const key = v1Index < v2Index ? `${v1Index}-${v2Index}` : `${v2Index}-${v1Index}`;
//         if (!midpointCache.has(key)) {
//             const v1 = getVertex(v1Index);
//             const v2 = getVertex(v2Index);
//             const midpoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
//             midpointCache.set(key, (vertices.length/3) + newVertices.length);
//             newVertices.push(midpoint);
//         }
//         return midpointCache.get(key);
//     }

//     // slecht algoritme, miss later nog een keer naar kijken
//     let index = 0;
//     let cycle = 0;

//     for (let i = 0; i < faces.length; i += 3) {
//         newFaces.push([faces[i], faces[i + 1], faces[i + 2]]);
//     }

//     while (true) {
//         if (index >= newFaces.length) {
//             break;
//         }

//         if (cycle > 0) {
//             break;
//         }
        
//         const face = newFaces[index];
//         const vertexIndices = face;

//         const vertexPositions = vertexIndices.map(index => getVertex(index));

//         const edges = [
//             { start: vertexPositions[0], startIndex: vertexIndices[0], end: vertexPositions[1], endIndex: vertexIndices[1], excudedPoint: vertexIndices[2] },
//             { start: vertexPositions[1], startIndex: vertexIndices[1], end: vertexPositions[2], endIndex: vertexIndices[2], excudedPoint: vertexIndices[0] },
//             { start: vertexPositions[2], startIndex: vertexIndices[2], end: vertexPositions[0], endIndex: vertexIndices[0], excudedPoint: vertexIndices[1] },
//         ];

//         const edgeLengths = edges.map(edge =>
//             edge.start.distanceTo(edge.end)
//         );

//         const longEdges = edgeLengths.filter(len => len > maxEdgeLength);
        
//         if (longEdges.length === 0) {
//             index++;
//             continue;
//         }else {
//             // Subdivide edges and create new faces

//             const midIndices = edges.map(edge => {
//                 return getOrCreateMidpoint(edge.startIndex, edge.endIndex);
//             });

//             // subdivide the longest edge
//             const longestEdgeIndex = edgeLengths.indexOf(Math.max(...edgeLengths));
//             newFaces.push([
//                 edges[longestEdgeIndex].startIndex,
//                 midIndices[longestEdgeIndex],
//                 edges[longestEdgeIndex].excudedPoint
//             ]);
//             newFaces.push([
//                 edges[longestEdgeIndex].endIndex,
//                 midIndices[longestEdgeIndex],
//                 edges[longestEdgeIndex].excudedPoint
//             ]);

//             newFaces.splice(index, 1);

//             console.log("Edge", edges[longestEdgeIndex], " was subdivided");

//             index = 0;
//             cycle++;

//         }

//     }

//     // for (let i = 0; i < faces.length; i += 3) {
//     //     const v1Index = faces[i];
//     //     const v2Index = faces[i + 1];
//     //     const v3Index = faces[i + 2];

//     //     const v1 = getVertex(v1Index);
//     //     const v2 = getVertex(v2Index);
//     //     const v3 = getVertex(v3Index);

//     //     const edges = [
//     //         { start: v1, startIndex: v1Index, end: v2, endIndex: v2Index },
//     //         { start: v2, startIndex: v2Index, end: v3, endIndex: v3Index },
//     //         { start: v3, startIndex: v3Index, end: v1, endIndex: v1Index },
//     //     ];

//     //     const edgeLengths = edges.map(edge =>
//     //         edge.start.distanceTo(edge.end)
//     //     );
//     //     console.log("edgeLengths", edgeLengths);

//     //     const longEdges = edgeLengths.filter(len => len > maxEdgeLength);
//     //     console.log("longEdges", longEdges);
//     //     if (longEdges.length === 0) {
//     //         newFaces.push([v1Index, v2Index, v3Index]);
//     //     } else {
//     //         // Subdivide edges and create new faces
//     //         const midIndices = edges.map(edge => {
//     //             if (edge.start.distanceTo(edge.end) > maxEdgeLength) {
//     //                 return getOrCreateMidpoint(edge.startIndex, edge.endIndex);
//     //             }
//     //             return null;
//     //         });

//     //         console.log("Midpoints:", midIndices);

//     //         // Logic to create new faces based on which edges are subdivided
//     //         if (midIndices[0] && midIndices[1] && midIndices[2]) {
//     //             // All edges are subdivided: create 4 smaller triangles
//     //             newFaces.push([v1Index, midIndices[0], midIndices[2]]);
//     //             newFaces.push([midIndices[0], v2Index, midIndices[1]]);
//     //             newFaces.push([midIndices[1], v3Index, midIndices[2]]);
//     //             newFaces.push([midIndices[0], midIndices[1], midIndices[2]]);
//     //         } else if (midIndices[0] && midIndices[1]) {
//     //             // Two edges subdivided: create 3 smaller triangles
//     //             newFaces.push([v1Index, midIndices[0], midIndices[1]]);
//     //             newFaces.push([midIndices[0], v2Index, v3Index]);
//     //             newFaces.push([midIndices[1], v3Index, v1Index]);
//     //         } else if (midIndices[0]) {
//     //             // One edge subdivided: create 2 smaller triangles
//     //             newFaces.push([v1Index, midIndices[0], v3Index]);
//     //             newFaces.push([midIndices[0], v2Index, v3Index]);
//     //         } else {
//     //             // No edges subdivided, just add the original face
//     //             newFaces.push([v1Index, v2Index, v3Index]);
//     //         }
//     //     }
//     // }

//     // Update the geometry with new vertices and faces
//     let positionArray = new Float32Array((geometry.attributes.position.array.length)+(newVertices.length * 3));

//     for (let i = 0; i < geometry.attributes.position.array.length; i++) {
//         positionArray[i] = geometry.attributes.position.array[i];
//     }

//     const startIndex = geometry.attributes.position.array.length;
//     for (let i = 0; i < newVertices.length; i++) {
//         positionArray[startIndex + i * 3] = newVertices[i].x;
//         positionArray[startIndex + i * 3 + 1] = newVertices[i].y;
//         positionArray[startIndex + i * 3 + 2] = newVertices[i].z;
//     }

//     console.log("newVertices", newVertices);
//     console.log("positionArray", positionArray);
    

//     const newGeometry = new THREE.BufferGeometry();
//     newGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
//     newGeometry.setIndex(newFaces.flat());
//     newGeometry.computeVertexNormals();

//     return newGeometry;
// }

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

    for (let i = 0; i < faces.length; i += 3) {
        newFaces.push([faces[i], faces[i + 1], faces[i + 2]]);
    }
    while (true) {
        if (index >= newFaces.length) {
            break;
        }

        if (cycle > 10000) {
            console.log("Max cycles reached");
            break;
        }
        
        const face = newFaces[index];
        const vertexIndices = face;

        const vertexPositions = vertexIndices.map(index => getVertexFromAll(index, ));

        const edges = [
            { start: vertexPositions[0], startIndex: vertexIndices[0], end: vertexPositions[1], endIndex: vertexIndices[1], excudedPoint: vertexIndices[2] },
            { start: vertexPositions[1], startIndex: vertexIndices[1], end: vertexPositions[2], endIndex: vertexIndices[2], excudedPoint: vertexIndices[0] },
            { start: vertexPositions[2], startIndex: vertexIndices[2], end: vertexPositions[0], endIndex: vertexIndices[0], excudedPoint: vertexIndices[1] },
        ];

        const edgeLengths = edges.map(edge =>
            edge.start.distanceTo(edge.end)
        );


        const longEdges = edgeLengths.filter(len => len > maxEdgeLength);
        if (longEdges.length === 0) {
            //newFaces.push([face[0], face[1], face[2]]);
            index++;
        } else {
            // Subdivide edges and create new faces
            const midIndices = edges.map(edge => {
                if (edge.start.distanceTo(edge.end) > maxEdgeLength) {
                    return getOrCreateMidpoint(edge.startIndex, edge.endIndex);
                }
                return null;
            });


            // Logic to create new faces based on which edges are subdivided
            if (midIndices[0] && midIndices[1] && midIndices[2]) {
                // All edges are subdivided: create 4 smaller triangles
                newFaces.push([face[0], midIndices[0], midIndices[2]]);
                newFaces.push([midIndices[0], face[1], midIndices[1]]);
                newFaces.push([midIndices[1], face[2], midIndices[2]]);
                newFaces.push([midIndices[0], midIndices[1], midIndices[2]]);
                console.log("all edges subdivided");
            } else if (midIndices[0] && midIndices[1]) {
                // Two edges subdivided: create 3 smaller triangles
                newFaces.push([face[0], midIndices[0], midIndices[1]]);
                newFaces.push([midIndices[0], face[1], face[2]]);
                newFaces.push([midIndices[1], face[2], face[0]]);
                console.log("two edges subdivided");
            } else if (midIndices[0]) {
                // One edge subdivided: create 2 smaller triangles
                newFaces.push([face[0], midIndices[0], face[2]]);
                newFaces.push([midIndices[0], face[1], face[2]]);
                console.log("one edge subdivided");
            } else {
                // No edges subdivided, just add the original face
                newFaces.push([face[0], face[1], face[2]]);
                console.log("no edges subdivided");
            }

            // remove the original face
            newFaces.splice(index, 1);
            index = 0;
            
            cycle++;
        }
    }



    // for (let i = 0; i < faces.length; i += 3) {
    //     const v1Index = faces[i];
    //     const v2Index = faces[i + 1];
    //     const v3Index = faces[i + 2];

    //     const v1 = getVertex(v1Index);
    //     const v2 = getVertex(v2Index);
    //     const v3 = getVertex(v3Index);

    //     const edges = [
    //         { start: v1, startIndex: v1Index, end: v2, endIndex: v2Index },
    //         { start: v2, startIndex: v2Index, end: v3, endIndex: v3Index },
    //         { start: v3, startIndex: v3Index, end: v1, endIndex: v1Index },
    //     ];

    //     const edgeLengths = edges.map(edge =>
    //         edge.start.distanceTo(edge.end)
    //     );
    //     console.log("edgeLengths", edgeLengths);

    //     const longEdges = edgeLengths.filter(len => len > maxEdgeLength);
    //     console.log("longEdges", longEdges);
    //     if (longEdges.length === 0) {
    //         newFaces.push([v1Index, v2Index, v3Index]);
    //     } else {
    //         // Subdivide edges and create new faces
    //         const midIndices = edges.map(edge => {
    //             if (edge.start.distanceTo(edge.end) > maxEdgeLength) {
    //                 return getOrCreateMidpoint(edge.startIndex, edge.endIndex);
    //             }
    //             return null;
    //         });

    //         console.log("Midpoints:", midIndices);

    //         // Logic to create new faces based on which edges are subdivided
    //         if (midIndices[0] && midIndices[1] && midIndices[2]) {
    //             // All edges are subdivided: create 4 smaller triangles
    //             newFaces.push([v1Index, midIndices[0], midIndices[2]]);
    //             newFaces.push([midIndices[0], v2Index, midIndices[1]]);
    //             newFaces.push([midIndices[1], v3Index, midIndices[2]]);
    //             newFaces.push([midIndices[0], midIndices[1], midIndices[2]]);
    //         } else if (midIndices[0] && midIndices[1]) {
    //             // Two edges subdivided: create 3 smaller triangles
    //             newFaces.push([v1Index, midIndices[0], midIndices[1]]);
    //             newFaces.push([midIndices[0], v2Index, v3Index]);
    //             newFaces.push([midIndices[1], v3Index, v1Index]);
    //         } else if (midIndices[0]) {
    //             // One edge subdivided: create 2 smaller triangles
    //             newFaces.push([v1Index, midIndices[0], v3Index]);
    //             newFaces.push([midIndices[0], v2Index, v3Index]);
    //         } else {
    //             // No edges subdivided, just add the original face
    //             newFaces.push([v1Index, v2Index, v3Index]);
    //         }

    //         // remove the original face
    //      // newFaces.splice(newFaces.indexOf([v1Index, v2Index, v3Index], 1));
    //     }
    // }

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
