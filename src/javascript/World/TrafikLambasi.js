import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(-11, -8, 0); // Trafik Lambası konumu

export default class TrafikLambasi {
  constructor({ scene, resources, objects, physics, debug, rotateX = 0, rotateY = 0, rotateZ = 0 }) {
    this.scene = scene;
    this.resources = resources;
    this.objects = objects;
    this.physics = physics;
    this.debug = debug;

    this.rotateX = rotateX;
    this.rotateY = rotateY;
    this.rotateZ = rotateZ -3;

    this.container = new THREE.Object3D();
    this.position = DEFAULT_POSITION.clone();

    this._buildModel();
    this.scene.add(this.container);
    this.addColumnCollision()
  }

  _buildModel() {
    const gltf = this.resources.items.trafikLambasi;
    if (!gltf || !gltf.scene) {
      console.error('Trafik Lambası modeli bulunamadı');
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
    
    // Ölçeği ayarla
    model.scale.set(2, 2, 2); // Trafik lambası için uygun ölçek
    
    this.container.add(model);

    // Bounding box hesapla
    model.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());

    
    
    // Işıklar için animasyon değişkenleri
    this.lights = {
      red: null,
      yellow: null,
      green: null
    };
    
    // Trafik lambası ışıklarını bul
    model.traverse(child => {
      if (child.isMesh) {
        if (child.name.includes('red') || child.material.name.includes('red')) {
          this.lights.red = child;
        } else if (child.name.includes('yellow') || child.material.name.includes('yellow')) {
          this.lights.yellow = child;
        } else if (child.name.includes('green') || child.material.name.includes('green')) {
          this.lights.green = child;
        }
      }
    });
    
    // Işıkları başlangıçta ayarla
    this._setLightState('red');
    
    // Trafik lambası döngüsünü başlat
    this._startLightCycle();
  }
  
  _setLightState(activeLight) {
    // Tüm ışıkları söndür
    if (this.lights.red) {
      this.lights.red.material.emissive = new THREE.Color(0x330000);
      this.lights.red.material.emissiveIntensity = 0.2;
    }
    if (this.lights.yellow) {
      this.lights.yellow.material.emissive = new THREE.Color(0x333300);
      this.lights.yellow.material.emissiveIntensity = 0.2;
    }
    if (this.lights.green) {
      this.lights.green.material.emissive = new THREE.Color(0x003300);
      this.lights.green.material.emissiveIntensity = 0.2;
    }
    
    // Aktif ışığı yak
    if (activeLight === 'red' && this.lights.red) {
      this.lights.red.material.emissive = new THREE.Color(0xff0000);
      this.lights.red.material.emissiveIntensity = 1.0;
    } else if (activeLight === 'yellow' && this.lights.yellow) {
      this.lights.yellow.material.emissive = new THREE.Color(0xffff00);
      this.lights.yellow.material.emissiveIntensity = 1.0;
    } else if (activeLight === 'green' && this.lights.green) {
      this.lights.green.material.emissive = new THREE.Color(0x00ff00);
      this.lights.green.material.emissiveIntensity = 1.0;
    }
  }
  
  _startLightCycle() {
    // Trafik lambası döngüsü: Kırmızı -> Yeşil -> Sarı -> Kırmızı
    this._setLightState('red');
    
    setTimeout(() => {
      this._setLightState('green');
      
      setTimeout(() => {
        this._setLightState('yellow');
        
        setTimeout(() => {
          this._startLightCycle(); // Döngüyü tekrar başlat
        }, 2000); // Sarı ışık süresi (2 saniye)
        
      }, 5000); // Yeşil ışık süresi (5 saniye)
      
    }, 8000); // Kırmızı ışık süresi (8 saniye)
  }

  addColumnCollision() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-11, -8, 0)
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 0.4    // X ekseni genişliği
    const columnHeight = 0.4   // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7      // Z ekseni derinliği
    
    // Kolon görsel temsili oluştur
    const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Yeşil kolon
      wireframe: true,
      transparent: true,
      opacity: 0
    })
    
    this.columnMesh = new THREE.Mesh(columnGeometry, columnMaterial)
    
    // Kolonu doğrudan sahneye ekle
    this.columnMesh.position.copy(columnPosition)
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
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 'boyutlar:', columnWidth, columnHeight, columnDepth)
  }
} 