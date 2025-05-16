import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(-37, -43, 1); // İstediğiniz pozisyonu ayarlayabilirsiniz

export default class Kademe {
  constructor({ scene, resources, objects, physics, debug, rotateX = 0, rotateY = 0, rotateZ = 0 }) {
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

    this.KademeCollision();
    this._buildModel();
    this.scene.add(this.container);
  }

  _buildModel() {
    const gltf = this.resources.items.kademe;
    if (!gltf || !gltf.scene) {
      console.error('Kademe modeli bulunamadı');
      return;
    }

    // Modeli klonla ve malzemeleri kopyala
    const model = gltf.scene.clone(true);
    
    // model boyutu
    model.scale.set(1, 1, 1);
    
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



    // Obje sistemine ekle
    if (this.objects) {
      const children = model.children.slice();
      const objectEntry = this.objects.add({
        base: { children },
        collision: { children },
        offset: this.position.clone(),
        mass: 0
      });
      if (objectEntry.container) {
        this.container.add(objectEntry.container);
      }
    }
  }


  KademeCollision() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-37.2, -43.3, 0)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 7.9  // X ekseni genişliği
    const columnHeight = 7.9 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7    // Z ekseni derinliği
    
    // Kolon görsel temsili oluştur
    const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0x660099, // Yeşil kolon
      wireframe: true,
      transparent: true,
      opacity: 0
    })
    
    this.columnMesh = new THREE.Mesh(columnGeometry, columnMaterial)
    
    // Kolonu doğrudan sahneye ekle
    this.columnMesh.position.copy(columnPosition)
    
    // Kolona rotasyon ekle
    this.columnMesh.rotation.set(columnRotateX, columnRotateY, columnRotateZ)
    
    this.scene.add(this.columnMesh)
    
    // Kolon için fizik gövdesi
    const columnShape = new CANNON.Box(
      new CANNON.Vec3(columnWidth/2, columnHeight/2, columnDepth/2)
    )
    
    // Fizik gövdesi oluştur
    this.columnBody = new CANNON.Body({
      mass: 0, // Statik nesne
      position: new CANNON.Vec3(
        columnPosition.x,
        columnPosition.y,
        columnPosition.z
      ),
      material: this.physics.materials ? this.physics.materials.items.floor : undefined
    })
    
    // Fizik gövdesine rotasyon ekle
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(columnRotateX, columnRotateY, columnRotateZ, 'XYZ')
    this.columnBody.quaternion.copy(quat)
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    

  }
} 