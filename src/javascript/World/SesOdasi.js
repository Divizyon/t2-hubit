import * as THREE from 'three';
import CANNON from 'cannon';

export default class SesOdasi {
  constructor({ scene, resources, objects, physics, debug, areas, materials, rotateX = 0, rotateY = 0, rotateZ = 0, position = null }) {
    // Özellikleri kaydet
    this.scene = scene;
    this.resources = resources;
    this.objects = objects;
    this.physics = physics;
    this.debug = debug;
    this.areas = areas;
    this.materials = materials;
    
    // Döndürme değerlerini (radyan) ayarla
    this.rotateX = rotateX;
    this.rotateY = rotateY;
    this.rotateZ = rotateZ;
    
    // Pozisyon değeri, eğer verilmediyse varsayılan olarak -65, -40, 0 kullan
    this.position = position || new THREE.Vector3(-55, -50, 0);
    
    // Ana konteyner oluştur
    this.container = new THREE.Object3D();
    this.container.matrixAutoUpdate = false;
    this.container.updateMatrix();
    this.scene.add(this.container);
    
    // Model oluştur
    this._buildModel();
    
    // Etkileşimli buton ekle
    if (this.areas && this.materials) {
      this.setupButton();
    }
  }
  
  _buildModel() {
    const gltf = this.resources.items.sesOdasi;
    if (!gltf || !gltf.scene) {
      console.error('Ses Odası modeli bulunamadı');
      return;
    }
    
    // Modeli klonla ve malzemeleri kopyala
    const model = gltf.scene.clone(true);
    
    // Model boyutunu ayarla - eğer gerekirse ölçeklendir
    model.scale.set(0.6, 0.6, 0.6);
    
    // Modelin materyallerini işle ve beyaz objeleri araştır
    model.traverse(child => {
      if (child.isMesh) {
        console.log('Mesh bulundu:', child.name);
        const origMat = child.material;
        const mat = origMat.clone();
        
        // Eğer beyaz bir materyal ise logla ve gizle
        if (origMat.color && (origMat.color.r > 0.8 && origMat.color.g > 0.8 && origMat.color.b > 0.8)) {
          console.log('Beyaz materyal bulundu ve gizleniyor:', child.name);
          child.visible = false; // Beyaz objeyi gizle
        }
        
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
    
    // Fizik gövdesi oluştur
    if (this.physics) {
      const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
      const boxShape = new CANNON.Box(halfExtents);
      
      const body = new CANNON.Body({
        mass: 0, // Statik nesne
        position: new CANNON.Vec3(...this.position.toArray()),
        material: this.physics.materials.items.floor
      });
      
      // Dönüşü quaternion olarak ayarla
      const quat = new CANNON.Quaternion();
      quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ');
      body.quaternion.copy(quat);
      
      body.addShape(boxShape);
      this.physics.world.addBody(body);
    }
    
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
  
  setupButton() {
    // Buton konumu - modelin yanına taşı
    this.buttonPosition = new THREE.Vector3(
      this.position.x - 3, // Modelin 3 birim soluna
      this.position.y,     // Aynı y konumu
      this.position.z      // Aynı z konumu
    );
    
    this.button = {};
    
    // Container
    this.button.container = new THREE.Object3D();
    this.button.container.position.copy(this.buttonPosition);
    this.button.container.matrixAutoUpdate = false;
    this.button.container.updateMatrix();
    this.scene.add(this.button.container);
    
    // Alan çerçevesi
    if (this.materials && this.materials.items && this.materials.items.areaFloorBorder) {
      const floorBorderGeometry = new THREE.CircleGeometry(1.2, 32);
      this.button.floorBorder = new THREE.Mesh(
        floorBorderGeometry,
        this.materials.items.areaFloorBorder.clone()
      );
      this.button.floorBorder.rotation.x = -Math.PI / 2;
      this.button.floorBorder.position.z = 0.1;
      this.button.floorBorder.matrixAutoUpdate = false;
      this.button.floorBorder.updateMatrix();
      this.button.container.add(this.button.floorBorder);
    }
    
    // Etkileşimli alan
    if (this.areas) {
      this.interactiveArea = this.areas.add({
        position: new THREE.Vector2(this.buttonPosition.x, this.buttonPosition.y),
        halfExtents: new THREE.Vector2(1.2, 1.2),
        floorShadowType: 'primary',
        debug: false
      });
      
      // Bilgi paneli oluştur
      this.infoPanel = document.createElement('div');
      this.infoPanel.style.position = 'absolute';
      this.infoPanel.style.bottom = '20px';
      this.infoPanel.style.left = '50%';
      this.infoPanel.style.transform = 'translateX(-50%)';
      this.infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      this.infoPanel.style.color = 'white';
      this.infoPanel.style.padding = '15px';
      this.infoPanel.style.borderRadius = '10px';
      this.infoPanel.style.fontFamily = 'Arial, sans-serif';
      this.infoPanel.style.zIndex = '1000';
      this.infoPanel.style.display = 'none';
      this.infoPanel.style.transition = 'opacity 0.3s ease-in-out';
      this.infoPanel.style.textAlign = 'center';
      this.infoPanel.style.maxWidth = '400px';
      
      // Bilgi paneli içeriği
      this.infoPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #4285f4;">Ses Odası</h3>
        <p style="margin: 0 0 10px 0;">Ses Odası, müzik prodüksiyonu ve kayıt için tasarlanmış özel bir stüdyodur.</p>
        <p style="margin: 0 0 10px 0;">Akustik özellikleri ve ses yalıtımı ile profesyonel kayıt imkanı sunar.</p>
      `;
      
      document.body.appendChild(this.infoPanel);
      
      // Etkileşimli alan olayları
      this.interactiveArea.on('in', () => {
        // Bilgi panelini göster
        this.infoPanel.style.display = 'block';
        this.infoPanel.style.opacity = '0';
        setTimeout(() => {
          this.infoPanel.style.opacity = '1';
        }, 10);
      });
      
      this.interactiveArea.on('out', () => {
        // Bilgi panelini gizle
        this.infoPanel.style.opacity = '0';
        setTimeout(() => {
          this.infoPanel.style.display = 'none';
        }, 300);
      });
    }
  }
} 