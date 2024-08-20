class curveGraph {
    constructor(canvas){
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.points = [{x:0.25,y:0.35}];
        this.dragPointIndex = -1;

        this.redraw();
        
        canvas.onmousedown = this.onMouseDown.bind(this);
        canvas.onmousemove = this.onMouseMove.bind(this);
        canvas.onmouseup = this.onMouseUp.bind(this);

    }

    getCursorPos(event) {
        var rect = this.canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        return {x:x, y:y};
    }

    onMouseDown(e) {
        var pos = this.getCursorPos(e);
        this.dragPointIndex = this.getPointAt(pos)
        if (this.dragPointIndex == -1) {
            this.points.push(this.calculatePointFromCanvasPoint(pos));
            this.dragPointIndex = this.points.length - 1;
        }
        this.redraw()
        this.redraw()
    }

    onMouseMove(e) {
        if (this.dragPointIndex == -1){
            return;
        }
        var pos = this.getCursorPos(e)
        pos = this.calculatePointFromCanvasPoint(pos)
        this.points[this.dragPointIndex].x = pos.x;
        this.points[this.dragPointIndex].y = pos.y;
        this.redraw()
        this.redraw()
    }

    onMouseUp(e) {
        this.dragPointIndex = -1;
    }
    
    getSortedPoints() {
        return this.points.slice().sort((a,b) => a.x - b.x);
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // this.bzCurve()

        const sortedPoints = this.getSortedPoints()

        this.drawLine({x:0, y:sortedPoints[0].y}, sortedPoints[0])
        this.drawPoint(sortedPoints[0])
        
        for (var i = 1; i < sortedPoints.length; i++){
            this.drawPoint(sortedPoints[i])
            this.drawLine(sortedPoints[i-1], sortedPoints[i])
        }

        this.drawLine(sortedPoints[sortedPoints.length -1], {x:1, y:sortedPoints[sortedPoints.length -1].y})
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
        var p;
        for (var i = 0; i < this.points.length; i++) {
            p = this.calculateCanvasPoint(this.points[i])
            if (
                Math.abs(p.x - canvasPoint.x) < 4 &&
                Math.abs(p.y - canvasPoint.y) < 4
            ){
                return i;
            }
        }
        return -1;
    }

    gradient (a, b) {
        return (b.y-a.y)/(b.x-a.x)
    }

    bzCurve(f=0.3, t=0.6) {
        var canvaspoints = [];

        this.getSortedPoints().forEach(element => {
            canvaspoints.push(this.calculateCanvasPoint(element));
        });

        this.ctx.beginPath();
        this.ctx.moveTo(canvaspoints[0].x, canvaspoints[0].y);

        var m = 0;
        var dx1 = 0;
        var dy1 = 0;
        var dx2 = 0;
        var dy2 = 0;

        var preP = canvaspoints[0];

        for (var i = 1; i < canvaspoints.length; i++) {
            var curP = canvaspoints[i];
            var nexP = canvaspoints[i + 1];
            if (nexP) {
                m = this.gradient(preP, nexP);
                dx2 = (nexP.x - curP.x) * -f;
                dy2 = dx2 * m * t;
            } else {
                dx2 = 0;
                dy2 = 0;
            }

            this.ctx.bezierCurveTo(
                preP.x - dx1, preP.y - dy1,
                curP.x + dx2, curP.y + dy2,
                curP.x, curP.y
            );

            dx1 = dx2;
            dy1 = dy2;
            preP = curP;
        }
        this.ctx.stroke();
    }




}