'use strict';

let gl;                         // The webgl context.

let iAttribVertex;              // Location of the attribute variable in the shader program.
let iAttribTexture;             // Location of the attribute variable in the shader program.

let iColor;                     // Location of the uniform specifying a color for the primitive.
let iColorCoef;                 // Location of the uniform specifying a color for the primitive.
let iModelViewProjectionMatrix; // Location of the uniform matrix representing the combined transformation.
let iTextureMappingUnit;

let iVertexBuffer;              // Buffer to hold the values.
let iIndexBuffer;              // Buffer to hold the values.
let iTexBuffer;                 // Buffer to hold the values.

let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let isWireframe = false;

let tSlider;
let numT;

let amplitudeSlider;
let amplitudeInput;

let nSlider;
let numN;

/* Draws a WebGL primitive.  The first parameter must be one of the constants
 * that specify primitives:  gl.POINTS, gl.LINES, gl.LINE_LOOP, gl.LINE_STRIP,
 * gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN.  The second parameter must
 * be an array of 4 numbers in the range 0.0 to 1.0, giving the RGBA color of
 * the color of the primitive.  The third parameter must be an array of numbers.
 * The length of the array must be a multiple of 3.  Each triple of numbers provides
 * xyz-coords for one vertex for the primitive.  This assumes that u_color is the
 * location of a color uniform in the shader program, a_coords_loc is the location of
 * the coords attribute, and a_coords_buffer is a VBO for the coords attribute.
 */
function drawPrimitive(primitiveType, color, vertices, texCoords) {
    gl.uniform4fv(iColor, color);
    gl.uniform1f(iColorCoef, 0.0);

    gl.enableVertexAttribArray(iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    if (texCoords) {
        gl.enableVertexAttribArray(iAttribTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
        gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    } else {
        gl.disableVertexAttribArray(iAttribTexture);
        gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
        gl.uniform1f(iColorCoef, 1.0);
    }

    gl.drawArrays(primitiveType, 0, vertices.length / 3);
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    _resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 10, 2, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniform1i(iTextureMappingUnit, 0);


    const vertices = []
    const texCoords = []
    const indices = []


    const POINTS = 70

    const n = parseInt(numN.value);
    const t = 0;

    for (let j = 0; j <= POINTS; j++) {
        const r = j * 0.6 / POINTS + 0.4;
        for (let i = 0; i <= POINTS; i++) {
            const fi = i * 2 * Math.PI / POINTS;
            const x = -(Math.cos(t + fi) / (2 * r)) - ((Math.pow(r, (1 + 2 * n)) * Math.cos(t - (1 + 2 * n) * fi)) / (2 + 4 * n))
            const y = -(Math.sin(t + fi) / (2 * r)) - ((Math.pow(r, (1 + 2 * n)) * Math.sin(t - (1 + 2 * n) * fi)) / (2 + 4 * n))
            const z = (Math.pow(r, n) * Math.cos(t - n * fi)) / n

            vertices.push(x, y, z);

            const sTex = j / POINTS;
            const tTex = i / POINTS;
            texCoords.push(sTex);
            texCoords.push(tTex);
        }
    }

    for (let j = 0; j < POINTS; j++) {
        for (let i = 0; i < POINTS; i++) {
            const p1 = j * (POINTS + 1) + i;
            const p2 = p1 + (POINTS + 1);
            indices.push(p1);
            indices.push(p2);
            indices.push(p1 + 1);
            indices.push(p1 + 1);
            indices.push(p2);
            indices.push(p2 + 1);
        }
    }

    gl.uniform4fv(iColor, [0.1, 0.2, 0.7, 1]);
    gl.uniform1f(iColorCoef, 0.0);

    // vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    // indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);

    // textures
    if (isWireframe) {
        gl.disableVertexAttribArray(iAttribTexture);
        gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
        gl.uniform1f(iColorCoef, 1.0);

        gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.enableVertexAttribArray(iAttribTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
        gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }

    /* Draw coordinate axes as thick colored lines that extend through the cube. */
    gl.lineWidth(4);
    drawPrimitive(gl.LINES, [1, 0, 0, 1], [-2, 0, 0, 2, 0, 0]);
    drawPrimitive(gl.LINES, [0, 1, 0, 1], [0, -2, 0, 0, 2, 0]);
    drawPrimitive(gl.LINES, [0, 0, 1, 1], [0, 0, -2, 0, 0, 2]);
    gl.lineWidth(1);
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(prog);

    iAttribVertex = gl.getAttribLocation(prog, "vertex");
    iAttribTexture = gl.getAttribLocation(prog, "texCoord");

    iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    iColor = gl.getUniformLocation(prog, "color");
    iColorCoef = gl.getUniformLocation(prog, "fColorCoef");
    iTextureMappingUnit = gl.getUniformLocation(prog, "u_texture");

    iVertexBuffer = gl.createBuffer();
    iIndexBuffer = gl.createBuffer();
    iTexBuffer = gl.createBuffer();

    LoadTexture();

    gl.enable(gl.DEPTH_TEST);
}

function LoadTexture() {
    // Create a texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    // Asynchronously load an image
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = "https://webglfundamentals.org/webgl/resources/f-texture.png";
    image.addEventListener('load', () => {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        draw();
    });
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    numN = document.getElementById('numN');
    nSlider = document.getElementById('n');

    nSlider.addEventListener('input', () => {
        numN.value = nSlider.value;
        draw();
    });
    numN.addEventListener('change', () => {
        nSlider.value = numN.value;
        draw();
    });

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        document.getElementById('info-block').hidden = true;
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        document.getElementById('info-block').hidden = true;
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

function _resizeCanvasToDisplaySize(canvas) {
    const dpr = window.devicePixelRatio;
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const {width, height} = canvas.getBoundingClientRect();
    const displayWidth = Math.round(width * dpr);
    const displayHeight = Math.round(height * dpr);

    // Check if the canvas is not the same size.
    const needResize = canvas.width !== displayWidth ||
        canvas.height !== displayHeight;

    if (needResize) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    return needResize;
}

function toggleWireframe(button) {
    button.innerHTML = isWireframe ? 'Show wireframe' : 'Hide wireframe';
    isWireframe = !isWireframe;
    draw();
}
