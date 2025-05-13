import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import CANNON from 'cannon'
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js'
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js'
import gsap from 'gsap'

export default class KelebekVadisi {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.materials = _options.materials;
        this.areas = _options.areas;
        this.mixer = null;
        this.model = null;
        this.collisionBody = null;
        
        // Web site URL'si
        this.websiteUrl = 'https://konyatropikalkelebekbahcesi.com/tr';

    
    // Platform
    this.platform = null;

        this.setModel();
        this.createPlatform();
        this.buttonPosition = new THREE.Vector3(55, -15, 0); // İstenen buton konumu
        this.setModel();
        
        // Etkileşimli buton ekle
        if (this.areas && this.materials) {
            this.setupButton();
        }
        
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
        loader.load('./models/kelebekVadisi/kelebek vadisi.glb', (gltf) => {
            console.log('Alaaddin Tepesi modeli yüklendi:', gltf);
            console.log('Animasyonlar:', gltf.animations);
            
            this.model = gltf.scene;
            this.model.position.set(55, -5, 1.5); // Z pozisyonunu 5 birim yükselttim
            this.model.scale.set(1, 1, 1);
            
            // Modeli döndür
            this.model.rotation.x = 0;
            
            this.scene.add(this.model);

          // colision lar kapatıldıu
            // if (this.physics) {
            //     this.collisionBody = new CANNON.Body({
            //         mass: 0,
            //         position: new CANNON.Vec3(1, -30, .7),
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
                    const targetDuration = 9; // 8 saniye
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
        console.warn('KelebekVadisi: scene parametresi verilmedi, platform eklenmeyecek.');
        return;
    }
    
    // Kare platform oluştur
        const platformSize = 11.5; // Kare platformun bir kenar uzunluğu (32'den 25'e küçültüldü)
        const platformGeometry = new THREE.BoxGeometry(platformSize, platformSize, 1); // Kare platform
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080, // Gri
            metalness: 0.5,  // Daha az metalik
            roughness: 0.5,  // Daha mat yüzey
    });
    
    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
        this.platform.position.set(55, -5, -0.5); // Modelin altında, Kelebek Vadisinin konumuna uygun
        this.platform.rotation.x = 0; // Yatay duruma getirmek için rotasyonu sıfırladık
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
                position: new CANNON.Vec3(55, -5, -0.5), // Platform ile aynı pozisyon
            material: this.physics.materials.items.floor
        });
            
            // Platformun düz durması için rotasyonu kaldırdık
            // const quat = new CANNON.Quaternion();
            // quat.setFromEuler(Math.PI / 2, 0, 0, 'XYZ'); // X ekseninde 90 derece
            // platformBody.quaternion.copy(quat);
        
        // Kare platform şekli - BoxShape kullanılıyor
            const platformShape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, collisionHeight / 2)); // Yatay halde yarı boyutlar
        
        platformBody.addShape(platformShape);
        
        // Platformu fizik dünyasına ekle
        this.physics.world.addBody(platformBody);
        
            console.log('Kelebek Vadisi platform fizik gövdesi eklendi, boyut:', platformSize, 'yükseklik:', collisionHeight);
        
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
                console.log('Fizik gövdesi debug mesh eklendi');
            }
        }
        
        console.log('Kelebek Vadisi için platform eklendi, boyut:', platformSize);
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
                <h3 style="margin: 0 0 10px 0; color: #4285f4;">Kelebek Vadisi</h3>
                <p style="margin: 0 0 10px 0;">Konya Tropikal Kelebek Bahçesi, Türkiye'nin en büyük kelebek uçuş alanına sahip tesisidir.</p>
                <p style="margin: 0 0 10px 0;">Çeşitli tropikal kelebek türlerini doğal yaşam alanlarında gözlemleyebilirsiniz.</p>
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