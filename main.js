import * as THREE from "three";

import { GUI } from "./jsm/libs/lil-gui.module.min.js";

import { OrbitControls } from "./jsm/controls/OrbitControls.js";
import { OutlineEffect } from "./jsm/effects/OutlineEffect.js";
import { MMDLoader } from "./jsm/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "./jsm/animation/MMDAnimationHelper.js";

let mesh, camera, scene, renderer, effect;
let helper, ikHelper, physicsHelper;

let speed = 1;

const clock = new THREE.Clock();

Ammo().then(function (AmmoLib) {
    Ammo = AmmoLib;

    init();
    animate();
});

function init() {
    const container = document.createElement("div");
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = -30;

    // scene

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const gridHelper = new THREE.PolarGridHelper(45, 8);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, -10, 0),
        45/4, 0x000000
    );
    scene.add( arrowHelper );

    const ambient = new THREE.AmbientLight(0x666666);
    scene.add(ambient);

    const directionalLight = new THREE.DirectionalLight(0x887766);
    directionalLight.position.set(-1, 1, 1).normalize();
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    effect = new OutlineEffect(renderer);

    // model

    function onProgress(xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            console.log(Math.round(percentComplete, 2) + "% downloaded");
        }
    }

    const modelFile = "mmd/taidoka.pmd";
    const vmdFiles = ["mmd/sentai-houkei.vmd"];

    helper = new MMDAnimationHelper({
        afterglow: 2.0,
    });

    const loader = new MMDLoader();

    loader.loadWithAnimation(
        modelFile,
        vmdFiles,
        function (mmd) {
            mesh = mmd.mesh;
            mesh.position.y = -10;
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

            //initGui();

            let playpause = document.getElementById("playpause");
            playpause.onchange = ()=>{
                helper.enable("animation", !playpause.checked);
            };
            playpause.checked = false;

            document.getElementById("rwd").onclick = ()=>{
                playpause.checked = false; playpause.onchange();
                helper.update(-5);
            };

            document.getElementById("ffw").onclick = ()=>{
                playpause.checked = false; playpause.onchange();
                helper.update(5);
            };

            document.getElementById("slowdown").onclick = ()=>{
                playpause.checked = false; playpause.onchange();
                speed /= 1.1;
                console.log("Speed: "+speed)
            };

            document.getElementById("speedup").onclick = ()=>{
                playpause.checked = false; playpause.onchange();
                speed *= 1.1;
                console.log("Speed: "+speed)
            };

        },
        onProgress,
        null
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10;
    controls.maxDistance = 100;

    window.addEventListener("resize", onWindowResize);

    function initGui() {
        const api = {
            animation: true,
            ik: true,
            outline: true,
            physics: true,
            "show IK bones": false,
            "show rigid bodies": false,
        };

        const gui = new GUI();

        gui.add(api, "animation").onChange(function () {
            helper.enable("animation", api["animation"]);
        });

        gui.add(api, "ik").onChange(function () {
            helper.enable("ik", api["ik"]);
        });

        gui.add(api, "outline").onChange(function () {
            effect.enabled = api["outline"];
        });

        gui.add(api, "physics").onChange(function () {
            helper.enable("physics", api["physics"]);
        });

        gui.add(api, "show IK bones").onChange(function () {
            ikHelper.visible = api["show IK bones"];
        });

        gui.add(api, "show rigid bodies").onChange(function () {
            if (physicsHelper !== undefined) physicsHelper.visible = api["show rigid bodies"];
        });
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    effect.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    helper.update(speed * clock.getDelta());
    effect.render(scene, camera);
}
