using namespace std;

#include <iostream>
#include <string>
#include <vector>
#include <tinyply.h>

using namespace tinyply;

struct Vertex {
    float x, y, z;
};

struct Triangle {
    Vertex v0, v1, v2;
};

int main(int argc, char* argv[]) {
    if (argc != 2) {
        cerr << "Usage: " << argv[0] << " <input.stl>" << endl;
        return 1;
    }

    string filename = argv[1];
    try {
        ifstream file(filename, ios::binary);
        if (file.fail()) {
            cerr << "Failed to open file: " << filename << endl;
            return 1;
        }

        PlyFile plyFile;
        plyFile.parse_header(file);

        auto vertices = plyFile.request_properties_from_element("vertex", { "x", "y", "z" });
        plyFile.read(file);

        vector<Triangle> triangles;
        for (size_t i = 0; i < vertices.count; i += 3) {
            Triangle triangle;
            triangle.v0.x = vertices.buffer.get()[i * 3];
            triangle.v0.y = vertices.buffer.get()[i * 3 + 1];
            triangle.v0.z = vertices.buffer.get()[i * 3 + 2];
            triangle.v1.x = vertices.buffer.get()[(i + 1) * 3];
            triangle.v1.y = vertices.buffer.get()[(i + 1) * 3 + 1];
            triangle.v1.z = vertices.buffer.get()[(i + 1) * 3 + 2];
            triangle.v2.x = vertices.buffer.get()[(i + 2) * 3];
            triangle.v2.y = vertices.buffer.get()[(i + 2) * 3 + 1];
            triangle.v2.z = vertices.buffer.get()[(i + 2) * 3 + 2];
            triangles.push_back(triangle);
        }

        double totalArea = 0.0;
        for (const auto& triangle : triangles) {
            // Compute the area of the triangle using cross product
            double ax = triangle.v1.x - triangle.v0.x;
            double ay = triangle.v1.y - triangle.v0.y;
            double az = triangle.v1.z - triangle.v0.z;
            double bx = triangle.v2.x - triangle.v0.x;
            double by = triangle.v2.y - triangle.v0.y;
            double bz = triangle.v2.z - triangle.v0.z;
            double area = 0.5 * sqrt(pow(ay * bz - az * by, 2) + pow(az * bx - ax * bz, 2) + pow(ax * by - ay * bx, 2));
            totalArea += area;
        }

        cout << "Surface area of the mesh: " << totalArea << " square units." << endl;
    } catch (const std::exception& e) {
        cerr << "Error: " << e.what() << endl;
        return 1;
    }

    return 0;
}