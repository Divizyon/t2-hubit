import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import CANNON from 'cannon'

export default class JaponParki {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.mixer = null;
        this.model = null;
        this.collisionBody = null;
        this.setModel();
        
        if (this.time) {
            this.time.on('tick', () => {
                this.tick(this.time.delta * 0.001);
            });
        } else {
            console.warn('JaponParki: time parametresi verilmedi, animasyonlar çalışmayacak.');
        }
    }

    setModel() {
        if (!this.scene) {
            console.warn('JaponParki: scene parametresi verilmedi, model sahneye eklenmeyecek.');
            return;
        }

        const loader = new GLTFLoader();
        loader.load('./models/japon_parki/japon_parki.glb', (gltf) => {
            console.log('Japon Parkı modeli yüklendi:', gltf);
            console.log('Animasyonlar:', gltf.animations);
            
            this.model = gltf.scene;
            this.model.position.set(-3, -35, 0); // Konumu Japon Parkı için ayarla
            this.model.scale.set(0.3, 0.3, 0.3); // Ölçeği düşürüyorum
            
            // Modeli döndür - ihtiyaca göre değiştirilebilir
            this.model.rotation.x = Math.PI / 2;
            
            this.scene.add(this.model);

            // Fizik gövdesi oluştur
            if (this.physics) {
                // Model için bir bounding box hesapla
                const boundingBox = new THREE.Box3().setFromObject(this.model);
                const size = boundingBox.getSize(new THREE.Vector3());
                
                // Fizik gövdesi oluştur
                this.collisionBody = new CANNON.Body({
                    mass: 0, // Statik nesne
                    position: new CANNON.Vec3(25, 60, 0), // Modelin konumuyla aynı
                    material: this.physics.materials.items.floor
                });
                
                // Box şekli ekle
                const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
                const boxShape = new CANNON.Box(halfExtents);
                this.collisionBody.addShape(boxShape);
                
                this.physics.world.addBody(this.collisionBody);
            }

            // Materyal ve mesh kontrolü
            this.model.traverse((child) => {
                if (child.isMesh) {
                    console.log('Mesh bulundu:', child.name);
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Eğer materyal yoksa veya MeshBasicMaterial ise düzelt
                    if (!child.material) {
                        child.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                    }
                    if (child.material && child.material.type === 'MeshBasicMaterial') {
                        child.material = new THREE.MeshStandardMaterial({ 
                            color: child.material.color || 0xffffff,
                            roughness: 0.8,
                            metalness: 0.2
                        });
                    }
                    
                    // Materyal ayarları
                    child.material.transparent = false;
                    child.material.opacity = 1;
                }
            });

            // Animasyonları başlat (eğer varsa)
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
                console.log('Japon Parkı modelinde animasyon yok.');
            }
        });
    }

    tick(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }
}
