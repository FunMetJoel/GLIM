var StlFileInput;
var StlGeometry;

window.onload = function() {
    StlFileInput = document.getElementById('stlFile');
}

function loadStlFile() {
    const file = StlFileInput.files[0];

    if (!file) {
        alert("Selecteer een STL bestand");
        return;
    }

    getStlGeometry(file, callback = function() {
        calculateSurfaceArea();
        calculateDimentions();
    });
}

function getStlGeometry(file, callback) {
    const reader = new FileReader();

    reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        const loader = new THREE.STLLoader();
        StlGeometry = loader.parse(arrayBuffer);

        callback()
    };

    reader.readAsArrayBuffer(file);
}

function calculateSurfaceArea() {
    const resultElement = document.getElementById('resultSurface');
    
    // Extract vertex positions from geometry
    const position = StlGeometry.attributes.position.array;

    let totalArea = 0;

    // Loop over each triangle (3 vertices at a time)
    for (let i = 0; i < position.length; i += 9){
        const a = new THREE.Vector3(position[i], position[i+1], position[i+2]);
        const b = new THREE.Vector3(position[i+3], position[i+4], position[i+5]);
        const c = new THREE.Vector3(position[i+6], position[i+7], position[i+8]);

        totalArea += calculateTriangleArea(a, b, c);
    }

    resultElement.textContent = `Total Surface Area: ${totalArea.toFixed(3)} square units`;
}

function calculateDimentions() {
    const resultElement = document.getElementById('resultBounds');

    StlGeometry.computeBoundingBox();
    const boundingbox = StlGeometry.boundingBox;

    const width = boundingbox.max.x - boundingbox.min.x
    const height = boundingbox.max.y - boundingbox.min.y
    const depth = boundingbox.max.z - boundingbox.min.z

    resultElement.textContent = `X:${width.toFixed(3)}, Y:${height.toFixed(3)}, Z:${depth.toFixed(3)}`
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
