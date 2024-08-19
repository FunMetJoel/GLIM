var StlFileInput;
var StlGeometry;

window.onload = function() {
    StlFileInput = document.getElementById('stlFile');
}






function calculateSurfaceArea() {
    const resultElement = document.getElementById('resultSurface');
    const file = StlFileInput.files[0];

    if (!file) {
        alert("Selecteer eerst een STL bestand");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        const loader = new THREE.STLLoader();
        const geometry = loader.parse(arrayBuffer);

        // Extract vertex positions from geometry
        const position = geometry.attributes.position.array;

        let totalArea = 0;

        // Loop over each triangle (3 vertices at a time)
        for (let i = 0; i < position.length; i += 9){
            const a = new THREE.Vector3(position[i], position[i+1], position[i+2]);
            const b = new THREE.Vector3(position[i+3], position[i+4], position[i+5]);
            const c = new THREE.Vector3(position[i+6], position[i+7], position[i+8]);

            totalArea += calculateTriangleArea(a, b, c);
        }

        resultElement.textContent = `Total Surface Area: ${totalArea.toFixed(3)} square units`;
    };

    reader.readAsArrayBuffer(file);

    calculateDimentions()
}

function calculateDimentions() {
    const resultElement = document.getElementById('resultBounds');
    const file = StlFileInput.files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        const loader = new THREE.STLLoader();
        const geometry = loader.parse(arrayBuffer);

        geometry.computeBoundingBox();
        const boundingbox = geometry.boundingBox;

        const width = boundingbox.max.x - boundingbox.min.x
        const height = boundingbox.max.y - boundingbox.min.y
        const depth = boundingbox.max.z - boundingbox.min.z

        resultElement.textContent = `X:${width.toFixed(3)}, Y:${height.toFixed(3)}, Z:${depth.toFixed(3)}`

    }
    reader.readAsArrayBuffer(file);

}

function updateRecomendation() {
    const currentSpan = document.getElementById('current')
}

function calculateTriangleArea(a, b, c) {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const cross = new THREE.Vector3().crossVectors(ab, ac);
    return cross.length() / 2;
}
