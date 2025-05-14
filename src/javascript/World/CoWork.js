import * as THREE from 'three';
import CANNON from 'cannon';
import gsap from 'gsap';
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js';
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js';

const DEFAULT_POSITION = new THREE.Vector3(-60, -1.5, 1); // CoWork konumu

export default class CoWork {
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

    // Buton konumu ayarla
    this.buttonPosition = {
      x: -52,
      y: -4
    };

    this.container = new THREE.Object3D();
    this.position = DEFAULT_POSITION.clone();

    // Manuel collision kutusu boyutları (varsayılan değerler)
    this.collisionSize = {
      x: 10,  // genişlik
      y: 9.5,   // yükseklik
      z: 10   // derinlik
    };

    // Manuel collision kutusu pozisyon offseti (model pozisyonuna eklenir)
    this.collisionOffset = {
      x: -0.5,
      y: 0,
      z: 2.5  // Yerden biraz yüksekte
    };

    this._buildModel();
    this.scene.add(this.container);

    // Eğer materials ve areas tanımlanmışsa buton oluştur
    if (this.materials && this.areas) {
      this.setupButton();
    }

    // Debug için kontroller ekle
    if (this.debug) {
      this.setupDebugControls();
    }
  }

  setupDebugControls() {
    const debugFolder = this.debug.addFolder('CoWork Collision');
    
    // Boyut kontrolleri
    const sizeFolder = debugFolder.addFolder('Collision Size');
    sizeFolder.add(this.collisionSize, 'x', 1, 20).name('Width').onChange(() => this.updateCollisionBox());
    sizeFolder.add(this.collisionSize, 'y', 1, 20).name('Height').onChange(() => this.updateCollisionBox());
    sizeFolder.add(this.collisionSize, 'z', 1, 20).name('Depth').onChange(() => this.updateCollisionBox());
    
    // Offset kontrolleri
    const offsetFolder = debugFolder.addFolder('Collision Offset');
    offsetFolder.add(this.collisionOffset, 'x', -10, 10).name('X Offset').onChange(() => this.updateCollisionBox());
    offsetFolder.add(this.collisionOffset, 'y', -10, 10).name('Y Offset').onChange(() => this.updateCollisionBox());
    offsetFolder.add(this.collisionOffset, 'z', -5, 10).name('Z Offset').onChange(() => this.updateCollisionBox());
    
    // Görünürlük kontrolü
    debugFolder.add(this, 'toggleCollisionVisibility').name('Toggle Visibility');
  }

  _buildModel() {
    const gltf = this.resources.items.coWork;
    if (!gltf || !gltf.scene) {
      console.error('CoWork modeli bulunamadı');
      return;
    }

    // Modeli klonla ve malzemeleri kopyala
    const model = gltf.scene.clone(true);
    
    // Model boyutunu 1.4 katına çıkar
    model.scale.set(1.6, 1.6, 1.6);
    
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

    // Manuel fizik gövdesi oluştur
    this.createCollisionBox();

    // Obje sistemine ekle
    if (this.objects) {
      const children = model.children.slice();
      const objectEntry = this.objects.add({
        base: { children },
        collision: { children },
        offset: this.position.clone(),
        mass: 0
      });
      
      // Eğer daha önce fizik gövdesi oluşturulmuşsa, collision ile ilişkilendir
      if (this.body) {
        objectEntry.collision = { body: this.body };
      }
      
      if (objectEntry.container) {
        this.container.add(objectEntry.container);
      }
    }
  }

  createCollisionBox() {
    // Fizik gövdesi oluştur
    const halfExtents = new CANNON.Vec3(
      this.collisionSize.x / 2,
      this.collisionSize.y / 2,
      this.collisionSize.z / 2
    );
    
    const boxShape = new CANNON.Box(halfExtents);

    this.body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(
        this.position.x + this.collisionOffset.x,
        this.position.y + this.collisionOffset.y,
        this.position.z + this.collisionOffset.z
      ),
      material: this.physics.materials.items.floor
    });

    // Dönüşü quaternion olarak ayarla
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ');
    this.body.quaternion.copy(quat);

    this.body.addShape(boxShape);
    this.physics.world.addBody(this.body);

    // Görünür collision kutusu oluştur
    const boxGeometry = new THREE.BoxGeometry(
      this.collisionSize.x,
      this.collisionSize.y,
      this.collisionSize.z
    );
    
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    
    this.collisionMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    
    // Collision mesh pozisyonu
    this.collisionMesh.position.set(
      this.position.x + this.collisionOffset.x,
      this.position.y + this.collisionOffset.y,
      this.position.z + this.collisionOffset.z
    );
    
    // Rotation
    this.collisionMesh.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
    
    // Başlangıçta görünmez yap
    this.collisionMesh.visible = false;
    
    this.container.add(this.collisionMesh);
  }

  updateCollisionBox() {
    // Önce eski physics body'i kaldır
    if (this.body) {
      this.physics.world.removeBody(this.body);
    }
    
    // Yeni collision box oluştur
    this.createCollisionBox();
    
    // Görsel meshini güncelle
    if (this.collisionMesh) {
      this.container.remove(this.collisionMesh);
      
      const boxGeometry = new THREE.BoxGeometry(
        this.collisionSize.x,
        this.collisionSize.y,
        this.collisionSize.z
      );
      
      this.collisionMesh = new THREE.Mesh(
        boxGeometry,
        this.collisionMesh.material
      );
      
      this.collisionMesh.position.set(
        this.position.x + this.collisionOffset.x,
        this.position.y + this.collisionOffset.y,
        this.position.z + this.collisionOffset.z
      );
      
      this.collisionMesh.rotation.set(this.rotateX, this.rotateY, this.rotateZ);
      
      this.container.add(this.collisionMesh);
    }
  }

  toggleCollisionVisibility() {
    if (this.collisionMesh) {
      this.collisionMesh.visible = !this.collisionMesh.visible;
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
      <h3 style="margin: 0 0 10px 0; color: #4285f4;">Ziyaret Et</h3>
      <p style="margin: 0 0 10px 0;">CoWork alanı hakkında detaylı bilgi burada yer alacak.</p>
      <a href="#" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: bold;">Daha Fazla Bilgi →</a>
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
            window.open('https://www.divizyon.org/co-working/', '_blank');
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
        window.open('https://www.divizyon.org/co-working/', '_blank');
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
    ctx.fillText('COWORK', canvas.width/2, canvas.height/2)
    
    ctx.shadowColor = '#4285f4'
    ctx.shadowBlur = 25
    ctx.fillText('COWORK', canvas.width/2, canvas.height/2)

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
