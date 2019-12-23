import Input from './input';
import { Key } from 'ts-key-enum';
import { vec3, mat4, quat } from 'gl-matrix';
import Mesh from '../common/mesh';

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

export default class SceneMovement {
    objects: {[name: string]: Object3D};
    input: Input;
    movementSensitivity: number = 0.001;
    fastMovementSensitivity: number = 0.01;
    Collide: boolean = false;
    JetXmin: number;
    JetZmin: number;
    JetXmax: number;
    JetZmax: number;
    rotateDir: number =-1; // 0 rotated to left ,1 rotated to right , -1 isn't rotated 

    constructor(objects: {[name: string]: Object3D}, input: Input){
        this.objects = objects;
        this.input = input;
        }
    public update(deltaTime: number, key:string) {
        


           //-------------------------------------------------jet contorller---------------------------------------------
           if(key == "Jet")
           {
                const movement = vec3.create();
                this.JetXmin = this.objects[key].Position[0] - 2.7;
                this.JetZmin = this.objects[key].Position[2] + 3.8;
                this.JetXmax = this.objects[key].Position[0] + 2.7;
                this.JetZmax = this.objects[key].Position[2] - 3.8;
                if(this.input.isKeyDown(Key.ArrowRight))
                { 
                    movement[0] += 1;
                    vec3.normalize(movement, movement);
                    movement[0] = 2*this.fastMovementSensitivity * deltaTime * movement[0];
                    const temp = vec3.create();
                    vec3.add(temp, this.objects[key].Position, movement);
                    if(temp[0] > 30 || temp[0] <-30)    return;
                    this.objects[key].Position[0] = temp[0];
                    movement[0] = -movement[0];
                        if(this.rotateDir!=1)//if not rotated right then rotate right 
                        {
                            //check if rotated left rotate 60 else rotate 30
                            if(this.rotateDir==0)
                            {
                                mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, -Math.PI/6, [0,0,-1]);                             
                                mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                                mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, -Math.PI/6, [0,0,-1]);                             
                            }
                            else
                            {

                                mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                                //rotate by 30
                                mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, -Math.PI/6, [0,0,-1]);                             
                            }         
                        this.rotateDir=1; 
                        }
                        else 
                        {
                            if(this.rotateDir==1)
                            {
                                mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, Math.PI/6, [0,0,-1]);
                                mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                                mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, -Math.PI/6, [0,0,-1]);
                            }
                            else {
                                //just translate
                                mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                            }       
                        }
                    }
                else if(this.input.isKeyDown(Key.ArrowLeft)) 
                {
                    movement[0] -= 1;         
                    vec3.normalize(movement, movement);
                    movement[0] = 2*this.fastMovementSensitivity * deltaTime * movement[0];
                    const temp = vec3.create();
                    vec3.add(temp, this.objects[key].Position, movement);
                    if(temp[0] > 30 || temp[0] <-30)    return;
                    this.objects[key].Position[0] = temp[0];
                    movement[0] = -movement[0];
                    if(this.rotateDir!=0)//if not rotated left then rotate left 
                    {
                        //check if rotated right rotate 60 else rotate 30
                        if(this.rotateDir==1)
                        {
                            mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, Math.PI/6, [0,0,-1]);                             
                            mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                            mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, Math.PI/6, [0,0,-1]);                             
                        }
                        else
                        {
                            mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                            //rotate by 30
                            mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, Math.PI/6, [0,0,-1]);
                        }
                        this.rotateDir=0; 
                    }
                    else 
                    {
                        if(this.rotateDir==0)
                            {    
                                mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, -Math.PI/6, [0,0,-1]);
                                mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                                mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, Math.PI/6, [0,0,-1]);
                            }
                            else {
                                //just translate
                                mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                            }       
                    }
                }
                else{
                    // if(this.input.isKeyDown(Key.ArrowDown)) movement[2] -= 1;
                    // if(this.input.isKeyDown(Key.ArrowUp)) movement[2] += 1;
                    // mat4.translate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix,movement);
                    // vec3.normalize(movement, movement);
                    // movement[2] = 2*this.fastMovementSensitivity * deltaTime * movement[2]
                    // vec3.add(this.objects[key].Position, this.objects[key].Position, movement);
                    //if rotated right rotate back else if rotated left rotate back 
                    if(this.rotateDir==1)
                    {
                        mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, Math.PI/6, [0,0,-1]);
                    }
                    else if(this.rotateDir==0) //if rotated to left
                    {  //rotate right by 30
                        mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, -Math.PI/6, [0,0,-1]);
                    }
                    this.rotateDir =-1; 
                }            
        }
           //-----------------------------------------------------------------------------------------------------------
   
        else if(key == "moon")
        {
            mat4.rotate(this.objects[key].ModelMatrix, this.objects[key].ModelMatrix, -Math.PI/10000 * deltaTime, [0,1,0]);
        }
        else if(key == 'ground' || key == 'grass1' || key == 'grass2')
        {
            const movement = vec3.create();
            movement[2] = 10;

            const temp = mat4.create();
            mat4.scale(temp, this.objects[key].ModelMatrix, vec3.inverse(vec3.create(), this.objects[key].Scale));    
            this.objects[key].Position[2] += movement[2];
            mat4.translate(temp, temp,movement);
            if(this.objects[key].Position[2] == -750) 
            {
                mat4.translate(temp, temp,[0,0,this.objects[key].Position[2]]); 
                this.objects[key].Position[2] = -1500
            }
            mat4.scale(temp, temp, this.objects[key].Scale);
            this.objects[key].ModelMatrix = mat4.clone(temp);            
        }
        else
        {
            for (let i = 0; i < 10; i++) 
            {
                const movement = vec3.create();
                movement[2] = 1;

                const temp = mat4.create();
                mat4.scale(temp, this.objects[key].ModelMatrix, vec3.inverse(vec3.create(), this.objects[key].Scale));    
                this.objects[key].Position[2] += movement[2];
                mat4.translate(temp, temp,movement);
                if(this.objects[key].Position[2] == 10) 
                {
                    mat4.translate(temp, temp,[0,0,-2010]); 
                    this.objects[key].Position[2] = -1000;
                }
                mat4.scale(temp, temp, this.objects[key].Scale);
                this.objects[key].ModelMatrix = mat4.clone(temp);            
                let buildingXmin = this.objects[key].Position[0] - this.objects[key].Scale[0];
                let buildingZmin = this.objects[key].Position[2] + this.objects[key].Scale[2];
                let buildingXmax = this.objects[key].Position[0] + this.objects[key].Scale[0];
                let buildingZmax = this.objects[key].Position[2] - this.objects[key].Scale[2];
                console.log(buildingXmin, buildingXmax, buildingZmin, buildingZmax);
                console.log(this.JetXmin, this.JetXmax, this.JetZmin, this.JetZmax);
                if(((this.JetXmax >=  buildingXmin && this.JetXmin <= buildingXmax) && (this.JetZmax <= buildingZmin && this.JetZmin > buildingZmin)))
                {
                    this.Collide = true;
                    return this.Collide;
                }    
            }
            

        }
        return this.Collide;

    }
}