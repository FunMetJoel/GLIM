import * as THREE from 'three'

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

