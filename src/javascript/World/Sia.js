import * as THREE from 'three';
import CANNON from 'cannon';
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js';
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js';
import gsap from 'gsap';

// Model için varsayılan pozisyon - konumu ihtiyaca göre ayarlayabilirsiniz
const DEFAULT_POSITION = new THREE.Vector3(69, -7, -1);

export default class Sia {
  constructor({ 
    scene, 
    resources, 
    objects, 
    physics, 
    debug, 
    rotateX = 0, 
    rotateY = 0, 
    rotateZ = 0, 
    areas = null, 
    materials = null,
    // Özel collision değerleri
    collisionPosition = null,
    collisionSize = null
  }) {
    this.scene = scene;
    this.resources = resources;
    this.objects = objects;
    this.physics = physics;
    this.debug = debug;
    this.areas = areas;
    this.materials = materials;

    this.rotateX = rotateX;
    this.rotateY = rotateY;
    this.rotateZ = rotateZ;

    this.container = new THREE.Object3D();
    this.position = DEFAULT_POSITION.clone();
    this.buttonPosition = new THREE.Vector3(69, -12, 0); // Buton pozisyonunu modele göre güncelledim
    
    // Collision değerlerini kaydet
    // collisionPosition belirtilmemişse modelin pozisyonunu kullan
    this.collisionPosition = collisionPosition || new THREE.Vector3(69, -7, 1.5); // X koordinatını 1 birim sola kaydırdım (69 -> 68)
    this.collisionSize = collisionSize || new THREE.Vector3(3, 3, 3); // Boyutu güncellendi
    this.collisionMesh = null; // Referans için

    this._buildModel();
    this.scene.add(this.container);
    
    // Buton kurulumu
    if (this.areas && this.materials) {
      this.setupButton();
    }
    
    // Debug kontrolleri ekle
    if (this.debug) {
      this.setupDebugControls();
    }
  }

  _buildModel() {
    const gltf = this.resources.items.sia;
    if (!gltf || !gltf.scene) {
      console.error('Sia modeli bulunamadı');
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

    // Bounding box hesapla - model matrixini güncelleyerek kesin ölçüm almak için
    model.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    console.log('Sia modeli gerçek boyutu:', size);
    console.log('Sia modeli merkez noktası:', center);

    // Collision kutusu boyutlarını model boyutuna göre ayarla
    // Modelin gerçek ölçülerine göre collision kutusu boyutunu belirliyoruz
    let halfExtents;
    if (this.collisionSize) {
      // Kullanıcı tarafından belirtilen özel boyut kullanılıyor
      halfExtents = new CANNON.Vec3(
        this.collisionSize.x / 2, 
        this.collisionSize.y / 2, 
        this.collisionSize.z / 2
      );
    } else {
      // Model boyutlarına dayanarak otomatik hesaplanmış değerler
      // Z ve Y eksenleri, modelin konumu ve rotasyonuna göre değişiyor
      halfExtents = new CANNON.Vec3(
        size.x / 2, 
        size.z / 2, // Modelin Z'si, fizik motorunda Y olarak kullanılıyor (rotasyon nedeniyle)
        size.y / 2  // Modelin Y'si, fizik motorunda Z olarak kullanılıyor (rotasyon nedeniyle)
      );
    }
    
    // Kullanılan boyutları kaydet
    const usedCollisionSize = new THREE.Vector3(
      halfExtents.x * 2,
      halfExtents.y * 2,
      halfExtents.z * 2
    );
    
    // Collision'ın merkezini modelin merkezine hizala
    const collisionPos = this.collisionPosition.clone();
    
    // BoxShape oluştur
    const boxShape = new CANNON.Box(halfExtents);

    // Fizik gövdesi oluştur
    const body = new CANNON.Body({
      mass: 0, // Statik nesne
      position: new CANNON.Vec3(
        collisionPos.x, 
        collisionPos.y, 
        collisionPos.z
      ),
      material: this.physics.materials.items.floor
    });

    // Dönüşü quaternion olarak ayarla
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ');
    body.quaternion.copy(quat);

    body.addShape(boxShape);
    this.physics.world.addBody(body);
    
    // Görünür collision mesh oluştur
    const collisionGeometry = new THREE.BoxGeometry(
      usedCollisionSize.x, 
      usedCollisionSize.y, 
      usedCollisionSize.z
    );
    
    const collisionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff, // Mor renk - daha kolay görülmesi için
      wireframe: true,
      opacity: 0.5, // Görünürlüğü arttırdım
      transparent: true,
      visible: false // Varsayılan olarak gizli yapıyoruz
    });
    
