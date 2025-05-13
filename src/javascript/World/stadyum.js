import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(14, -32, -2.5); // Stadyum konumu
const SCALE_FACTOR = 1.15; // Ölçek faktörü - %15 büyütme

export default class Stadyum {
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

    this._buildModel();
    this.createPlatform();
    this.scene.add(this.container);
  }

  _buildModel() {
    const gltf = this.resources.items.stadyum;
    if (!gltf || !gltf.scene) {
      console.error('Stadyum modeli bulunamadı');
      return;
    }

    // Modeli klonla ve malzemeleri kopyala
    const model = gltf.scene.clone(true);
    
    // Modeli büyüt - scale faktörünü uygula
    model.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
    
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

    // Bounding box hesapla - ölçeklendirilmiş halde
    model.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());

    // Fizik gövdesi oluştur - ölçekli boyut değerlerini kullan
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const boxShape = new CANNON.Box(halfExtents);

    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(...this.position.toArray()),
      material: this.physics.materials.items.floor
    });

    // Dönüşü quaternion olarak ayarla
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ');
    body.quaternion.copy(quat);

    body.addShape(boxShape);
    this.physics.world.addBody(body);

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
  
  // Stadyumun altına platform ekleme metodu
  createPlatform() {
    if (!this.scene) {
      console.warn('Stadyum: scene parametresi verilmedi, platform eklenmeyecek.');
      return;
    }
    
    // Modeli alıp boyutlarını hesapla
    const gltf = this.resources.items.stadyum;
    if (!gltf || !gltf.scene) {
      console.error('Stadyum modeli bulunamadı, platform ölçüleri varsayılan olarak ayarlanacak');
      return;
    }
    
    // Stadyumun bounding box'ını hesapla - scale faktörünü dikkate alarak
    const tempModel = gltf.scene.clone();
    tempModel.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR); // Aynı scale faktörünü uygula
    tempModel.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(tempModel);
    const size = bbox.getSize(new THREE.Vector3());
    
    // Platform boyutlarını stadyumun boyutlarına göre ayarla
    const platformSize = Math.max(size.x, size.y) * 0.9; // Stadyumun en geniş kenarının %90'i
    const platformHeight = 1; // Platform yüksekliği
    
    // Platform geometrisi oluştur (kare platform)
    const platformGeometry = new THREE.BoxGeometry(platformSize, platformSize, platformHeight);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gri
      metalness: 0.5,  // Metalik değeri
      roughness: 0.5,  // Pürüzlülük değeri
    });
    
    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
    
    // Platformu stadyumun altına konumlandır
    this.platform.position.set(
      this.position.x,  // X pozisyonu stadyumla aynı
      this.position.y,  // Y pozisyonu stadyumla aynı
      this.position.z + 2.5  // Z pozisyonu stadyumla aynı (düzeltilmiş konum)
    );
    
    // Rotasyonu sıfırla
    this.platform.rotation.x = 0;
    
    this.platform.castShadow = true;
    this.platform.receiveShadow = true;
    
    this.scene.add(this.platform);
    
    // Platform için fizik ekle
    if (this.physics) {
      // Platformun fiziksel boyutları - yarı boyutlar olarak tanımlanır
      const halfSize = platformSize / 2; // Kenar uzunluğunun yarısı
      const collisionHeight = 5; // Fizik çarpışması için yükseklik
      
      const platformBody = new CANNON.Body({
        mass: 0, // Statik nesne
        position: new CANNON.Vec3(
          this.platform.position.x,
          this.platform.position.y,
          this.platform.position.z
        ),
        material: this.physics.materials.items.floor
      });
      
      // Kare platform şekli
      const platformShape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, collisionHeight / 2));
      platformBody.addShape(platformShape);
      
      // Platformu fizik dünyasına ekle
      this.physics.world.addBody(platformBody);
      
      console.log('Stadyum platform fizik gövdesi eklendi, boyut:', platformSize, 'yükseklik:', collisionHeight);
      
      // Debug görselleştirme - fizik gövdesini görselleştir (eğer debug modu aktifse)
      if (this.debug) {
        const debugGeometry = new THREE.BoxGeometry(platformSize, platformSize, collisionHeight);
        const debugMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xff0000,
          wireframe: true,
          opacity: 0.5,
          transparent: true
        });
        
        const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        debugMesh.position.copy(this.platform.position);
        debugMesh.rotation.copy(this.platform.rotation);
        
        this.scene.add(debugMesh);
        console.log('Fizik gövdesi debug mesh eklendi');
      }
    }
    
    console.log('Stadyum için platform eklendi, boyut:', platformSize, 'fizik yükseklik:', 5, 'ölçek faktörü:', SCALE_FACTOR);
  }
} 