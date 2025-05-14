import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import CANNON from 'cannon'
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js'
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js'
import gsap from 'gsap'

export default class AlaaddinTepesi {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.materials = _options.materials;
        this.areas = _options.areas;
        this.mixer = null;
        this.model = null;
        this.collisionBody = null;


        
        // Platform
        this.platform = null;
     
        this.setModel();
        this.createPlatform();
        this.buttonPosition = new THREE.Vector3(21, -65, 0); // X pozisyonunu 3 birim sağa kaydırdım (18 -> 21)
        this.setupButton();
        
        if (this.time) {
            this.time.on('tick', () => {
                this.tick(this.time.delta * 0.001);
            });
        } else {
            console.warn('AlaaddinTepesi: time parametresi verilmedi, animasyonlar çalışmayacak.');
        }
    }

    setModel() {
        if (!this.scene) {
            console.warn('AlaaddinTepesi: scene parametresi verilmedi, model sahneye eklenmeyecek.');
            return;
        }

        const loader = new GLTFLoader();
        loader.load('./models/AlaaddinTepesi.glb', (gltf) => {
            console.log('Alaaddin Tepesi modeli yüklendi:', gltf);
            console.log('Animasyonlar:', gltf.animations);
            
            this.model = gltf.scene;
            this.model.position.set(5.5, -66.6, 1.5); // X pozisyonunu 5 birim sağa kaydırdım (0.5 -> 5.5)
            this.model.scale.set(1, 1, 1);
            
            // Modeli döndür
            this.model.rotation.x = Math.PI / 2;
            
            this.scene.add(this.model);

          // colision lar kapatıldıu
            // if (this.physics) {
            //     this.collisionBody = new CANNON.Body({
            //         mass: 0,
            //         position: new CANNON.Vec3(5, -25, .7), // Sağa ve yukarı taşındı
            //         material: this.physics.materials.items.floor
            //     });

            //     const radius = 2.5;
            //     const sphereShape = new CANNON.Sphere(radius);
            //     this.collisionBody.addShape(sphereShape);

                
            //     this.physics.world.addBody(this.collisionBody);
            // }

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
                    // Animasyon süresini 8 saniye olarak ayarla
                    const originalDuration = clip.duration;
                    const targetDuration = 8; // 8 saniye
                    const timeScale = originalDuration / targetDuration;
                    const action = this.mixer.clipAction(clip);
                    action.reset().play();
                    action.timeScale = timeScale;
                });
                console.log('Mixer oluşturuldu:', this.mixer);
            } else {
                console.warn('Hiç animasyon bulunamadı!');
            }
        });
    }
    
    // Altına kare platform ekle
    createPlatform() {
        if (!this.scene) {
            console.warn('AlaaddinTepesi: scene parametresi verilmedi, platform eklenmeyecek.');
            return;
        }
        
        // Kare platform oluştur
        const platformSize = 24; // Kare platformun bir kenar uzunluğu küçültüldü (26 -> 22)
        const platformGeometry = new THREE.BoxGeometry(platformSize, platformSize, 1); // Kare platform
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080, // Gri
            metalness: 0.5,  // Daha az metalik
            roughness: 0.5,  // Daha mat yüzey
        });
        
        this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
        this.platform.position.set(5.5, -66, 0); // X pozisyonunu 5 birim sağa kaydırdım (0.5 -> 5.5)
        this.platform.rotation.x = Math.PI; // Yatay duruma getir
        this.platform.castShadow = true;
        this.platform.receiveShadow = true;
        
        this.scene.add(this.platform);
        
        // Platform için fizik ekle
        if (this.physics) {
            // Platformun fiziksel boyutları - yarı boyutlar olarak tanımlanır
            const halfSize = platformSize / 2; // Kenar uzunluğunun yarısı
            const collisionHeight = 5; // Z boyutunu artırıyoruz (5 birim yükseklik)
            
            const platformBody = new CANNON.Body({
                mass: 0, // Statik nesne
                position: new CANNON.Vec3(5.5, -66, 0), // X pozisyonunu 5 birim sağa kaydırdım (0.5 -> 5.5)
                material: this.physics.materials.items.floor
            });
            
            // Kare platform şekli - BoxShape kullanılıyor
            const platformShape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, collisionHeight / 2)); // Yarı boyutlar (13, 13, 2.5)
            
            platformBody.addShape(platformShape);
            
            // Platformu fizik dünyasına ekle
            this.physics.world.addBody(platformBody);
            
            console.log('Kare platform fizik gövdesi güncellendi, boyut:', platformSize, 'yükseklik:', collisionHeight);
            
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
                debugMesh.position.copy(this.platform.position); // Platform konumunu kopyala
                debugMesh.rotation.copy(this.platform.rotation);
                
                this.scene.add(debugMesh);
                console.log('Fizik gövdesi debug mesh güncellendi, yeni konum:', this.platform.position);
            }
        }
        
        console.log('Kare platform eklendi, boyut:', platformSize);
    }

    tick(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    setupButton() {
        this.button = {}

        // Container
        this.button.container = new THREE.Object3D()
        this.button.container.position.x = this.buttonPosition.x // buttonPosition değişkenini kullan
        this.button.container.position.y = this.buttonPosition.y
        this.button.container.position.z = this.buttonPosition.z || 0
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
        this.infoPanel.style.width = '320px'
        this.infoPanel.style.fontFamily = 'Arial, sans-serif'
        this.infoPanel.style.zIndex = '1000'
        this.infoPanel.style.display = 'none'
        this.infoPanel.style.transition = 'opacity 0.3s ease-in-out'
        
        // Bilgi paneli içeriği
        this.infoPanel.innerHTML = `
            <div style="position: relative; width: 100%;">
                <img src="images/info_BG.png" style="width: 100%; border-radius: 10px;">
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <h3 style="margin: 0 0 5px 0; color: #000000; font-size: 18px; font-weight: bold;">Alaaddin Tepesi</h3>
                    <p style="margin: 0; color: #000000; font-size: 12px; line-height: 1.2; max-width: 85%;">Konya'nın en yüksek noktası olan Alaaddin Tepesi, şehrin tarihi ve kültürel merkezidir.</p>
                </div>
            </div>
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
                        window.open('https://gokonya.com/tr/alaeddin-tepesi-1', '_blank');
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
            });
        }
    }

    createButtonLabel() {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = 1024
        canvas.height = 256
      
            ctx.fillStyle = 'white'
            ctx.font = 'bold 80px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('ZİYARET ET', canvas.width/2, canvas.height/2)
            

      
        
        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
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