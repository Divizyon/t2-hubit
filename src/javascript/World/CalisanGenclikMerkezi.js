import * as THREE from 'three';
import CANNON from 'cannon';
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js';
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js';

const DEFAULT_POSITION = new THREE.Vector3(53, -34.5, 0); // X: 1 birim sola, Y: 2.5 birim yukarı

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
    materials, // Buton materyalleri için eklendi
    areas, // Etkileşimli alan için eklendi
    // Özel collision ayarları
    collisionPosition = new THREE.Vector3(53, -34, 2), // X: 1 birim sola, Y: 2.5 birim yukarı
    collisionSize = new THREE.Vector3(4.9, 3.4, 5) // Özel boyut (null ise otomatik hesaplanır)
  }) {
    this.scene = scene;
    this.resources = resources;
    this.objects = objects;
    this.physics = physics;
    this.debug = debug;
    this.materials = materials; // Buton materyalleri için eklendi
    this.areas = areas; // Etkileşimli alan için eklendi

    this.rotateX = rotateX;
    this.rotateY = rotateY;
    this.rotateZ = -3;

    this.container = new THREE.Object3D();
    this.position = DEFAULT_POSITION.clone();
    
    // Web site URL'si
    this.websiteUrl = 'https://www.calisangenclik.com/';
    
    // Buton konumu
    this.buttonPosition = new THREE.Vector3(52, -38, 0); // Buton konumu 52, -38 olarak güncellendi
    
    // Collision için özel ayarları kaydet
    this.collisionPosition = collisionPosition || this.position.clone();
    this.collisionSize = collisionSize;
    this.collisionMesh = null; // Referans için

    this._buildModel();
    this.scene.add(this.container);
    
    // Etkileşimli buton ekle
    if (this.areas && this.materials) {
      this.setupButton();
    }
    
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
  
  setupButton() {
    this.button = {}

    // Container
    this.button.container = new THREE.Object3D()
    this.button.container.position.x = this.buttonPosition.x
    this.button.container.position.y = this.buttonPosition.y
    this.button.container.matrixAutoUpdate = false
    this.button.container.updateMatrix()
    this.scene.add(this.button.container)

    // Alan çerçevesi
    if (this.materials && this.materials.items && this.materials.items.areaFloorBorder) {
      const floorBorderGeometry = new AreaFloorBorderGeometry(2, 2, 0.3)
      this.button.floorBorder = new THREE.Mesh(
        floorBorderGeometry,
        this.materials.items.areaFloorBorder.clone()
      )
      this.button.floorBorder.matrixAutoUpdate = false
      this.button.floorBorder.updateMatrix()
      this.button.container.add(this.button.floorBorder)
    }
    
    // Alan duvarları
    if (this.materials && this.materials.items && this.materials.items.areaGradientTexture) {
      const fenceGeometry = new AreaFenceGeometry(2, 2, 0.3)
      
      const fenceMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaMap: this.materials.items.areaGradientTexture,
        color: 0x4285f4
      })
      
      this.button.fence = new THREE.Mesh(fenceGeometry, fenceMaterial)
      this.button.fence.position.z = 0.15
      this.button.fence.matrixAutoUpdate = false
      this.button.fence.updateMatrix()
      this.button.container.add(this.button.fence)
    }

    // Button Etiketi
    this.createButtonLabel()
    
    // Başlangıçta görünür yap
    this.button.container.visible = true
    
    // Buton animasyonu
    this.animateButton()

    // Etkileşimli alan ekle
    if (this.areas) {
      this.interactiveArea = this.areas.add({
        position: new THREE.Vector2(this.buttonPosition.x, this.buttonPosition.y),
        halfExtents: new THREE.Vector2(1.5, 1.5),
        floorShadowType: 'primary',
        debug: false
      });
      
      // Bilgi paneli oluştur
      this.infoPanel = document.createElement('div');
      this.infoPanel.style.position = 'absolute';
      this.infoPanel.style.bottom = '20px';
      this.infoPanel.style.right = '20px'; // Sağ alt köşede göstermek için
      this.infoPanel.style.transform = 'none'; // transform'u kaldır
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
      
      // Bilgi paneli içeriği - Link ekle
      this.infoPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #4285f4;">Çalışan Gençlik Merkezi</h3>
        <p style="margin: 0 0 10px 0;">Konya Çalışan Gençlik Meclisi, gençler için çeşitli etkinlikler ve aktiviteler düzenleyen bir organizasyondur.</p>
        <p style="margin: 0 0 10px 0;">Projeler, etkinlikler ve haberlere web sitesinden ulaşabilirsiniz.</p>
        <a href="${this.websiteUrl}" target="_blank" style="display: inline-block; text-decoration: none; background-color: #4285f4; color: white; padding: 8px 15px; border-radius: 5px; margin-top: 10px; font-weight: bold;">Web Sitesini Ziyaret Et</a>
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
      
      // Enter tuşuna basma olayı
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && this.interactiveArea.isHovered) {
          window.open(this.websiteUrl, '_blank');
        }
      });
      
      // Tıklama olayı
      this.interactiveArea.on('interact', () => {
        window.open(this.websiteUrl, '_blank');
      });
    }
  }

  createButtonLabel() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1024
    canvas.height = 256
    
    const gradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 0,
      canvas.width/2, canvas.height/2, canvas.width/2
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)')
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'white'
    ctx.font = 'bold 96px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ZİYARET ET', canvas.width/2, canvas.height/2)
    
    ctx.shadowColor = '#4285f4'
    ctx.shadowBlur = 25
    ctx.fillText('ZİYARET ET', canvas.width/2, canvas.height/2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter

    const labelGeometry = new THREE.PlaneGeometry(3, 0.8)
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    this.button.label = new THREE.Mesh(labelGeometry, labelMaterial)
    this.button.label.position.z = 0.2
    this.button.container.add(this.button.label)
  }
  
  animateButton() {
    const animate = () => {
      const time = Date.now() * 0.001
      
      if (this.button && this.button.container) {
        this.button.container.position.z = Math.sin(time * 2) * 0.1
        
        if (this.button.label) {
          this.button.label.rotation.z = Math.sin(time) * 0.05
        }
        
        if (this.button.fence) {
          this.button.fence.material.opacity = 0.5 + Math.sin(time * 2) * 0.2
        }
      }
      
      requestAnimationFrame(animate)
    }
    
    animate()
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