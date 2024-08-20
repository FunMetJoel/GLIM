class curveGraph {
    constructor(canvas){
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.points = [{x:0.25,y:0.35}];
        this.dragPointIndex = -1;

        this.redraw();
        
        canvas.onmousedown = function(e){
            this.onMouseDown(this, e);
        };

    }

    getCursorPos(event) {
        var rect = this.canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        return {x:X, y:y};
    }

    onMouseDown(curvegraph, e) {
        curvegraph.redraw()
        var pos = curvegraph.getCursorPos(e);
        dragPointIndex = curvegraph.getPointAt(pos)
        if (dragPointIndex == -1) {
            curvegraph.points.push(curvegraph.calculatePointFromCanvasPoint(pos));
            dragPointIndex = curvegraph.points.length - 1;
            redraw()
        }
    }

    redraw() {
        this.drawLine({x:0, y:this.points[0].y}, this.points[0])
        this.drawPoint(this.points[0])
        
        for (var i = 1; i < this.points.length; i++){
            this.drawPoint(this.points[i])
            this.drawLine(this.points[i-1], this.points[i])
        }

        this.drawLine({x:1, y:this.points[this.points.length -1].y}, this.points[this.points.length -1])
    }

    drawLine(point1, point2) {
        const p1 = this.calculateCanvasPoint(point1)
        const p2 = this.calculateCanvasPoint(point2)

        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
    }

    drawPoint(point) {
        const p = this.calculateCanvasPoint(point)
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2, true);
        this.ctx.fill()
        this.ctx.stroke();
    }

    calculateCanvasPoint(point) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        var X = point.x * width;
        var Y = height - point.y * height;
        return {x:X, y:Y};
    }

    calculatePointFromCanvasPoint(canvasPoint) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        var X = canvasPoint.x / width;
        var Y = 1 - (canvasPoint.y / height);
        return {x:X, y:Y};
    }

    

    getPointAt(canvasPoint) {
        p = this.calculatePointFromCanvasPoint(canvasPoint)
        for (var i = 0; i < this.points.length; i++) {
            if (
                Math.abs(this.points[i].x - p.x) < 2 &&
                Math.abs(this.points[i].y - p.y) < 2
            ){
                return i;
            }
        }
        return -1;
    }




}