import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import gsap from 'gsap'
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js'
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js'
import CANNON from 'cannon'

export default class Render_odasi {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.materials = _options.materials;
        this.areas = _options.areas;
        this.mixer = null;
        this.model = null;
        
        // Buton için konum belirleme
        this.buttonPosition = {
            x: -70,
            y: -16
        };
        
        this.setModel();
        this.RenderOdasiCollision()
        this.RenderOdasiCollision2()
        
        if (this.materials && this.areas) {
            this.setupButton();
        }
        
        if (this.time) {
            this.time.on('tick', () => {
                this.tick(this.time.delta * 0.001);
            });
        } else {
            console.warn('Render odası: time parametresi verilmedi, animasyonlar çalışmayacak.');
        }
    }

    setModel() {
        if (!this.scene) {
            console.warn('Render odası: scene parametresi verilmedi, model sahneye eklenmeyecek.');
            return;
        }

        const loader = new GLTFLoader();
        loader.load('./models/render_odasi/render_odasi.glb', (gltf) => {
            console.log('Render odası modeli yüklendi:', gltf);
            console.log('Animasyonlar:', gltf.animations);
            
            this.model = gltf.scene;
            this.model.position.set(-79, -11, 2);
            this.model.scale.set(3.4, 3.4, 3.4);
            
            // Modeli döndür
            this.model.rotation.z =  Math.PI ;
            this.model.rotation.x = Math.PI ;
            this.model.rotation.y = Math.PI  ;
            
            this.scene.add(this.model);

            // Işık ekle (sadece bir kez)
            if (!this.scene.__balikLightAdded) {
                this.scene.add(new THREE.AmbientLight(0xffffff, 2));
                const dirLight = new THREE.DirectionalLight(0xffffff, 2);
                dirLight.position.set(5, 10, 7.5);
                this.scene.add(dirLight);
                this.scene.__balikLightAdded = true;
            }

            // Materyal ve mesh kontrolü
            this.model.traverse((child) => {
                if (child.isMesh) {
                    console.log('Mesh bulundu:', child.name);
                    if (child.isSkinnedMesh) {
                        console.log('SkinnedMesh bulundu:', child.name);
                    }
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
                console.warn('Hiç animasyon bulunamadı!');
            }
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
            <h3 style="margin: 0 0 10px 0; color: #4285f4;">Render Odası</h3>
            <p style="margin: 0 0 10px 0;">Render odası hakkında detaylı bilgi burada yer alacak.</p>
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
                        window.open('#https://www.instagram.com/reel/DGgFTOKskN9/?utm_source=ig_web_button_share_sheet&igsh=MzRlODBiNWFlZA==', '_blank');
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
                window.open('https://www.instagram.com/reel/DGgFTOKskN9/?utm_source=ig_web_button_share_sheet&igsh=MzRlODBiNWFlZA==', '_blank');
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
        ctx.fillText('RENDER ODASI', canvas.width/2, canvas.height/2)
        
        ctx.shadowColor = '#4285f4'
        ctx.shadowBlur = 25
        ctx.fillText('RENDER ODASI', canvas.width/2, canvas.height/2)

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

    tick(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }


    RenderOdasiCollision() {
        if (!this.physics) {
          console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
          return
        }
        
        // Kolon için sabit konum
        const columnPosition = new THREE.Vector3(-81, -11, 0)
        
        // Kolon için rotasyon açıları (radyan cinsinden)
        const columnRotateX = 0  // X ekseni etrafında 22.5 derece
        const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
        const columnRotateZ = 0  // Z ekseni etrafında 30 derece
        
        // Kolon boyutları - Y ekseni boyunca uzun bir kolon
        const columnWidth = 2.5  // X ekseni genişliği
        const columnHeight = 10 // Y ekseni yüksekliği (dikey uzunluk)
        const columnDepth = 7    // Z ekseni derinliği
        
        // Kolon görsel temsili oluştur
        const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
        const columnMaterial = new THREE.MeshBasicMaterial({
          color: 0x660099, // Yeşil kolon
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
    

      RenderOdasiCollision2() {
        if (!this.physics) {
          console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
          return
        }
        
        // Kolon için sabit konum
        const columnPosition = new THREE.Vector3(-78.4, -6, 0)
        
        // Kolon için rotasyon açıları (radyan cinsinden)
        const columnRotateX = 0  // X ekseni etrafında 22.5 derece
        const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
        const columnRotateZ = 0  // Z ekseni etrafında 30 derece
        
        // Kolon boyutları - Y ekseni boyunca uzun bir kolon
        const columnWidth = 8  // X ekseni genişliği
        const columnHeight = 0.7 // Y ekseni yüksekliği (dikey uzunluk)
        const columnDepth = 7    // Z ekseni derinliği
        
        // Kolon görsel temsili oluştur
        const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
        const columnMaterial = new THREE.MeshBasicMaterial({
          color: 0x660099, // Yeşil kolon
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
    



}




/* 
Resource.js   { name: 'aladdinTepesi', source: './models/hubit/aladdinTepesi/base.glb' },
İndex Js
    setAladdinTepesi() {
        this.aladdinTepesi = new AladdinTepesi({
            scene: this.scene,
            time: this.time,
            physics: this.physics
        });
    }
this.setAladdinTepesi()
import AladdinTepesi from './Hubit/AlaaddinTepesi.js'
*/