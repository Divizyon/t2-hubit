import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(-8, -18, 0); // Trafik Lambası konumu

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
} 