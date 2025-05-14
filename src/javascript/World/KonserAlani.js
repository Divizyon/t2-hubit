import * as THREE from 'three';
import CANNON from 'cannon';

const DEFAULT_POSITION = new THREE.Vector3(-42, -20, 3); // Konser alanı konumu

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

    // Dik üçgen collision ayarları
    this.rightTriangleConfig = {
      // Boyutlar
      width: 2,         // X genişliği
      height: 2,        // Y yüksekliği
      depth: 6.5,         // Z derinliği
      
      // Konum (model konumuna göre offset)
      position: {
        x: 6.7,           // X offset
        y: 1.6,           // Y offset
        z: -2.3           // Z offset
      },
      
      // Görünürlük ayarları
      visible: false,
      wireframeColor: 0xff00ff, // Mor renk
      opacity: 0,
      
      // Rotasyon (radyan cinsinden)
      rotationX: 1.6,      // X ekseni etrafında rotasyon
      rotationY: 0 ,  // Y ekseni etrafında 90 derece
      rotationZ: 0       // Z ekseni etrafında rotasyon
    };

    this.KonserAlaniCollision();
    this.createRightTriangleCollision();
    this._buildModel();
    this.scene.add(this.container);
    
    // Debug kontrolleri ekle
    if (this.debug) {
      this.setupDebugControls();
    }
  }
  
  setupDebugControls() {
    // Ana debug klasörü
    const debugFolder = this.debug.addFolder('Konser Alanı');
    
    // Dik üçgen için ayrı bir klasör
    const triangleFolder = debugFolder.addFolder('Dik Üçgen');
    
    // Boyut kontrolleri
    const sizeFolder = triangleFolder.addFolder('Boyut');
    sizeFolder.add(this.rightTriangleConfig, 'width', 1, 15).name('Genişlik').onChange(() => this.updateRightTriangle());
    sizeFolder.add(this.rightTriangleConfig, 'height', 1, 15).name('Yükseklik').onChange(() => this.updateRightTriangle());
    sizeFolder.add(this.rightTriangleConfig, 'depth', 1, 10).name('Derinlik').onChange(() => this.updateRightTriangle());
    
    // Konum kontrolleri
    const posFolder = triangleFolder.addFolder('Konum');
    posFolder.add(this.rightTriangleConfig.position, 'x', -10, 10).name('X Offset').onChange(() => this.updateRightTriangle());
    posFolder.add(this.rightTriangleConfig.position, 'y', -10, 10).name('Y Offset').onChange(() => this.updateRightTriangle());
    posFolder.add(this.rightTriangleConfig.position, 'z', -10, 10).name('Z Offset').onChange(() => this.updateRightTriangle());
    
    // Rotasyon kontrolü
    const rotFolder = triangleFolder.addFolder('Rotasyon');
    rotFolder.add(this.rightTriangleConfig, 'rotationX', 0, Math.PI * 2).name('X Rotasyon').onChange(() => this.updateRightTriangle());
    rotFolder.add(this.rightTriangleConfig, 'rotationY', 0, Math.PI * 2).name('Y Rotasyon').onChange(() => this.updateRightTriangle());
    rotFolder.add(this.rightTriangleConfig, 'rotationZ', 0, Math.PI * 2).name('Z Rotasyon').onChange(() => this.updateRightTriangle());
    
    // Görünürlük kontrolü
    triangleFolder.add(this.rightTriangleConfig, 'visible').name('Görünür').onChange((value) => {
      if (this.triangleMesh) {
        this.triangleMesh.visible = value;
      }
    });
    
    // Opaklık kontrolü
    triangleFolder.add(this.rightTriangleConfig, 'opacity', 0, 1).name('Opaklık').onChange((value) => {
      if (this.triangleMesh && this.triangleMesh.material) {
        this.triangleMesh.material.opacity = value;
      }
    });
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

  KonserAlaniCollision() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-42.3, -19.8, 0)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 12  // X ekseni genişliği
    const columnHeight = 11.6 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 3.55   // Z ekseni derinliği
    
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

  createRightTriangleCollision() {
    if (!this.physics) {
      console.warn('Dik üçgen için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    const config = this.rightTriangleConfig;
    
    // Üçgen mesh için konum hesapla
    const trianglePosition = new THREE.Vector3(
      this.position.x + config.position.x,
      this.position.y + config.position.y,
      this.position.z + config.position.z
    );
    
    // Dik üçgen için özel bir mesh oluşturalım
    const shape = new THREE.Shape();
    const width = config.width;
    const height = config.height;
    
    // Dik üçgen şeklini tanımla (sağ altta dik açı)
    shape.moveTo(-width/2, -height/2);    // Sol alt köşe
    shape.lineTo(width/2, -height/2);     // Sağ alt köşe (dik açı)
    shape.lineTo(-width/2, height/2);     // Sol üst köşe
    shape.lineTo(-width/2, -height/2);    // Başlangıç noktasına geri dön
    
    // Şekli extrude ederek 3B hale getir
    const extrudeSettings = {
      steps: 1,
      depth: config.depth,
      bevelEnabled: false
    };
    
    const triangleGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Üçgen materyal oluştur - wireframe görünümlü ve yarı saydam
    const triangleMaterial = new THREE.MeshBasicMaterial({
      color: config.wireframeColor,
      wireframe: true,
      transparent: true,
      opacity: config.opacity
    });
    
    // Üçgen mesh oluştur
    this.triangleMesh = new THREE.Mesh(triangleGeometry, triangleMaterial);
    
    // Üçgeni doğru konuma yerleştir
    this.triangleMesh.position.copy(trianglePosition);
    
    // Üçgeni tüm eksenlerde döndür
    this.triangleMesh.rotation.x = config.rotationX;
    this.triangleMesh.rotation.y = config.rotationY;
    this.triangleMesh.rotation.z = config.rotationZ;
    
    // Görünürlük ayarı
    this.triangleMesh.visible = config.visible;
    
    // Sahneye ekle
    this.scene.add(this.triangleMesh);
    
    // Fizik gövdesi için CANNON şekli oluştur
    const halfWidth = config.width / 2;
    const halfHeight = config.height / 2;
    const halfDepth = config.depth / 2;
    
    // Dik üçgen köşeleri
    const vertices = [
      // Alt tabandaki üçgenin köşeleri
      new CANNON.Vec3(-halfWidth, -halfHeight, -halfDepth), // Sol alt ön
      new CANNON.Vec3(halfWidth, -halfHeight, -halfDepth),  // Sağ alt ön (dik açı)
      new CANNON.Vec3(-halfWidth, halfHeight, -halfDepth),  // Sol üst ön
      
      // Aynı üçgenin arka yüzdeki köşeleri (derinlik ekseninde)
      new CANNON.Vec3(-halfWidth, -halfHeight, halfDepth),  // Sol alt arka
      new CANNON.Vec3(halfWidth, -halfHeight, halfDepth),   // Sağ alt arka (dik açı)
      new CANNON.Vec3(-halfWidth, halfHeight, halfDepth)    // Sol üst arka
    ];
    
    // Dik üçgen için yüzler - 3B prizma şeklinde
    const faces = [
      [0, 2, 1],       // Ön üçgen
      [3, 4, 5],       // Arka üçgen - yön önemli
      [0, 1, 4, 3],    // Alt dikdörtgen
      [0, 3, 5, 2],    // Sol dikdörtgen
      [1, 2, 5, 4]     // Eğik dikdörtgen
    ];
    
    // CANNON için köşeleri ve yüzleri kullanarak dönüşüm oluştur
    const triangleShape = new CANNON.ConvexPolyhedron(vertices, faces);
    
    // Fizik gövdesi oluştur
    this.triangleBody = new CANNON.Body({
      mass: 0, // Statik nesne
      position: new CANNON.Vec3(
        trianglePosition.x,
        trianglePosition.y,
        trianglePosition.z
      ),
      material: this.physics.materials ? this.physics.materials.items.floor : undefined
    });
    
    // Şekli gövdeye ekle
    this.triangleBody.addShape(triangleShape);
    
    // Tüm eksenlerde döndür
    const quatX = new CANNON.Quaternion();
    quatX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), config.rotationX);
    
    const quatY = new CANNON.Quaternion();
    quatY.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), config.rotationY);
    
    const quatZ = new CANNON.Quaternion();
    quatZ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), config.rotationZ);
    
    // Tüm rotasyonları birleştir
    const finalQuat = new CANNON.Quaternion();
    finalQuat.copy(quatX);
    finalQuat.mult(quatY, finalQuat);
    finalQuat.mult(quatZ, finalQuat);
    
    this.triangleBody.quaternion.copy(finalQuat);
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.triangleBody);
    
    console.log('Dik üçgen collision eklendi, konum:', trianglePosition.x, trianglePosition.y, trianglePosition.z, 
                'boyutlar:', config.width, config.height, config.depth);
  }
  
  updateRightTriangle() {
    // Mevcut üçgeni kaldır
    if (this.triangleMesh) {
      this.scene.remove(this.triangleMesh);
    }
    
    if (this.triangleBody) {
      this.physics.world.removeBody(this.triangleBody);
    }
    
    // Yeni üçgeni ekle
    this.createRightTriangleCollision();
  }
}
