var TETRIS = (function (window) {

    //canvas vars
    var boardCanvasContext,
        previewCanvas,
        previewCanvasContext;

    //DOM element ids
    var scoreId,
        gameOverId = 'tetris-gameover',
        pausedScreenId = 'tetris-paused';

    //constant vars
    var boardSquareSize = 36, //in pixels
        boardWidth = 10, //tetris board is 10 x 16
        boardHeight = 16,
        dropSpeed = 500;

    //score and level vars
    var score = 0,
        level = 1;

    //game state vars
    var boardState = (function () { //2d array to maintain the state of the tetris board
        var rowArray = new Array(boardHeight);
        for (var row = 0; row <= (boardHeight - 1) ; row++) {
            var colArray = Array.apply(null, new Array(boardWidth)).map(Number.prototype.valueOf, 0); //creates a zero filled array
            rowArray[row] = colArray;
        }
        return rowArray;
    })(),
        boardPixelHeight = boardHeight * boardSquareSize + 1, //add 1 because we start drawing at 0.5
        boardPixelWidth = boardWidth * boardSquareSize + 1, //add 1 because we start drawing at 0.5
        previewTetromino = null,
		currentTetromino = null,
		gameInterval,
        gameIsPaused = false,
        gameIsOver = false;

    //constructor functions
    var Tetromino = (function () {
        function tetromino(name) {
            var ctor = this;
            ctor.name = name;
            ctor.rotation1 = null;
            //{ example roation object
            //    shape: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            //    height: 2,
            //    width: 2,
            //    left: 1,
            //    right: 1,
            //    top: 1,
            //    bottom: 1
            //};
            ctor.rotation2 = null;
            ctor.rotation3 = null;
            ctor.rotation4 = null;
            ctor.currentRotationNum = 1;							//the index of the current rotation (1-4 rotations)
            ctor.x = 3;											    //num between 0 and 10 (tetris board width)
            ctor.y = -2;									        //num between 0 and 16 (tetris board height)
            ctor.colorNum = null,
            ctor.isDropping = false,
            ctor.hasCollided = false;
        }
        tetromino.prototype.getCurrentShapeRotation = function () {
            return this.getShapeRotation(this.currentRotationNum);
        };
        tetromino.prototype.getShapeRotation = function (rotationIndex) {
            return this['rotation' + rotationIndex];
        };
        tetromino.prototype.getCurrentPixelHeight = function () {
            return this.getCurrentShapeRotation().height * boardSquareSize;
        };
        tetromino.prototype.getCurrentPixelWidth = function () {
            return this.getCurrentShapeRotation().width * boardSquareSize;
        };
        tetromino.prototype.moveRight = function () {
            if (!this.canMove() || this.isDropping) return;

            var currentShapeRotation = this.getCurrentShapeRotation();

            if (detectCollisions(this.x + 1, this.y, currentShapeRotation)) return;

            this.x++;
            drawTetromino(this.x, this.y, currentShapeRotation.shape, this.colorNum);
        };
        tetromino.prototype.moveLeft = function () {
            if (!this.canMove() || this.isDropping) return;

            var currentShapeRotation = this.getCurrentShapeRotation();

            if (detectCollisions(this.x - 1, this.y, currentShapeRotation)) return;

            this.x--;
            drawTetromino(this.x, this.y, currentShapeRotation.shape, this.colorNum);
        };
        tetromino.prototype.moveDown = function () {
            if (!this.canMove()) return;
            
            var currentShapeRotation = this.getCurrentShapeRotation();

            if (detectCollisions(this.x, this.y + 1, currentShapeRotation)) {
                onCollisionDetectedMovingDown(this.x, this.y, currentShapeRotation, this.colorNum);
                this.hasCollided = true;
                return;
            }

            this.y++;
            drawTetromino(this.x, this.y, currentShapeRotation.shape, this.colorNum);
        };
        tetromino.prototype.rotate = function () {
            if (!this.canMove() || this.isDropping) return;

            var self = this;

            var nextRotation = self.currentRotationNum;
            if (self.currentRotationNum == 4) {
                nextRotation = 1;
            } else nextRotation++;
            var nextRotationShape = self.getShapeRotation(nextRotation);

            if (detectCollisions(this.x, this.y + 1, nextRotationShape)) return;

            self.currentRotationNum = nextRotation;

            drawTetromino(this.x, this.y, nextRotationShape.shape, this.colorNum);
        };
        tetromino.prototype.canMove = function () {
            return !gameIsOver && !gameIsPaused;
        };
        tetromino.prototype.calculateStartingYPosition = function() {
            var self = this;
            var currentRotation = self.getCurrentShapeRotation();
            return -Math.abs(currentRotation.height + 1);
        };
        tetromino.prototype.drop = function() {
            this.isDropping = true;
            while (!this.hasCollided) {
                this.moveDown();
            }
        };
        return tetromino;
    })();

    var tetrominoes = (function () {
        var arr = [];

        var oShape = new Tetromino("O");
        oShape.rotation1 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            height: 2,
            width: 2,
            left: 1,
            right: 1,
            top: 1,
            bottom: 1
        };
        oShape.rotation2 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            height: 2,
            width: 2,
            left: 1,
            right: 1,
            top: 1,
            bottom: 1
        };
        oShape.rotation3 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            height: 2,
            width: 2,
            left: 1,
            right: 1,
            top: 1,
            bottom: 1
        };
        oShape.rotation4 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            height: 2,
            width: 2,
            left: 1,
            right: 1,
            top: 1,
            bottom: 1
        };
        oShape.colorNum = 1;
        arr.push(oShape);

        var iShape = new Tetromino("I");
        iShape.rotation1 = {
            shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            height: 1,
            width: 4,
            left: 0,
            right: 0,
            top: 1,
            bottom: 2
        };
        iShape.rotation2 = {
            shape: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
            height: 4,
            width: 1,
            left: 2,
            right: 1,
            top: 0,
            bottom: 0
        };
        iShape.rotation3 = {
            shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            height: 1,
            width: 4,
            left: 0,
            right: 0,
            top: 1,
            bottom: 2
        };
        iShape.rotation4 = {
            shape: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
            height: 4,
            width: 1,
            left: 2,
            right: 1,
            top: 0,
            bottom: 0
        };
        iShape.colorNum = 2;
        arr.push(iShape);

        var sShape = new Tetromino("S");
        sShape.rotation1 = {
            shape: [[0, 0, 0, 0], [0, 0, 1, 1], [0, 1, 1, 0], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 1,
            bottom: 1
        };
        sShape.rotation2 = {
            shape: [[0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 2,
            right: 0,
            top: 0,
            bottom: 1
        };
        sShape.rotation3 = {
            shape: [[0, 0, 0, 0], [0, 0, 1, 1], [0, 1, 1, 0], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 1,
            bottom: 1
        };
        sShape.rotation4 = {
            shape: [[0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 2,
            right: 0,
            top: 0,
            bottom: 1
        };
        sShape.colorNum = 3;
        arr.push(sShape);

        var zShape = new Tetromino("Z");
        zShape.rotation1 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 1,
            bottom: 1
        };
        zShape.rotation2 = {
            shape: [[0, 0, 0, 1], [0, 0, 1, 1], [0, 0, 1, 0], [0, 0, 0, 0]],
            width: 2,
            height: 3,
            left: 2,
            right: 0,
            top: 0,
            bottom: 2
        };
        zShape.rotation3 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 1,
            bottom: 1
        };
        zShape.rotation4 = {
            shape: [[0, 0, 0, 1], [0, 0, 1, 1], [0, 0, 1, 0], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 2,
            right: 0,
            top: 0,
            bottom: 2
        };
        zShape.colorNum = 4;
        arr.push(zShape);

        var lShape = new Tetromino("L");
        lShape.rotation1 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 1], [0, 1, 0, 0], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 1,
            bottom: 1
        };
        lShape.rotation2 = {
            shape: [[0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 1,
            right: 1,
            top: 0,
            bottom: 1
        };
        lShape.rotation3 = {
            shape: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 0,
            bottom: 2
        };
        lShape.rotation4 = {
            shape: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 2,
            right: 0,
            top: 0,
            bottom: 1
        };
        lShape.colorNum = 5;
        arr.push(lShape);

        var jShape = new Tetromino("J");
        jShape.rotation1 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 1], [0, 0, 0, 1], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 1,
            bottom: 1
        };
        jShape.rotation2 = {
            shape: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 1,
            right: 1,
            top: 0,
            bottom: 1
        };
        jShape.rotation3 = {
            shape: [[0, 1, 0, 0], [0, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 0,
            bottom: 2
        };
        jShape.rotation4 = {
            shape: [[0, 0, 1, 1], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 2,
            right: 0,
            top: 0,
            bottom: 1
        };
        jShape.fillStyle = '#2727F5';
        jShape.colorNum = 6;
        arr.push(jShape);

        var tShape = new Tetromino("T");
        tShape.rotation1 = {
            shape: [[0, 0, 0, 0], [0, 1, 1, 1], [0, 0, 1, 0], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 1,
            bottom: 1
        };
        tShape.rotation2 = {
            shape: [[0, 0, 1, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 1,
            right: 1,
            top: 0,
            bottom: 1
        };
        tShape.rotation3 = {
            shape: [[0, 0, 1, 0], [0, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            height: 2,
            width: 3,
            left: 1,
            right: 0,
            top: 0,
            bottom: 2
        };
        tShape.rotation4 = {
            shape: [[0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 1, 0], [0, 0, 0, 0]],
            height: 3,
            width: 2,
            left: 2,
            right: 0,
            top: 0,
            bottom: 1
        };
        tShape.colorNum = 7;
        arr.push(tShape);

        return arr;
    })();

    //collision detection
    function detectCollisions(shapeX, shapeY, rotation) {
        //shapeX is the tetro's x value (tetromino.x)
        //shapeY is the tetro's y value (tetromino.y)
        //rotation is the tetro's rotation (tetromino.getCurrentShapeRotation());

        var shape = rotation.shape;

        for (var row = 0; row < shape.length; row++) {
            for (var col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {   //don't bother checking spots with 0
                    var x = shapeX + col;
                    var y = shapeY + row;

                    //check bottom
                    if ((y * boardSquareSize) >= (boardPixelHeight - 1)) {
                        return true;
                    }

                    //check left well
                    if (x < 0) {
                        return true;
                    }

                    //check right wall
                    if (x > (boardWidth - 1)) {
                        return true;
                    }

                    //check the board state
                    var boardRow = boardState[y];
                    if (!boardRow) return false;    //row isn't part of the boardState, ignore it
                    var boardCol = boardRow[x];
                    if (boardCol > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function onCollisionDetectedMovingDown(x, y, shapeRotation, colorNum) {
        if (y < 0) {
            gameOver();
        };

        addToBoardState(x, y, shapeRotation, colorNum);

        currentTetromino = previewTetromino;
        previewTetromino = getRandomTetromino();
        currentTetromino.y = currentTetromino.calculateStartingYPosition();

        drawPreviewTetromino();
    }

    function addToBoardState(shapeX, shapeY, rotation, colorNum) {
        var shape = rotation.shape;
        var numLinesCleared = 0;

        for (var row = 0; row < shape.length; row++) {
            var spotFilled = false;
            for (var col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {   //don't bother checking spots with 0
                    var x = shapeX + col;
                    var y = shapeY + row;

                    boardState[y][x] = colorNum;
                    spotFilled = true;
                }
            }
            if (spotFilled) {                   //check for full rows in the boardState
                var y = shapeY + row;
                var numColsFilledIn = 0;
                for (var col = 0; col < boardState[y].length; col++) {
                    if (boardState[y][col] > 0) numColsFilledIn++;
                }
                if (numColsFilledIn === boardState[y].length) {     //if all cols in this row are filled, so clear the row
                    clearLine(y);
                    numLinesCleared++;
                }
                spotFilled = false;
            }
        }

        calculateScore(numLinesCleared);
    }

    function clearLine(rowToClear) {
        boardState.splice(rowToClear, 1);   //remove the row
        boardState.unshift(Array.apply(null, new Array(boardWidth)).map(Number.prototype.valueOf, 0));  //add new empty row to top of array
    }

    //drawing
    function drawBoard(canvasCtx, pixelHeight, pixelWidth) {
        canvasCtx.beginPath();

        for (var x = 0; x <= pixelWidth; x += boardSquareSize) {	//draw vertical lines
            canvasCtx.moveTo(0.5 + x, 0);
            canvasCtx.lineTo(0.5 + x, pixelHeight);
        }
        for (var y = 0; y <= pixelHeight; y += boardSquareSize) {	//draw horizontal lines
            canvasCtx.moveTo(0, 0.5 + y);
            canvasCtx.lineTo(pixelWidth, 0.5 + y);
        }

        //actually draw the board
        canvasCtx.strokeStyle = "#ddd";
        canvasCtx.stroke();
    }

    function drawBoardState() {
        for (var row = 0; row < boardState.length; row++) {
            for (var col = 0; col < boardState[row].length; col++) {
                if (boardState[row][col] !== 0) {
                    var colorNum = boardState[row][col];
                    var xCoord = (col * boardSquareSize);
                    var yCoord = (row * boardSquareSize);
                    drawSquare(xCoord, yCoord, colorNum, boardCanvasContext);
                }
            }
        }
    }

    function drawTetromino(x, y, shapeRotation, colorNum) {
        resetAndReDrawBoard();

        for (var row = 0; row < shapeRotation.length; row++) {
            for (var col = 0; col < shapeRotation[row].length; col++) {
                if (shapeRotation[row][col] === 0) continue;

                var xCoord = (col * boardSquareSize) + (x * boardSquareSize);
                var yCoord = (row * boardSquareSize) + (y * boardSquareSize);

                drawSquare(xCoord, yCoord, colorNum, boardCanvasContext);
            }
        }
    }

    function drawPreviewTetromino() {

        clearPreview();
        drawBoard(previewCanvasContext, boardSquareSize * 6, boardSquareSize * 6);

        var shapeRotation = previewTetromino.getCurrentShapeRotation().shape;

        for (var row = 0; row < shapeRotation.length; row++) {
            for (var col = 0; col < shapeRotation[row].length; col++) {
                if (shapeRotation[row][col] === 0) continue;

                var xCoord = (col * boardSquareSize) + (1 * boardSquareSize);
                var yCoord = (row * boardSquareSize) + (1 * boardSquareSize);

                drawSquare(xCoord, yCoord, previewTetromino.colorNum, previewCanvasContext);
            }
        }
    }

    function drawSquare(xCoord, yCoord, colorNum, canvasContext) {

        canvasContext.fillStyle = getBlockBevelColor(colorNum);
        canvasContext.fillRect(xCoord, yCoord, boardSquareSize, boardSquareSize);

        var bevelWidth = 3;

        canvasContext.fillStyle = getBlockColor(colorNum);
        canvasContext.fillRect(
            xCoord + bevelWidth + .5,
            yCoord + bevelWidth + .5,
            boardSquareSize - (bevelWidth * 2),
            boardSquareSize - (bevelWidth * 2));

        canvasContext.strokeStyle = 'black';
        canvasContext.strokeRect(xCoord + .5, yCoord + .5, boardSquareSize, boardSquareSize);
    }

    function clearBoard() {
        boardCanvasContext.clearRect(0, 0, boardPixelWidth, boardPixelHeight);
    }

    function clearPreview() {
        previewCanvasContext.clearRect(0, 0, boardPixelWidth, boardPixelHeight);
    }

    function resetAndReDrawBoard() {
        clearBoard();
        drawBoard(boardCanvasContext, boardPixelHeight, boardPixelWidth);
        drawBoardState();
    }

    function getBlockColor(colorNum) {
        if (!colorNum) throw new Error('getBlockColor() : colorNum cannot be null');

        switch (colorNum) {
            case 1:                     //O shape color
                return '#F0F000';
            case 2:                     //I shape color
                return '#00F0F0';
            case 3:                     //S shape color
                return '#00F000';
            case 4:                     //Z shape color
                return '#F00000';
            case 5:                     //L shape color
                return '#F0A000';
            case 6:                     //J shape color
                return '#0000F0';
            case 7:                     //T shape color
                return '#A000F0';
            default:
                return 'red';
        }
    }

    function getBlockBevelColor(colorNum) {
        if (!colorNum) throw new Error('getBlockColor() : colorNum cannot be null');

        switch (colorNum) {
            case 1:                     //O shape color
                return '#FCFCB0';
            case 2:                     //I shape color
                return '#9FF9F9';
            case 3:                     //S shape color
                return '#AFF7AF';
            case 4:                     //Z shape color
                return '#F9AEAE';
            case 5:                     //L shape color
                return '#F7DCA5';
            case 6:                     //J shape color
                return '#A9A9F9';
            case 7:                     //T shape color
                return '#DDA4F9';
            default:
                return 'red';
        }
    }

    //event handling
    function keyPress(e) {
        e.preventDefault();

        if (!currentTetromino) return;

        if (e.charCode === 32) {
            currentTetromino.drop();
        } else if (e.charCode === 112) {
            pauseGame();
        } else {
            switch (e.keyCode) {
                case 37:
                    currentTetromino.moveLeft();
                    break;
                case 38:
                    currentTetromino.rotate();
                    break;
                case 39:
                    currentTetromino.moveRight();
                    break;
                case 40:
                    currentTetromino.moveDown();
                    break;
            }
        }
    }

    //utils
    function getRandomTetromino() {
        //creates a new instance of a random tetromino

        var randomShapeIndex = randomNumber(0, (tetrominoes.length - 1));

        //return Object.create(tetrominoes[5]);
        return Object.create(tetrominoes[randomShapeIndex]);
    }

    function randomNumber(from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    }

    //game loop
    function startGameLoop() {
        if (!currentTetromino) {
            previewTetromino = getRandomTetromino();
            currentTetromino = getRandomTetromino();
            currentTetromino.y = currentTetromino.calculateStartingYPosition();
            drawPreviewTetromino();
        }

        gameInterval = window.setInterval(function () {
            currentTetromino.moveDown();
        }, dropSpeed);
    }

    function pauseGame() {
        if (gameIsOver) return;

        var pausedScreenElement = DOMHelpers.getElmentById(pausedScreenId);
        
        if (!gameIsPaused) {
            window.clearInterval(gameInterval);
            gameIsPaused = true;
            
            DOMHelpers.show(pausedScreenElement);
        } else {
            startGameLoop();
            gameIsPaused = false;

            DOMHelpers.hide(pausedScreenElement);
        }
    }

    function gameOver() {
        gameOver = true;
        
        var gameOverScreenElement = DOMHelpers.getElmentById(gameOverId);
        DOMHelpers.show(gameOverScreenElement);
        
        window.clearInterval(gameInterval);
    }

    //scoring
    function calculateScore(numLinesCleared) {

        var pointsForLine = 0;

        if (numLinesCleared === 0) return;
        else if (numLinesCleared === 1) pointsForLine = 40;
        else if (numLinesCleared === 2) pointsForLine = 100;
        else if (numLinesCleared === 3) pointsForLine = 300;
        else if (numLinesCleared >= 4) pointsForLine = 1200;

        var pointsGained = pointsForLine * (numLinesCleared + 1);

        score += pointsGained;

        updateScore();
    }

    function updateScore() {
        var scoreElement = window.document.getElementById(scoreId);
        scoreElement.innerHTML = score + " points";
    }

    //low-level DOM manipulation functions
    var DOMHelpers = (function () {
        var domHelpers = function () {
            this.getElmentById = function (id) {
                return window.document.getElementById(id);
            };
            this.createElement = function (tagName) {
                return window.document.createElement(tagName);
            };
            this.appendChild = function (parent, child) {
                parent.appendChild(child);
            };
            this.css = function (element, props) {
                var elStyle = element.style;
                for (var prop in props) {
                    elStyle[prop] = props[prop];
                }
            },
            this.hide = function (element) {
                element.style.display = 'none';
            };
            this.show = function (element) {
                element.style.display = 'block';
            };
            this.height = function (element, height) {
                element.setAttribute('height', height + 'px');
            };
            this.width = function (element, width) {
                element.setAttribute('width', width + 'px');
            };
        };

        return new domHelpers();
    })();

    return {
        start: function (boardContainerElId, previewContainerElId, scoreElId) {
            if (!boardContainerElId) throw new Error('must pass an id selector for the tetris board container');
            if (!previewContainerElId) throw new Error('must pass an id selector for the tetris preview container');

            var boardCanvasId = boardContainerElId;
            scoreId = scoreElId;

            //tetris board
            var boardContainerElement = DOMHelpers.getElmentById(boardCanvasId);
            //game over screen
            var gameOverScreenElement = DOMHelpers.getElmentById(gameOverId);
            DOMHelpers.css(gameOverScreenElement, {
                height: boardPixelHeight + 1 + 'px',
                width: boardPixelWidth + 1 + 'px'
            });
            DOMHelpers.hide(gameOverScreenElement);
            //paused screen
            var pausedScreenElement = DOMHelpers.getElmentById(pausedScreenId);
            DOMHelpers.css(pausedScreenElement, {
                height: boardPixelHeight + 1 + 'px',
                width: boardPixelWidth + 1 + 'px'
            });
            DOMHelpers.hide(pausedScreenElement);

            DOMHelpers.appendChild(boardContainerElement, gameOverScreenElement);
            DOMHelpers.appendChild(boardContainerElement, pausedScreenElement);
            //preview
            var previewContainerElement = DOMHelpers.getElmentById(previewContainerElId);

            //setup the tetris board
            //boardContainer.style.height = boardPixelHeight + 1 + 'px';
            //boardContainer.style.width = boardPixelWidth + 1 + 'px';
            var boardCanvas = DOMHelpers.getElmentById('tetris-board');
            DOMHelpers.height(boardCanvas, boardPixelHeight + 'px');
            DOMHelpers.width(boardCanvas, boardPixelWidth + 'px');

            boardContainerElement.appendChild(boardCanvas);
            boardCanvasContext = boardCanvas.getContext('2d');

            //setup the tetris preview
            var previewHeight = boardSquareSize * 6;
            var previewWidth = boardSquareSize * 6;
            DOMHelpers.css(previewContainerElement, {
                height: previewHeight + 1 + 'px',
                width: previewWidth + 1 + 'px'
            });
            previewCanvas = DOMHelpers.createElement('canvas');
            previewCanvas.id = 'textris-preview';
            DOMHelpers.height(previewCanvas, previewHeight);
            DOMHelpers.width(previewCanvas, previewWidth);
            previewCanvas.style.border = '1px solid black';
            previewContainerElement.appendChild(previewCanvas);
            previewCanvasContext = previewCanvas.getContext('2d');
            drawBoard(previewCanvasContext, boardSquareSize * 6, boardSquareSize * 6);

            if (!boardCanvasContext || !boardCanvasContext.drawImage) throw new Error('canvas does not support drawing');

            //events
            window.onkeypress = keyPress;

            //run game
            drawBoard(boardCanvasContext, boardPixelHeight, boardPixelWidth);
            startGameLoop();
            updateScore();
        }
    };
})(window);

/////////////////////////////////////////

(function (window) {
    window.addEventListener("load", function () {
        TETRIS.start('tetris', 'tetris-preview', 'tetris-score');
    });
})(window);