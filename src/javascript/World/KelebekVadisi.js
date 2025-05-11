import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(52, -7, 1); // Kelebek Vadisi konumu (z=1 olarak ayarlandı, platform kalınlığı kadar)

export default class KelebekVadisi {
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
    
    // Platform
    this.platform = null;

    this._buildModel();
    this._createPlatform(); // Platform eklendi
    this.scene.add(this.container);
  }

  _buildModel() {
    const gltf = this.resources.items.kelebekVadisi;
    if (!gltf || !gltf.scene) {
      console.error('Kelebek Vadisi modeli bulunamadı');
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

    // Model pozisyonu ve dönüşü - z pozisyonunu güncelledik
    // Modelin pozisyonu şu anda z=1 olacak şekilde (platform yüksekliği)
    // Platform _createPlatform metodunda oluşturulacak
    const modelPosition = this.position.clone();
    
    model.position.copy(modelPosition);
    model.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    this.container.add(model);

    // Bounding box hesapla
    model.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());

    // Fizik gövdesi oluştur - model pozisyonunu kullan
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const boxShape = new CANNON.Box(halfExtents);

    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(modelPosition.x, modelPosition.y, modelPosition.z), // Güncellenmiş model pozisyonu
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
        offset: modelPosition.clone(),
        mass: 0
      });
      objectEntry.collision = { body };
      if (objectEntry.container) {
        this.container.add(objectEntry.container);
      }
    }
  }
  
  // Kare platform oluştur
  _createPlatform() {
    if (!this.scene) {
        console.warn('KelebekVadisi: scene parametresi verilmedi, platform eklenmeyecek.');
        return;
    }
    
    // Platform kalınlığı - bu değer hem platform hem de model için kullanılacak
    const platformThickness = 1;
    
    // Model için platform boyutu ve pozisyonu
    const platformSize = 15; // Kare platformun bir kenar uzunluğu
    const platformPosition = new THREE.Vector3(
        this.position.x,  // Modelin x pozisyonu
        this.position.y,  // Modelin y pozisyonu
        0                 // Platform z=0 noktasında olacak
    );
    
    // Kare platform oluştur
    const platformGeometry = new THREE.BoxGeometry(platformSize, platformSize, platformThickness); // Kare platform, kalınlık 1 birim
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080, // Gri
        metalness: 0.4,  // Metalik görünüm
        roughness: 0.6,  // Hafif mat yüzey
    });
    
    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.platform.position.copy(platformPosition);
    this.platform.rotation.x = Math.PI; // Yatay duruma getir
    this.platform.castShadow = true;
    this.platform.receiveShadow = true;
    
    this.container.add(this.platform);
    
    // Model pozisyonunu güncelle - platformun üstüne çıkart
    // Model pozisyonunu modelPosition değişkeni üzerinden yönetiyoruz,
    // ancak modeli platformun üzerine taşımak için pozisyonu direkt güncelliyoruz
    const modelOffset = platformThickness; // Platform kalınlığı kadar offset
    this.position.z = modelOffset; // Modelin z pozisyonunu platform kalınlığı kadar yükselt
    
    console.log('Kelebek Vadisi model pozisyonu güncellendi, z:', this.position.z);
    
    // Platform için fizik ekle
    if (this.physics) {
        // Platformun fiziksel boyutları - yarı boyutlar olarak tanımlanır
        const halfSize = platformSize / 2; // Kenar uzunluğunun yarısı
        const collisionHeight = 5; // Z boyutu yüksekliği
        
        // Platform pozisyonunu kullan, modelin kaydırılan pozisyonunu değil
        const platformBody = new CANNON.Body({
            mass: 0, // Statik nesne
            position: new CANNON.Vec3(
                platformPosition.x,
                platformPosition.y,
                platformPosition.z
            ),
            material: this.physics.materials.items.floor
        });
        
        // Kare platform şekli - BoxShape kullanılıyor
        const platformShape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, collisionHeight / 2)); // Yarı boyutlar
        
        platformBody.addShape(platformShape);
        
        // Platformu fizik dünyasına ekle
        this.physics.world.addBody(platformBody);
        
        console.log('Kelebek Vadisi için kare platform fizik gövdesi eklendi, boyut:', platformSize, 'yükseklik:', collisionHeight);
        console.log('Platform pozisyonu:', platformPosition);
        
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
            // Platform mesh pozisyonunu kullan
            debugMesh.position.copy(this.platform.position);
            debugMesh.rotation.copy(this.platform.rotation);
            
            this.container.add(debugMesh);
            console.log('Fizik gövdesi debug mesh güncellendi, pozisyon:', this.platform.position);
        }
    }
    
    console.log('Kelebek Vadisi için kare platform eklendi, boyut:', platformSize, 'pozisyon z:', platformPosition.z);
  }
} 