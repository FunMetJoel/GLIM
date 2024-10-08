function calculateSurfaceArea() {
    const fileInput = document.getElementById('stlFile');
    const resultElement = document.getElementById('result');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an STL file first.");
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

        resultElement.textContent = `Total Surface Area: ${totalArea.toFixed(4)} square units`;
    };

    reader.readAsArrayBuffer(file);
}

function calculateTriangleArea(a, b, c) {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const cross = new THREE.Vector3().crossVectors(ab, ac);
    return cross.length() / 2;
}
