import * as THREE from 'three';
import CANNON from 'cannon';
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js';
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js';
import gsap from 'gsap';

const DEFAULT_POSITION = new THREE.Vector3(14, -32, -2.5); // Stadyum konumu
const SCALE_FACTOR = 1.15; // Ölçek faktörü - %15 büyütme

export default class Stadyum {
  constructor({ scene, resources, objects, physics, debug, rotateX = 0, rotateY = 0, rotateZ = 0, areas = null, materials = null }) {
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
    this.buttonPosition = new THREE.Vector3(16.74, -20, 0); // Buton pozisyonu istenen koordinatlara ayarlandı

    this._buildModel();
    this.createPlatform();
    this.scene.add(this.container);
    
    // Buton kurulumu (eğer areas ve materials parametreleri varsa)
    if (this.areas && this.materials) {
      this.setupButton();
    }
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

  // Buton sistemi kurulumu
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
      <h3 style="margin: 0 0 10px 0; color: #4285f4;">Konya Stadyumu</h3>
      <p style="margin: 0 0 10px 0;">Konya Büyükşehir Belediye Stadyumu, Türkiye'nin en modern stadyumlarından biridir. 42.000 kişilik kapasitesi ile spor etkinliklerine ev sahipliği yapmaktadır.</p>
      <a href="https://stadyum.konya.bel.tr/" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: bold;">Daha Fazla Bilgi →</a>
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
            window.open('https://stadyum.konya.bel.tr/', '_blank');
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
      
      // Doğrudan etkileşim için tıklama desteği
      this.interactiveArea.on('interact', () => {
        window.open('https://stadyum.konya.bel.tr/', '_blank');
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
    ctx.font = 'bold 64px Arial'
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