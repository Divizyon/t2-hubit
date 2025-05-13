import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import CANNON from 'cannon'

export default class Ekran3D {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.resources = _options.resources;
        this.mixer = null;
        this.model = null;
        this.collisionBody = null;
        this.setModel();
        
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
            this.model.position.set(37, -36, 0); // Pozisyonu ayarlayabilirsiniz
            this.model.scale.set(1, 1, 1); // Ölçeği ayarlayabilirsiniz
            
            // Modeli döndür
            this.model.rotation.x = 0;
            this.model.rotation.y = 0;
            this.model.rotation.z = Math.PI / 2;
            
            this.scene.add(this.model);

            // Fizik gövdesi ekle
            if (this.physics) {
                // Modelin boyutlarını hesapla
                const boundingBox = new THREE.Box3().setFromObject(this.model);
                const size = boundingBox.getSize(new THREE.Vector3());
                
                // Collision için özel pozisyon kullanılıyor
                const collisionPosition = new THREE.Vector3(37, -36, 2);
                
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
                    visible: false // Görünürlüğü tamamen kapat
                });
                
                this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
                this.collisionMesh.position.copy(collisionPosition);
                this.collisionMesh.rotation.set(this.model.rotation.x, this.model.rotation.y, this.model.rotation.z);
                this.scene.add(this.collisionMesh);
                
                console.log('3D Ekran için görünür collision mesh eklendi:', 
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

    tick(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }
} 