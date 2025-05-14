import * as THREE from 'three';
import CANNON from 'cannon';
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js';
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js';
import gsap from 'gsap';

const DEFAULT_POSITION = new THREE.Vector3(32, -14, 1.5); // Artık doğru yerde tanımlandı

export default class KapsulBinasi {
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
    // Collision mesh için özel parametreler
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
    this.rotateZ = Math.PI * 1.5;

    this.container = new THREE.Object3D();
    this.position = DEFAULT_POSITION.clone();
    this.buttonPosition = new THREE.Vector3(32, -21.65, 0); // Buton pozisyonu güncellendi
    
    // Özel collision ayarları (varsa)
    this.collisionPosition = collisionPosition;
    this.collisionSize = collisionSize;
    this.collisionMesh = null; // Daha sonra referans için eklendi

    this._buildModel();
    this.scene.add(this.container);
    
    // Buton kurulumu
    if (this.areas && this.materials) {
      this.setupButton();
    }
  }

  _buildModel() {
    const gltf = this.resources.items.KapsulBinasi;
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

    // Collision boyutları - özel boyut verilmişse kullan, yoksa otomatik hesapla
    let halfExtents;
    if (this.collisionSize) {
      // Kullanıcı tarafından belirtilen boyutlar
      halfExtents = new CANNON.Vec3(
        this.collisionSize.x / 2, 
        this.collisionSize.y / 2, 
        this.collisionSize.z / 2
      );
    } else {
      // Otomatik hesaplanan boyutlar
      halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    }
    
    // Collision pozisyonu - Eğer `this.collisionPosition` (bir THREE.Vector3) tanımlıysa onu kullan,
    // değilse modelin ana pozisyonu (`this.position`) kullanılır.
    // Özel bir pozisyon belirlemek için KapsulBinasi örneği oluşturulurken
    // `collisionPosition` parametresini bir THREE.Vector3 olarak verin.
    // Örnek: new KapsulBinasi({ ..., collisionPosition: new THREE.Vector3(31, -16, -3) })
    const bodyPosition = this.collisionPosition
      ? new CANNON.Vec3(this.collisionPosition.x, this.collisionPosition.y, this.collisionPosition.z) // Özel pozisyon kullanılıyor
      : new CANNON.Vec3(this.position.x, this.position.y, this.position.z); // Varsayılan model pozisyonu kullanılıyor

    // Fizik gövdesi oluştur
    const boxShape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({
      mass: 0,
      position: bodyPosition,
      material: this.physics.materials.items.floor
    });

    // Dönüşü quaternion olarak ayarla
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ');
    body.quaternion.copy(quat);

    body.addShape(boxShape);
    this.physics.world.addBody(body);
    
    // Basit collision mesh'i görselleştirme
    const collisionGeometry = new THREE.BoxGeometry(
      halfExtents.x * 2, 
      halfExtents.y * 2, 
      halfExtents.z * 2
    );
    
    const collisionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      opacity: 0,
      transparent: true,
      visible: false
    });
    
    this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    
    // Collision mesh pozisyonu ve rotasyonu
    this.collisionMesh.position.copy(this.collisionPosition || this.position);
    this.collisionMesh.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    this.scene.add(this.collisionMesh);
    
    console.log('Kapsül Binası collision box eklendi:', 
      'Pozisyon:', this.collisionMesh.position,
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
  
  // Collision mesh'in konumunu güncellemek için yeni metod
  updateCollisionPosition(newPosition) {
    if (!this.collisionMesh) return;
    
    this.collisionPosition = newPosition;
    this.collisionMesh.position.copy(newPosition);
    
    console.log('Collision kutusu pozisyonu güncellendi:', newPosition);
  }
  
  // Collision mesh'in boyutunu güncellemek için yeni metod
  updateCollisionSize(newSize) {
    if (!this.collisionMesh) return;
    
    this.collisionSize = newSize;
    
    // Eski mesh'i kaldır
    this.scene.remove(this.collisionMesh);
    
    // Yeni geometri oluştur
    const newGeometry = new THREE.BoxGeometry(
      newSize.x,
      newSize.y,
      newSize.z
    );
    
    // Aynı materyal ile yeni mesh oluştur
    const material = this.collisionMesh.material;
    this.collisionMesh = new THREE.Mesh(newGeometry, material);
    
    // Pozisyon ve rotasyonu ayarla
    this.collisionMesh.position.copy(this.collisionPosition || this.position);
    this.collisionMesh.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    
    // Sahneye ekle
    this.scene.add(this.collisionMesh);
    
    console.log('Collision kutusu boyutu güncellendi:', newSize);
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
      <h3 style="margin: 0 0 10px 0; color: #4285f4;">Kapsül Binası</h3>
      <p style="margin: 0 0 10px 0;">Kapsül Binası hakkında detaylı bilgi burada yer alacak.</p>
      <a href="https://www.kapsul.org.tr/" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: bold;">Daha Fazla Bilgi →</a>
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
            window.open('https://www.kapsul.org.tr/', '_blank');
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
        window.open('https://www.kapsul.org.tr/', '_blank');
      });
    }
  }

  createButtonLabel() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1024
    canvas.height = 256
    
    // info_BG.png dosyasını önce canvas'a arka plan olarak çizelim
    const buttonBg = new Image()
    buttonBg.onload = () => {
        // Resmi canvas'a çiz
        ctx.drawImage(buttonBg, 0, 0, canvas.width, canvas.height)
        
        // Yazı ayarları - resmin üzerine yazdır
        ctx.fillStyle = 'black'
        ctx.font = 'bold 80px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('ZİYARET ET', canvas.width/2, canvas.height/2)
        
        // Canvas değiştiğinde texture'ı güncelle
        texture.needsUpdate = true
    }
    buttonBg.src = 'images/info_BG.png'
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter

    // Tek bir geometri ve material kullan
    const labelGeometry = new THREE.PlaneGeometry(3, 1.2)
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    })
    
    // Mesh oluştur
    this.button.label = new THREE.Mesh(labelGeometry, labelMaterial)
    
    // Grubun z-pozisyonu
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