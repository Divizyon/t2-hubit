import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(54, -37, 0); // Artık doğru yerde tanımlandı

export default class GenclikMerkezi {
  constructor({ 
    scene, 
    resources, 
    objects, 
    physics, 
    debug, 
    rotateX = 90, 
    rotateY = 0, 
    rotateZ = 0,
    // Özel collision ayarları
    collisionPosition = new THREE.Vector3(54, -36.5, 2), // Varsayılan özel konum
    collisionSize = new THREE.Vector3(4.9, 3.4, 5) // Özel boyut (null ise otomatik hesaplanır)
  }) {
    this.scene = scene;
    this.resources = resources;
    this.objects = objects;
    this.physics = physics;
    this.debug = debug;

    this.rotateX = rotateX;
    this.rotateY = rotateY;
    this.rotateZ = -3;

    this.container = new THREE.Object3D();
    this.position = DEFAULT_POSITION.clone();
    
    // Collision için özel ayarları kaydet
    this.collisionPosition = collisionPosition || this.position.clone();
    this.collisionSize = collisionSize;
    this.collisionMesh = null; // Referans için

    this._buildModel();
    this.scene.add(this.container);
    
    // Debug kontrolü ekle (eğer debug modu varsa)
    if (this.debug) {
      this.setupDebugControls();
    }
  }

  _buildModel() {
    const gltf = this.resources.items.CalisanGenclikMerkezi;
    if (!gltf || !gltf.scene) {
      console.error('Divizyon bina modeli bulunamadı');
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

    // Bounding box hesapla
    model.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());

    // Fizik gövdesi oluştur - özel boyut veya otomatik hesaplanan boyut
    let halfExtents;
    if (this.collisionSize) {
      // Özel boyut kullanılıyor
      halfExtents = new CANNON.Vec3(
        this.collisionSize.x / 2, 
        this.collisionSize.y / 2, 
        this.collisionSize.z / 2
      );
    } else {
      // Otomatik hesaplanan boyut
      halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    }
    
    const boxShape = new CANNON.Box(halfExtents);

    const body = new CANNON.Body({
      mass: 0,
      // Özel collision pozisyonu
      position: new CANNON.Vec3(
        this.collisionPosition.x, 
        this.collisionPosition.y, 
        this.collisionPosition.z
      ),
      material: this.physics.materials.items.floor
    });

    // Dönüşü quaternion olarak ayarla
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ');
    body.quaternion.copy(quat);

    body.addShape(boxShape);
    this.physics.world.addBody(body);
 
    // Görünür collision mesh ekle
    const collisionGeometry = new THREE.BoxGeometry(
      halfExtents.x * 2, 
      halfExtents.y * 2, 
      halfExtents.z * 2
    );
    
    const collisionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      opacity: 0, // Tamamen saydam yapıldı
      transparent: true,
      visible: false // Görünürlük tamamen kapatıldı
    });
    
    this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    this.collisionMesh.position.copy(this.collisionPosition);
    this.collisionMesh.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    this.scene.add(this.collisionMesh);
    
    console.log('Çalışan Gençlik Merkezi collision mesh eklendi:', 
      'Pozisyon:', this.collisionPosition, 
      'Boyut:', new THREE.Vector3(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2)
    );

    // Obje sistemine ekle
    if (this.objects) {
      const children = model.children.slice();
      const objectEntry = this.objects.add({
        base: { children },
        collision: { children },
        offset: this.position.clone(),
        mass: 0
      });
      objectEntry.collision = { body };
      if (objectEntry.container) {
        this.container.add(objectEntry.container);
      }
    }
  }
  
  // Collision mesh pozisyonunu güncelle
  updateCollisionPosition(newPosition) {
    if (!this.collisionMesh) return;
    
    this.collisionPosition.copy(newPosition);
    this.collisionMesh.position.copy(newPosition);
    
    console.log('Collision pozisyonu güncellendi:', newPosition);
  }
  
  // Collision mesh boyutunu güncelle
  updateCollisionSize(newSize) {
    if (!this.collisionMesh) return;
    
    // Eski mesh'i kaldır
    this.scene.remove(this.collisionMesh);
    
    // Yeni collision geometrisi oluştur
    const collisionGeometry = new THREE.BoxGeometry(
      newSize.x, 
      newSize.y, 
      newSize.z
    );
    
    // Mevcut materyal ile yeni mesh oluştur
    const material = this.collisionMesh.material;
    this.collisionMesh = new THREE.Mesh(collisionGeometry, material);
    this.collisionMesh.position.copy(this.collisionPosition);
    this.collisionMesh.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    
    // Yeni mesh'i sahneye ekle
    this.scene.add(this.collisionMesh);
    
    console.log('Collision boyutu güncellendi:', newSize);
  }
  
  // Debug kontrolleri
  setupDebugControls() {
    if (!this.debug.addFolder) return;
    
    const folder = this.debug.addFolder('Gençlik Merkezi Collision');
    
    // Pozisyon kontrolleri
    folder.add(this.collisionPosition, 'x').min(-100).max(100).step(0.1).name('X Pozisyon').onChange(() => {
      if (this.collisionMesh) this.collisionMesh.position.x = this.collisionPosition.x;
    });
    
    folder.add(this.collisionPosition, 'y').min(-100).max(100).step(0.1).name('Y Pozisyon').onChange(() => {
      if (this.collisionMesh) this.collisionMesh.position.y = this.collisionPosition.y;
    });
    
    folder.add(this.collisionPosition, 'z').min(-100).max(100).step(0.1).name('Z Pozisyon').onChange(() => {
      if (this.collisionMesh) this.collisionMesh.position.z = this.collisionPosition.z;
    });
    
    // Görünürlük kontrolü
    const visibilityControl = { visible: true };
    folder.add(visibilityControl, 'visible').name('Göster/Gizle').onChange((value) => {
      if (this.collisionMesh) this.collisionMesh.visible = value;
    });
  }
}

/* 
// --------------------------------------------------------
// NASIL KULLANILIR:
// --------------------------------------------------------

// 1. Özel Collision Pozisyonu ve Boyutu ile Oluştur:
this.genclikMerkezi = new GenclikMerkezi({
  scene: this.scene,
  resources: this.resources,
  physics: this.physics,
  debug: this.debugFolder,
  // Özel collision pozisyonu
  collisionPosition: new THREE.Vector3(54, -40, 0),
  // Özel collision boyutu
  collisionSize: new THREE.Vector3(10, 15, 5)
});

// 2. Çalışma Zamanında Pozisyon Değiştir:
this.genclikMerkezi.updateCollisionPosition(new THREE.Vector3(60, -45, 2));

// 3. Çalışma Zamanında Boyut Değiştir:
this.genclikMerkezi.updateCollisionSize(new THREE.Vector3(12, 12, 12));

// --------------------------------------------------------
*/