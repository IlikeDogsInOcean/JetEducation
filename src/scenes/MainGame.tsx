import { Scene } from '../common/game';
import ShaderProgram from '../common/shader-program';
import Mesh from '../common/mesh';
import * as MeshUtils from '../common/mesh-utils';
import * as TextureUtils from '../common/texture-utils';
import Camera from '../common/camera';
import FlyCameraController from '../common/camera-controllers/fly-camera-controller';
import { vec3, mat4, quat } from 'gl-matrix';
import SceneMovement from '../common/SceneMovement';
import { Key } from 'ts-key-enum';


interface Material {
    diffuse: vec3,
    specular: vec3,
    ambient: vec3,
    shininess: number
};
// This is an interface for 3D object, you can think of it as C++ structs in this code (but they are generally different)
interface Object3D {
    mesh: Mesh; // which mesh to draw
    texture: WebGLTexture; // which texture to attach
    tint: [number, number, number, number], // the color tint of the object
    Position: vec3,     //the position of the object
    Scale: vec3,        //the scaling vector of the object
    ModelMatrix: mat4, // The model matrix of the object in the current frame
    material: Material
};

// In this scene we will draw a scene to multiple targets then use the targets to do a motion blur post processing
export default class MainGame extends Scene {
    program: ShaderProgram; // This will hold all our shders
    program2: ShaderProgram; // This will hold all our shders
    camera: Camera;
    controller: FlyCameraController;
    meshes: { [name: string]: Mesh } = {}; // This will hold all our meshes
    textures: { [name: string]: WebGLTexture } = {}; // This will hold all our textures
    sampler: WebGLSampler; // This will hold all our samplers
    sceneMovement: SceneMovement;
    collide: boolean = false;
    objects: {[name: string]: Object3D} = {}; // This will hold all our 3D objects
    // JetPosition: vec3 = vec3.fromValues(0, 10, -10);   //The position of the Jet 
    // skyVec: vec3 = vec3.fromValues(0, 0, -300);
    time: number = 0; // The time in the scene
    
  light = {
        diffuse: vec3.fromValues(1,1,1),
        specular: vec3.fromValues(1,1,1),
        ambient: vec3.fromValues(1,1,1),
        direction: vec3.fromValues(0,-0.02,1)
    };

    public load(): void {
        this.game.loader.load({
            ["mrt.vert"]: { url: 'shaders/mrt.vert', type: 'text' }, // A vertex shader for multi-render-target rendering
            ["mrt.frag"]: { url: 'shaders/mrt.frag', type: 'text' }, // A fragment shader for multi-render-target rendering
            ["color.vert"]: { url: 'shaders/color.vert', type: 'text' }, // A vertex shader for multi-render-target rendering
            ["color.frag"]: { url: 'shaders/color.frag', type: 'text' }, // A fragment shader for multi-render-target rendering
            ["Jet-model"]: { url: 'models/Jet/Jet.obj', type: 'text' },
            ["Jet-texture"]: { url: 'models/Jet/Jet.png', type: 'image' },
            ["skyscraper-texture"]: { url: 'models/skyscraper.jpeg', type: 'image' },
            ["ground-texture"]: { url: 'models/road.png', type: 'image' },
            ["moon-texture"]: { url: 'models/moon.jpg', type: 'image' },
            ["grass-texture"]: { url: 'models/grass.jpg', type: 'image' }

        });
    }

