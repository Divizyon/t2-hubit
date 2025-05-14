import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(-53, -48, 1.5); // İstenen konumu -53, -48 olarak değiştirdim

export default class SesOdasi {
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

    this.SesOdasiCollision()
    this.SesOdasiCollision2()
    this._buildModel();
    this.scene.add(this.container);
  }

  _buildModel() {
    const gltf = this.resources.items.sesOdasi;
    if (!gltf || !gltf.scene) {
      console.error('Ses odası modeli bulunamadı');
      return;
    }

    // Modeli klonla ve malzemeleri kopyala
    const model = gltf.scene.clone(true);
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

    // Obje sistemine ekle - sadece görsel olarak
    if (this.objects) {
      const children = model.children.slice();
      const objectEntry = this.objects.add({
        base: { children },
        offset: this.position.clone(),
        mass: 0
      });
      
      if (objectEntry.container) {
        this.container.add(objectEntry.container);
      }
    }
  }


  SesOdasiCollision() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-54.5, -45.9, 0.2) // Z eksenini yukarı kaldırdım (0 -> 0.2)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 6.1  // X ekseni genişliği
    const columnHeight = 2.4 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 6.5    // Z ekseni derinliği (7 -> 6.5)
    
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
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 
                'boyutlar:', columnWidth, columnHeight, columnDepth,
                'rotasyon (derece):', 
                THREE.MathUtils.radToDeg(columnRotateX),
                THREE.MathUtils.radToDeg(columnRotateY),
                THREE.MathUtils.radToDeg(columnRotateZ))
  }


  SesOdasiCollision2() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-57.4, -48, 0.2) // Z eksenini yukarı kaldırdım (0 -> 0.2)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 0.5  // X ekseni genişliği
    const columnHeight = 6.35 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 6.5    // Z ekseni derinliği (7 -> 6.5)
    
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
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 
                'boyutlar:', columnWidth, columnHeight, columnDepth,
                'rotasyon (derece):', 
                THREE.MathUtils.radToDeg(columnRotateX),
                THREE.MathUtils.radToDeg(columnRotateY),
                THREE.MathUtils.radToDeg(columnRotateZ))
  }





}

/* 

İndex.js dosyasında Divizyon'u oluşturmak için:
import Divizyon from './Divizyon';

this.setDivizyon()

  setDivizyon() {
  this.divizyon = new Divizyon({
    scene:     this.scene,
    resources: this.resources,
    physics:   this.physics,
    debug:     this.debugFolder,
    rotateX:   0,   // 
    rotateY:   0,
    rotateZ:   Math.PI / 2 // Y ekseninde 90 derece,
  });
}



*/