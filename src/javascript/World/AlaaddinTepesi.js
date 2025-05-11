import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import CANNON from 'cannon'

export default class AlaaddinTepesi {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.mixer = null;
        this.model = null;
        this.collisionBody = null;
        
        // Platform
        this.platform = null;
        
        this.setModel();
        this.createPlatform();
        
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
            this.model.position.set(6, -40, 1.5); // Z pozisyonunu 5 birim yükselttim
            this.model.scale.set(1, 1, 1);
            
            // Modeli döndür
            this.model.rotation.x = Math.PI / 2;
            
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
            console.warn('AlaaddinTepesi: scene parametresi verilmedi, platform eklenmeyecek.');
            return;
        }
        
        // Kare platform oluştur
        const platformSize = 26; // Kare platformun bir kenar uzunluğu (14*2)
        const platformGeometry = new THREE.BoxGeometry(platformSize, platformSize, 1); // Kare platform
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080, // Gri
            metalness: 0.5,  // Daha az metalik
            roughness: 0.5,  // Daha mat yüzey
        });
        
        this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
        this.platform.position.set(4.5, -38, 0); // Modelin altında
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
                position: new CANNON.Vec3(4.5, -38, 0), // Platform ile aynı pozisyon (güncellendi)
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