    public start(): void {
        // This shader program will draw 3D objects into multiple render targets
        this.program = new ShaderProgram(this.gl);
        this.program.attach(this.game.loader.resources["mrt.vert"], this.gl.VERTEX_SHADER);
        this.program.attach(this.game.loader.resources["mrt.frag"], this.gl.FRAGMENT_SHADER);
        this.program.link();

        // this.program2 = new ShaderProgram(this.gl);
        // this.program2.attach(this.game.loader.resources["color.vert"], this.gl.VERTEX_SHADER);
        // this.program2.attach(this.game.loader.resources["color.frag"], this.gl.FRAGMENT_SHADER);
        // this.program2.link();

        // We load the 3D models here
        this.meshes['ground'] = MeshUtils.Plane(this.gl, { min: [0, 0], max: [1, 1] });
        this.meshes['grass1'] = MeshUtils.Plane(this.gl, { min: [0, 0], max: [15, 15] });
        this.meshes['grass2'] = MeshUtils.Plane(this.gl, { min: [0, 0], max: [15, 15] });
        
        this.meshes['Jet'] = MeshUtils.LoadOBJMesh(this.gl, this.game.loader.resources["Jet-model"]);
        this.meshes['skyscraper'] = MeshUtils.Cube(this.gl);
        this.meshes['Jet-Cube'] = MeshUtils.Cube(this.gl);
        this.meshes['moon'] = MeshUtils.Sphere(this.gl);

        this.textures['ground'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['ground-texture']);
        this.textures['grass'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['grass-texture']);
        // Load the Jet texture
        this.textures['Jet'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['Jet-texture']);
        this.textures['skyscraper'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['skyscraper-texture']);
        this.textures['Jet-Cube'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['skyscraper-texture']);
        this.textures['moon'] = TextureUtils.LoadImage(this.gl, this.game.loader.resources['moon-texture']);

        // Create a regular sampler for textures rendered on the scene objects
        this.sampler = this.gl.createSampler();
        this.gl.samplerParameteri(this.sampler, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.samplerParameteri(this.sampler, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.samplerParameteri(this.sampler, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.samplerParameteri(this.sampler, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);


        // Create a camera and a controller for it
        this.camera = new Camera();
        this.camera.type = 'perspective';
        this.camera.position = vec3.fromValues(-0.04219997301697731, 30.992820739746094, 2.915210485458374);
        this.camera.direction = vec3.fromValues(0.02268522791564464, -0.4189218580722809, -0.9077388644218445);
        this.camera.aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
        this.controller = new FlyCameraController(this.camera, this.game.input);
        this.controller.movementSensitivity = 0.01;
        this.controller.fastMovementSensitivity = 0.1; // If you press Shift, the camera will move 10x faster

        // Enable backface culling
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.frontFace(this.gl.CCW);
        // Enable depth testing
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

       this.objects['ground'] = {
            mesh: this.meshes['ground'],
            texture: this.textures['ground'],
            tint: [1, 1, 1, 1],
            Position: vec3.fromValues(0,0,-1500),
            Scale: vec3.fromValues(30, 1, 1500),
            ModelMatrix: mat4.create(),
            material: {
                diffuse: vec3.fromValues(0.5,0.5,0.5),
                specular: vec3.fromValues(0.4,0.4,0.4),
                ambient: vec3.fromValues(0.05,0.05,0.05),
                shininess: 200
            }
        };
                
        this.objects['grass1'] = {
            mesh: this.meshes['grass1'],
            texture: this.textures['grass'],
            tint: [1, 1, 1, 1],
            Position: vec3.fromValues(-230,0,-1500),
            Scale: vec3.fromValues(200, 1, 1500),
            ModelMatrix: mat4.create(),
            material: {
                diffuse: vec3.fromValues(0.251,0.251,0.251),
                specular: vec3.fromValues(0.4,0.4,0.4),
                ambient: vec3.fromValues(0,0,0),
                shininess: 20
            }
        };

        this.objects['grass2'] = {
            mesh: this.meshes['grass2'],
            texture: this.textures['grass'],
            tint: [1, 1, 1, 1],
            Position: vec3.fromValues(230,0,-1500),
            Scale: vec3.fromValues(200, 1, 1500),
            ModelMatrix: mat4.create(),
            material: {
                diffuse: vec3.fromValues(0.251,0.251,0.251),
                specular: vec3.fromValues(0.4,0.4,0.4),
                ambient: vec3.fromValues(0,0,0),
                shininess: 20
            }
        };
                     
        this.objects['moon'] = {
            mesh: this.meshes['moon'],
            texture: this.textures['moon'],
            tint: [1,1,1,1],
            Position: vec3.fromValues(0,190,-1000),
            Scale: vec3.fromValues(200, 190, 200),
            ModelMatrix: mat4.create(),
            material: {
                diffuse: vec3.fromValues(1.0,1.0,1.0),
                specular: vec3.fromValues(0.8,0.8,0.8),
                ambient: vec3.fromValues(0.2,0.2,0.2),
                shininess: 20
            }
        };

        this.objects['Jet'] = {
            mesh: this.meshes['Jet'],
            texture: this.textures['Jet'],
            tint: [1,1,1,1],
            Position: vec3.fromValues(0, 10, -10),
            Scale: vec3.fromValues(1, 1, 1),
            ModelMatrix: mat4.create(),
            material: {
                diffuse: vec3.fromValues(0.1,0.1,0.1),
                specular: vec3.fromValues(0.5,0.5,0.5),
                ambient: vec3.fromValues(0.1,0.1,0.1),
                shininess: 2
            }
        };

        // this.objects['skyscraper'] = {
        //     mesh: this.meshes['skyscraper'],
        //     texture: this.textures['skyscraper'],
        //     tint: [1,1,1,1],
        //     Position: vec3.fromValues(Math.random()*30,0,-300),
        //     Scale: vec3.fromValues(5,35,5),
        //     ModelMatrix: mat4.create(),
        //     material: {
        //         diffuse: vec3.fromValues(0.1,0.1,0.1),
        //         specular: vec3.fromValues(0.5,0.5,0.5),
        //         ambient: vec3.fromValues(0,0,0),
        //         shininess: 2
        //     }
        // };

        // this.objects['Jet-Cube'] = {
        //     mesh: this.meshes['Jet-Cube'],
        //     texture: this.textures['skyscraper'],
        //     tint: [1,1,1,1],
        //     Position: vec3.fromValues(0, 10, -10),
        //     Scale: vec3.fromValues(2.7, 3, 3.8),
        //     ModelMatrix: mat4.create(),
        //     material: {
        //         diffuse: vec3.fromValues(0.1,0.1,0.1),
        //         specular: vec3.fromValues(0.5,0.5,0.5),
        //         ambient: vec3.fromValues(0.1,0.1,0.1),
        //         shininess: 2
        //     }
        // };
        //generating skyscrapers
        for (let i = 0; i < 9; i++) {
            let j = Math.floor(Math.random()*10);

            this.objects['skyscraper' + i.toString()] = {
                mesh: this.meshes['skyscraper'],
                texture: this.textures['skyscraper'],
                tint: [1,1,1,1],
                Position:vec3.fromValues(Math.pow(-1, j)*27*Math.random(),0,-130*i-500),
                Scale: vec3.fromValues(5, 35, 5),
                ModelMatrix: mat4.create(),
                material: {
                    diffuse: vec3.fromValues(0.1,0.1,0.1),
                    specular: vec3.fromValues(0.5,0.5,0.5),
                    ambient: vec3.fromValues(0,0,0),
                    shininess: 2
                }

            }
            

            
            
        }
       

        for(let key in this.objects){
            let obj = this.objects[key];
            mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, this.objects[key].Position);
            mat4.scale(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, this.objects[key].Scale);
        
        }



        mat4.rotate(this.objects['Jet'].ModelMatrix, this.objects['Jet'].ModelMatrix, -Math.PI, [0, 1, 0]);
        


        
        // mat4.scale(this.objects['skyscraper'].ModelMatrix, this.objects['skyscraper'].ModelMatrix, vec3.fromValues(5, 35, 5));
        // mat4.translate(this.objects['skyscraper'].ModelMatrix, this.objects['skyscraper'].ModelMatrix, this.skyVec);
        
        this.sceneMovement = new SceneMovement(this.objects, this.game.input);
        // this.gl.clearColor(0.53,0.81,0.92,1);
        this.gl.clearColor(0.114,0.1265625,0.1617,1);

    }

    public draw(deltaTime: number): void {

        // this.controller.update(deltaTime);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.time += deltaTime;


        this.program.use();

        this.program.setUniformMatrix4fv("VP", false, this.camera.ViewProjectionMatrix); // Send the View Projection matrix
        this.program.setUniform3f("cam_position", this.camera.position);
  
        this.program.setUniform3f("light.diffuse", this.light.diffuse);
        this.program.setUniform3f("light.specular", this.light.specular);
        this.program.setUniform3f("light.ambient", this.light.ambient);
        this.program.setUniform3f("light.direction", vec3.normalize(vec3.create(), this.light.direction));
        console.log("collide", this.collide);
        // For each object, setup the shader uniforms then draw
        for(let key in this.objects){
            let obj = this.objects[key];
            if(!this.collide) this.collide = this.sceneMovement.update(deltaTime, key);
            this.program.setUniformMatrix4fv("M", false, obj.ModelMatrix); // Send the model matrix of the object in the current frame

            this.program.setUniformMatrix4fv("M_it", true, mat4.invert(mat4.create(), obj.ModelMatrix));
            this.program.setUniform3f("material.diffuse", obj.material.diffuse);
            this.program.setUniform3f("material.specular", obj.material.specular);
            this.program.setUniform3f("material.ambient", obj.material.ambient);
            this.program.setUniform1f("material.shininess", obj.material.shininess);
            if(this.collide && key == "Jet") obj.tint = [(Math.sin(this.time) + 1)/2, 0, 0, 1];
            this.program.setUniform4f("tint", obj.tint); // Send the color tint
            this.gl.activeTexture(this.gl.TEXTURE0); // Bind the texture and sampler to unit 0
            this.gl.bindTexture(this.gl.TEXTURE_2D, obj.texture);
            this.program.setUniform1i('texture_sampler', 0);
            this.gl.bindSampler(0, this.sampler);
            // obj.mesh.draw((key == "Jet-Cube")? this.gl.POINTS:this.gl.TRIANGLES); // Draw the object mesh
            obj.mesh.draw(this.gl.TRIANGLES); // Draw the object mesh
        }
        
        // this.program2.use();
        // let MVP = mat4.clone(this.camera.ViewProjectionMatrix);
        // mat4.mul(MVP, MVP, this.objects["Jet-Cube"].ModelMatrix);
        // this.program2.setUniformMatrix4fv("MVP", false, MVP);
        // this.program2.setUniformMatrix4fv("tint", false, mat4.create());
        // this.objects["Jet-Cube"].mesh.draw(this.gl.LINES);

    }

    public end(): void {
        // Clean memory
        for (let key in this.meshes)
            this.meshes[key].dispose();
        this.meshes = {};
        for (let key in this.textures)
            this.gl.deleteTexture(this.textures[key]);
        this.textures = {};
    }

}