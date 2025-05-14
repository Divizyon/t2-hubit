import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import CANNON from 'cannon'
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js'
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js'
import gsap from 'gsap'

export default class Ekran3D {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.resources = _options.resources;
        this.areas = _options.areas;
        this.materials = _options.materials;
        this.mixer = null;
        this.model = null;
        this.collisionBody = null;
        this.buttonPosition = new THREE.Vector3(36, -37, 0); // Buton pozisyonu güncellendi (31, -35 -> 36, -37)
        
        this.setModel();
        
        // Buton kurulumu
        if (this.areas && this.materials) {
          this.setupButton();
        }
        
        if (this.time) {
            this.time.on('tick', () => {
                this.tick(this.time.delta * 0.001);
            });
        } else {
            console.warn('3D Ekran: time parametresi verilmedi, animasyonlar çalışmayacak.');
        }
    }

    setModel() {
        if (!this.scene) {
            console.warn('3D Ekran: scene parametresi verilmedi, model sahneye eklenmeyecek.');
            return;
        }

        if (this.resources && this.resources.items['3dEkran']) {
            const gltf = this.resources.items['3dEkran'];
            console.log('3D Ekran modeli yüklendi:', gltf);
            
            this.model = gltf.scene;
            this.model.position.set(33, -32, 0); // Pozisyonu ayarlayabilirsiniz
            this.model.scale.set(1, 1, 1); // Ölçeği ayarlayabilirsiniz
            
            // Modeli döndür
            this.model.rotation.x = 0;
            this.model.rotation.y = 0;
            this.model.rotation.z = Math.PI / 1.35;
            
            this.scene.add(this.model);

            // Fizik gövdesi ekle
            if (this.physics) {
                // Modelin boyutlarını hesapla
                const boundingBox = new THREE.Box3().setFromObject(this.model);
                const size = boundingBox.getSize(new THREE.Vector3());
                
                // Collision için model ile aynı pozisyon kullanılıyor
                const collisionPosition = new THREE.Vector3(33, -32, 0);
                
                this.collisionBody = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(collisionPosition.x, collisionPosition.y, collisionPosition.z),
                    material: this.physics.materials.items.floor
                });

                // Fizik boyutunun boyutunu ayarla - daha büyük boyutlar
                const collisionSize = new THREE.Vector3(2.7, 7, 4); // Sabit boyut değerleri
                const boxShape = new CANNON.Box(new CANNON.Vec3(collisionSize.x / 2, collisionSize.y / 2, collisionSize.z / 2));
                this.collisionBody.addShape(boxShape);
                
                // Rotasyonu fizik modeline de uygula
                const quaternion = new CANNON.Quaternion();
                quaternion.setFromEuler(this.model.rotation.x, this.model.rotation.y, this.model.rotation.z, 'XYZ');
                this.collisionBody.quaternion.copy(quaternion);
                
                this.physics.world.addBody(this.collisionBody);
                
                // Görünür collision mesh ekle - aynı boyutları kullan
                const collisionGeometry = new THREE.BoxGeometry(
                    collisionSize.x,
                    collisionSize.y,
                    collisionSize.z
                );
                
                const collisionMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                    opacity: 0, // Tamamen saydam
                    transparent: true,
                    visible: false // Görünürlüğü kapat
                });
                
                this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
                this.collisionMesh.position.copy(collisionPosition);
                this.collisionMesh.rotation.set(this.model.rotation.x, this.model.rotation.y, this.model.rotation.z);
                this.scene.add(this.collisionMesh);
                
                console.log('3D Ekran için collision mesh güncellendi:', 
                    'Pozisyon:', collisionPosition, 
                    'Boyut:', collisionSize
                );
            }

            // Materyal ve mesh kontrolü
            this.model.traverse((child) => {
                if (child.isMesh) {
                    console.log('Mesh bulundu:', child.name);
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (!child.material) {
                        child.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                    }
                    if (child.material && child.material.type === 'MeshBasicMaterial') {
                        child.material = new THREE.MeshStandardMaterial({ color: child.material.color || 0xffffff });
                    }
                    child.material.transparent = false;
                    child.material.opacity = 1;
                }
            });

            // Animasyonları başlat
            if (gltf.animations && gltf.animations.length > 0) {
                console.log('Animasyonlar yükleniyor...');
                this.mixer = new THREE.AnimationMixer(this.model);
                gltf.animations.forEach((clip, index) => {
                    console.log(`Animasyon ${index} yükleniyor:`, clip.name);
                    const action = this.mixer.clipAction(clip);
                    action.reset().play();
                });
                console.log('Mixer oluşturuldu:', this.mixer);
            } else {
                console.log('3D Ekran modelinde animasyon bulunamadı.');
            }
        } else {
            console.error('3D Ekran modelini yüklerken hata: Model bulunamadı veya resources parametresi eksik.');
            
            // Resources yoksa doğrudan yükleyelim
            const loader = new GLTFLoader();
            loader.load('./models/3dEkran/3D_Ekran.glb', (gltf) => {
                console.log('3D Ekran modeli doğrudan yüklendi:', gltf);
                
                this.model = gltf.scene;
                this.model.position.set(85, -8, 0);
                this.model.scale.set(0.8, 0.8, 0.8);
                
                // Modeli döndür
                this.model.rotation.x = 0;
                this.model.rotation.y = Math.PI / 2;
                this.model.rotation.z = 0;
                
                this.scene.add(this.model);
                
                // Animasyonları başlat
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    gltf.animations.forEach((clip) => {
                        const action = this.mixer.clipAction(clip);
                        action.reset().play();
                    });
                }
            });
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
          <h3 style="margin: 0 0 10px 0; color: #4285f4;">3D Bilgi Ekranı</h3>
          <p style="margin: 0 0 10px 0;">Konya'nın dijital bilgi ekranı ile şehrin tarihi ve kültürel zenginliklerini keşfedin.</p>
          <a href="https://www.konya.bel.tr/dijital-ekran" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: bold;">Daha Fazla Bilgi →</a>
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
                window.open('https://www.konya.bel.tr/dijital-ekran', '_blank');
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
            window.open('https://www.konya.bel.tr/dijital-ekran', '_blank');
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

    tick(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }
} 