    this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    this.collisionMesh.position.copy(collisionPos);
    this.collisionMesh.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    this.scene.add(this.collisionMesh);
    
    console.log('Sia collision mesh ayarlandı:', 
      'Pozisyon:', collisionPos, 
      'Boyut:', usedCollisionSize
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
  
  // Collision görünürlüğünü değiştir
  setCollisionVisibility(visible) {
    if (this.collisionMesh) {
      this.collisionMesh.visible = visible;
      console.log(`Sia collision görünürlüğü: ${visible ? 'Açık' : 'Kapalı'}`);
    }
  }
  
  // Debug kontrolleri
  setupDebugControls() {
    if (!this.debug.addFolder) return;
    
    const folder = this.debug.addFolder('Sia Collision');
    
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
      this.setCollisionVisibility(value);
    });
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

    // Bilgi paneli oluştur
    this.infoPanel = document.createElement('div')
    this.infoPanel.style.position = 'absolute'
    this.infoPanel.style.bottom = '20px'
    this.infoPanel.style.right = '20px'
    this.infoPanel.style.left = 'auto'
    this.infoPanel.style.transform = 'none'
    this.infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
    this.infoPanel.style.color = 'white'
    this.infoPanel.style.padding = '15px'
    this.infoPanel.style.borderRadius = '10px'
    this.infoPanel.style.fontFamily = 'Arial, sans-serif'
    this.infoPanel.style.zIndex = '1000'
    this.infoPanel.style.display = 'none'
    this.infoPanel.style.transition = 'opacity 0.3s ease-in-out'
    this.infoPanel.style.textAlign = 'center'
    this.infoPanel.style.maxWidth = '400px'
    
    // Bilgi paneli içeriği
    this.infoPanel.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #4285f4;">Sia</h3>
      <p style="margin: 0 0 10px 0;">Sosyal İnovasyon Ajansı hakkında detaylı bilgi burada yer alacak.</p>
      <a href="https://www.sosyalinovasyonajansi.com/" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: bold;">Daha Fazla Bilgi →</a>
    `
    document.body.appendChild(this.infoPanel)

    // Etkileşimli alan
    if (this.areas) {
      this.interactiveArea = this.areas.add({
        position: new THREE.Vector2(this.buttonPosition.x, this.buttonPosition.y),
        halfExtents: new THREE.Vector2(1.5, 1.5),
        floorShadowType: 'primary',
        debug: false
      });

      this.interactiveArea.on('in', () => {
        if (this.button && this.button.label) {
          gsap.to(this.button.label.position, { 
            z: 0.5,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
        
        if (this.button && this.button.fence && this.button.fence.material) {
          gsap.to(this.button.fence.material.color, {
            r: 0.1,
            g: 0.7,
            b: 1.0,
            duration: 0.3
          });
        }

        // Bilgi panelini göster
        this.infoPanel.style.display = 'block'
        this.infoPanel.style.opacity = '0'
        setTimeout(() => {
          this.infoPanel.style.opacity = '1'
        }, 10)
        
        // Enter tuşu için event listener ekleniyor
        this.enterKeyListener = (event) => {
          if (event.key === 'Enter') {
            window.open('https://www.sosyalinovasyonajansi.com/', '_blank');
          }
        };
        window.addEventListener('keydown', this.enterKeyListener);
      });
      
      this.interactiveArea.on('out', () => {
        if (this.button && this.button.label) {
          gsap.to(this.button.label.position, { 
            z: 0.3,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
        
        if (this.button && this.button.fence && this.button.fence.material) {
          gsap.to(this.button.fence.material.color, {
            r: 0.26,
            g: 0.52,
            b: 0.96,
            duration: 0.3
          });
        }

        // Bilgi panelini gizle
        this.infoPanel.style.opacity = '0'
        setTimeout(() => {
          this.infoPanel.style.display = 'none'
        }, 300)
        
        // Enter tuşu listener'ını kaldır
        if (this.enterKeyListener) {
          window.removeEventListener('keydown', this.enterKeyListener);
          this.enterKeyListener = null;
        }
      });
      
      // Doğrudan etkileşim için tıklama desteği ekle
      this.interactiveArea.on('interact', () => {
        window.open('https://www.sosyalinovasyonajansi.com/', '_blank');
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
} 