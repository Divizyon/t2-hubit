import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(-42, -20, 1.6); // Konser alanı konumu

export default class KonserAlani {
  constructor({ scene, resources, objects, physics, debug, rotateX = 0, rotateY = 0, rotateZ = 0}) {
    this.scene = scene;
    this.resources = resources;
    this.objects = objects;
    this.physics = physics;
    this.debug = debug;

    this.rotateX = rotateX;
    this.rotateY = rotateY;
    this.rotateZ = rotateZ;

    this.container = new THREE.Object3D();
    this.position = DEFAULT_POSITION.clone();

    this._buildModel();
    this.scene.add(this.container);
  }

  _buildModel() {
    const gltf = this.resources.items.konserAlani;
    if (!gltf || !gltf.scene) {
      console.error('Konser Alanı modeli bulunamadı');
      return;
    }

    // Modeli klonla ve malzemeleri kopyala
    const model = gltf.scene.clone(true);
    
    // Modeli 2 katına büyüt
    model.scale.set(2, 2, 2);
    
    model.traverse(child => {
      if (child.isMesh) {
        const origMat = child.material;
        const mat = origMat.clone();
        if (origMat.map) mat.map = origMat.map;
        if (origMat.normalMap) mat.normalMap = origMat.normalMap;
        if (origMat.roughnessMap) mat.roughnessMap = origMat.roughnessMap;
        if (origMat.metalnessMap) mat.metalnessMap = origMat.metalnessMap;
        mat.needsUpdate = true;
        child.material = mat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Model pozisyonu ve dönüşü
    model.position.copy(this.position);
    model.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    this.container.add(model);
  }
}
