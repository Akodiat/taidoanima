import * as THREE from "three";
import { OrbitControls } from "./jsm/controls/OrbitControls.js";
import { OutlineEffect } from "./jsm/effects/OutlineEffect.js";
import { MMDLoader } from "./jsm/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "./jsm/animation/MMDAnimationHelper.js";

// VR / AR capabilities
import { XRButton } from './jsm/webxr/XRButton.js';

import { animationMap } from "./animationMap.js"

let meshes = [];
let camera, scene, renderer, effect;
let helper, ikHelper, physicsHelper;

let speed = 1;

const clock = new THREE.Clock();

Ammo().then(function (AmmoLib) {
    Ammo = AmmoLib;

    init();
    animate();
});

// From: https://html-online.com/articles/get-url-parameters-javascript/
function getUrlParam(param, defaultVal) {
    let vars = {};
    window.location.href.replace(
        /[?&]+([^=&]+)=([^&]*)/gi,
        (m,key,value)=>{vars[key] = value}
    );
    return param in vars ? vars[param] : defaultVal;
}

function init() {
    const container = document.createElement("div");
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 200);
    camera.position.z = -3;
    camera.position.y = 1;

    // scene

    scene = new THREE.Scene();

    const gridHelper = new THREE.PolarGridHelper(4.5, 8);
    scene.add(gridHelper);

    const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(),
        4.5/4, 0x000000
    );
    scene.add( arrowHelper );

    const ambient = new THREE.AmbientLight(0x666666);
    scene.add(ambient);

    const directionalLight = new THREE.DirectionalLight(0x887766);
    directionalLight.position.set(-1, 1, 1).normalize();
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({
        antialias: true, alpha: true
    });

    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor")
    renderer.domElement.style = "background:none";
    document.getElementById("info").appendChild(XRButton.createButton(renderer, {optionalFeatures: ['light-estimation']}));

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    effect = new OutlineEffect(renderer);

    // model

    helper = new MMDAnimationHelper({
        afterglow: 2.0,
    });

    let animationId = getUrlParam("id", "sentai-hokei");
    document.getElementById("anima-select").value = animationId;

    load(animationId, initGui);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.target = new THREE.Vector3(0, 1, 0)
    camera.lookAt(controls.target)

    window.addEventListener("resize", onWindowResize);

    function initGui() {
        let playpause = document.getElementById("playpause");

        playpause.onchange = ()=>{
            helper.enable("animation", !playpause.checked);
        };
        playpause.checked = false;

        document.getElementById("rwd").onclick = ()=>{
            setPause(false);
            helper.update(-5);
        };

        document.getElementById("ffw").onclick = ()=>{
            setPause(false);
            helper.update(5);
        };

        document.getElementById("slowdown").onclick = ()=>{
            setPause(false);
            speed /= 1.1;
            console.log("Speed: "+speed)
        };

        document.getElementById("speedup").onclick = ()=>{
            setPause(false);
            speed *= 1.1;
            console.log("Speed: "+speed)
        };

        document.getElementById("anima-select").onchange = ()=>{
            swapAnimation(document.getElementById("anima-select").value)
        }
    }
}

function setPause(pause) {
    let playpause = document.getElementById("playpause");
    playpause.checked = pause;
    helper.enable("animation", !playpause.checked);
}

function swapAnimation(animationId) {
    meshes.forEach(mesh=>{
        scene.remove(mesh);
        helper.remove(mesh); 
    })
    meshes = [];
    scene.remove(ikHelper);
    scene.remove(physicsHelper);
    load(animationId);
}

function load(animation, callback) {
    let paths = animationMap[animation];
    setPause(true);
    let nStarted = 0;
    paths.animations.forEach((animationPath, i) => {
        let model = paths.models[i % paths.models.length];
        loadAnimation(model, animationPath, ()=>{
            if (callback !== undefined) {
                callback();
            }
            nStarted++;
            // Make sure the start is synced
            if (nStarted == paths.animations.length) {
                setPause(false);
            }
        });
    })
}


function loadAnimation(modelPath, animationPath, callback) {
    const loader = new MMDLoader();

    function onProgress(xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            console.log(Math.round(percentComplete, 2) + "% downloaded");
        }
    }

    loader.loadWithAnimation(
        modelPath,
        [animationPath],
        function (mmd) {
            const mesh = mmd.mesh;

            // Decimetres to metres
            mesh.scale.divideScalar(10)

            meshes.push(mesh);
            scene.add(mesh);

            helper.add(mesh, {
                animation: mmd.animation,
                physics: true,
            });

            ikHelper = helper.objects.get(mesh).ikSolver.createHelper();
            ikHelper.visible = false;
            scene.add(ikHelper);

            physicsHelper = helper.objects.get(mesh).physics.createHelper();
            physicsHelper.visible = false;
            scene.add(physicsHelper);

            if (callback !== undefined) {
                callback();
            }
        },
        onProgress,
        null
    );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    effect.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(animate);
    render();
}

function render() {
    helper.update(speed * clock.getDelta());
    effect.render(scene, camera);
}
