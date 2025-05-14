import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import CANNON from 'cannon'
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js'
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js'
import gsap from 'gsap'

export default class JaponParki {
    constructor(_options) {
        this.time = _options.time;
        this.scene = _options.scene;
        this.physics = _options.physics;
        this.areas = _options.areas;
        this.materials = _options.materials;
        this.mixer = null;
        this.model = null;
        this.collisionBody = null;
        this.collisionMeshes = [];
        
        // Ana çarpışma kutusu pozisyonu, boyutu ve rotasyonu
        this.collisionPosition = _options.collisionPosition || new THREE.Vector3(-4.5, -32, 1);
        this.collisionSize = _options.collisionSize || new THREE.Vector3(4.8, 15.5, 26);
        this.collisionRotation = _options.collisionRotation || new THREE.Euler(0, 0, 0);
        
        // Sağ çıkıntı için çarpışma kutusu özellikleri
        this.rightBoxPosition = _options.rightBoxPosition || new THREE.Vector3(5, 0, 0);
        this.rightBoxSize = _options.rightBoxSize || new THREE.Vector3(3, 4, 5);
        this.rightBoxRotation = _options.rightBoxRotation || new THREE.Euler(0, 0, 0);
        
        // Üçüncü çarpışma kutusu özellikleri
        this.thirdBoxPosition = _options.thirdBoxPosition || new THREE.Vector3(0, -10, 0);
        this.thirdBoxSize = _options.thirdBoxSize || new THREE.Vector3(5, 3, 5);
        this.thirdBoxRotation = _options.thirdBoxRotation || new THREE.Euler(0, 0, -Math.PI / 4);
        
        // Buton konumu
        this.buttonPosition = new THREE.Vector3(6.5, -21, 0);
        
        this.setModel();
        
        // Buton kurulumu
        if (this.areas && this.materials) {
            this.setupButton();
        }
        
        // Çarpışma kutusunu başlangıçta görünmez yap
        this.setCollisionVisibility(false);
        
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
            this.model.position.set(-5.5, -34, 1); // Konumu Japon Parkı için ayarla
            this.model.scale.set(0.48, 0.48, 0.48); // Ölçeği 0.5'ten 0.48'e düşürüldü
            
            // Modeli döndür - ihtiyaca göre değiştirilebilir
            this.model.rotation.x = Math.PI / 2;
            
            this.scene.add(this.model);

            // Fizik gövdesi oluştur
            if (this.physics) {
                // Bileşik bir çarpışma şekli oluşturacağız
                this.collisionBody = new CANNON.Body({
                    mass: 0, // Statik nesne
                    position: new CANNON.Vec3(
                        this.collisionPosition.x,
                        this.collisionPosition.y,
                        this.collisionPosition.z
                    ),
                    material: this.physics.materials.items.floor
                });
                
                // Quaternion oluştur - CANNON için rotasyonları quaternion'a dönüştürmeliyiz
                const mainQuaternion = new CANNON.Quaternion();
                mainQuaternion.setFromEuler(
                    this.collisionRotation.x,
                    this.collisionRotation.y,
                    this.collisionRotation.z,
                    'XYZ'
                );
                
                // Ana yapı için kutu
                const mainBoxShape = new CANNON.Box(new CANNON.Vec3(
                    this.collisionSize.x * 0.7 / 2,
                    this.collisionSize.y / 2,
                    this.collisionSize.z / 2
                ));
                
                // Ana kutuyu rotasyonu ile birlikte ekle
                this.collisionBody.addShape(
                    mainBoxShape, 
                    new CANNON.Vec3(-2, 0, 0),
                    mainQuaternion
                );
                
                // Sağ kutu için quaternion
                const rightQuaternion = new CANNON.Quaternion();
                rightQuaternion.setFromEuler(
                    this.rightBoxRotation.x,
                    this.rightBoxRotation.y,
                    this.rightBoxRotation.z,
                    'XYZ'
                );
                
                // Sağ taraftaki çıkıntı için daha küçük kutu (giriş alanı)
                const rightBoxShape = new CANNON.Box(new CANNON.Vec3(
                    this.rightBoxSize.x / 2,
                    this.rightBoxSize.y / 2,
                    this.rightBoxSize.z / 2
                ));
                
                // Sağ kutuyu rotasyonu ile birlikte ekle
                this.collisionBody.addShape(
                    rightBoxShape, 
                    new CANNON.Vec3(
                        this.rightBoxPosition.x,
                        this.rightBoxPosition.y,
                        this.rightBoxPosition.z
                    ),
                    rightQuaternion
                );
                
                // Üçüncü kutu için quaternion - Z ekseni etrafında 45 derece
                const thirdQuaternion = new CANNON.Quaternion();
                thirdQuaternion.setFromEuler(
                    this.thirdBoxRotation.x,
                    this.thirdBoxRotation.y,
                    this.thirdBoxRotation.z,
                    'XYZ'
                );
                
                // Üçüncü kutu
                const thirdBoxShape = new CANNON.Box(new CANNON.Vec3(
                    this.thirdBoxSize.x / 2,
                    this.thirdBoxSize.y / 2,
                    this.thirdBoxSize.z / 2
                ));
                
                // Üçüncü kutuyu rotasyonu ile birlikte ekle
                this.collisionBody.addShape(
                    thirdBoxShape, 
                    new CANNON.Vec3(
                        this.thirdBoxPosition.x,
                        this.thirdBoxPosition.y,
                        this.thirdBoxPosition.z
                    ),
                    thirdQuaternion
                );
                
                this.physics.world.addBody(this.collisionBody);
                
                // Görünür çarpışma kutuları oluştur
                this.collisionMeshes = [];
                
                // Ana mesh
                const mainGeometry = new THREE.BoxGeometry(
                    this.collisionSize.x * 0.7,
                    this.collisionSize.y,
                    this.collisionSize.z
                );
                
                const collisionMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                    opacity: 0.5,
                    transparent: true,
                    visible: false
                });
                
                this.collisionMesh = new THREE.Mesh(mainGeometry, collisionMaterial);
                this.collisionMesh.position.copy(this.collisionPosition);
                this.collisionMesh.position.x -= 2; // Ana şekil biraz sola kaydırıldı
                this.collisionMesh.rotation.copy(this.collisionRotation);
                this.scene.add(this.collisionMesh);
                this.collisionMeshes.push(this.collisionMesh);
                
                // Sağ çıkıntı mesh
                const rightGeometry = new THREE.BoxGeometry(
                    this.rightBoxSize.x,
                    this.rightBoxSize.y,
                    this.rightBoxSize.z
                );
                const rightMesh = new THREE.Mesh(rightGeometry, collisionMaterial.clone());
                rightMesh.position.copy(this.collisionPosition);
                rightMesh.position.x += this.rightBoxPosition.x;
                rightMesh.position.y += this.rightBoxPosition.y;
                rightMesh.position.z += this.rightBoxPosition.z;
                rightMesh.rotation.copy(this.rightBoxRotation);
                this.scene.add(rightMesh);
                this.collisionMeshes.push(rightMesh);
                
                // Üçüncü çıkıntı mesh - Z ekseninde 45 derece dönük
                const thirdGeometry = new THREE.BoxGeometry(
                    this.thirdBoxSize.x,
                    this.thirdBoxSize.y,
                    this.thirdBoxSize.z
                );
                const thirdMesh = new THREE.Mesh(thirdGeometry, collisionMaterial.clone());
                thirdMesh.position.copy(this.collisionPosition);
                thirdMesh.position.x += this.thirdBoxPosition.x;
                thirdMesh.position.y += this.thirdBoxPosition.y;
                thirdMesh.position.z += this.thirdBoxPosition.z;
                thirdMesh.rotation.copy(this.thirdBoxRotation); // Z ekseni etrafında 45 derece
                this.scene.add(thirdMesh);
                this.collisionMeshes.push(thirdMesh);
                
                console.log('Japon Parkı çarpışma kutusu eklendi (bileşik):', 
                    'Pozisyon:', this.collisionPosition, 
                    'Boyut:', this.collisionSize
                );
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

    // Çarpışma kutusunun görünürlüğünü değiştiren metod
    setCollisionVisibility(visible) {
        if (this.collisionMeshes && this.collisionMeshes.length > 0) {
            this.collisionMeshes.forEach((mesh) => {
                mesh.visible = visible;
            });
        }
    }
    
    // Çarpışma kutusu pozisyonunu güncelleme metodu
    updateCollisionPosition(newPosition) {
        if (!this.collisionMeshes || this.collisionMeshes.length === 0) return;
        
        this.collisionPosition.copy(newPosition);
        
        // Ana mesh pozisyonunu güncelle
        this.collisionMeshes[0].position.copy(newPosition);
        this.collisionMeshes[0].position.x = newPosition.x - 2; // Ana şekil biraz sola kaydırıldı
        
        // Sağ çıkıntı mesh pozisyonunu güncelle
        if (this.collisionMeshes.length > 1) {
            this.collisionMeshes[1].position.copy(newPosition);
            this.collisionMeshes[1].position.x += this.rightBoxPosition.x;
            this.collisionMeshes[1].position.y += this.rightBoxPosition.y;
            this.collisionMeshes[1].position.z += this.rightBoxPosition.z;
        }
        
        // Üçüncü çıkıntı mesh pozisyonunu güncelle
        if (this.collisionMeshes.length > 2) {
            this.collisionMeshes[2].position.copy(newPosition);
            this.collisionMeshes[2].position.x += this.thirdBoxPosition.x;
            this.collisionMeshes[2].position.y += this.thirdBoxPosition.y;
            this.collisionMeshes[2].position.z += this.thirdBoxPosition.z;
        }
        
        // Fizik gövdesini de güncelle
        if (this.collisionBody) {
            this.collisionBody.position.set(newPosition.x, newPosition.y, newPosition.z);
        }
        
        console.log('Japon Parkı çarpışma kutusu pozisyonu güncellendi:', newPosition);
    }
    
    // Çarpışma kutusu boyutunu güncelleme metodu
    updateCollisionSize(newSize) {
        if (!this.collisionMeshes || this.collisionMeshes.length === 0) return;
        
        this.collisionSize.copy(newSize);
        
        // Tüm eski meshlerden kurtul
        this.collisionMeshes.forEach(mesh => {
            mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            this.scene.remove(mesh);
        });
        
        // Bellekte yer açmak için diziyi temizle
        this.collisionMeshes = [];
        
        // Fizik gövdesini kaldır ve yeniden oluştur
        if (this.collisionBody) {
            this.physics.world.removeBody(this.collisionBody);
            
            // Yeni bileşik fizik gövdesi oluştur
            this.collisionBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(
                    this.collisionPosition.x,
                    this.collisionPosition.y,
                    this.collisionPosition.z
                ),
                material: this.physics.materials.items.floor
            });
            
            // Ana yapı için kutu
            const mainBoxShape = new CANNON.Box(new CANNON.Vec3(
                newSize.x * 0.7 / 2,
                newSize.y / 2,
                newSize.z / 2
            ));
            
            // Ana kutuyu ekle
            const mainQuaternion = new CANNON.Quaternion();
            mainQuaternion.setFromEuler(
                this.collisionRotation.x,
                this.collisionRotation.y,
                this.collisionRotation.z,
                'XYZ'
            );
            
            this.collisionBody.addShape(
                mainBoxShape, 
                new CANNON.Vec3(-2, 0, 0),
                mainQuaternion
            );
            
            // Sağ kutu için quaternion
            const rightQuaternion = new CANNON.Quaternion();
            rightQuaternion.setFromEuler(
                this.rightBoxRotation.x,
                this.rightBoxRotation.y,
                this.rightBoxRotation.z,
                'XYZ'
            );
            
            // Sağ taraftaki çıkıntı için daha küçük kutu
            const rightBoxShape = new CANNON.Box(new CANNON.Vec3(
                this.rightBoxSize.x / 2,
                this.rightBoxSize.y / 2,
                this.rightBoxSize.z / 2
            ));
            
            // Sağ kutuyu ekle
            this.collisionBody.addShape(
                rightBoxShape, 
                new CANNON.Vec3(
                    this.rightBoxPosition.x,
                    this.rightBoxPosition.y,
                    this.rightBoxPosition.z
                ),
                rightQuaternion
            );
            
            // Üçüncü kutu için quaternion
            const thirdQuaternion = new CANNON.Quaternion();
            thirdQuaternion.setFromEuler(
                this.thirdBoxRotation.x,
                this.thirdBoxRotation.y,
                this.thirdBoxRotation.z,
                'XYZ'
            );
            
            // Üçüncü kutu
            const thirdBoxShape = new CANNON.Box(new CANNON.Vec3(
                this.thirdBoxSize.x / 2,
                this.thirdBoxSize.y / 2,
                this.thirdBoxSize.z / 2
            ));
            
            // Üçüncü kutuyu ekle
            this.collisionBody.addShape(
                thirdBoxShape, 
                new CANNON.Vec3(
                    this.thirdBoxPosition.x,
                    this.thirdBoxPosition.y,
                    this.thirdBoxPosition.z
                ),
                thirdQuaternion
            );
            
            this.physics.world.addBody(this.collisionBody);
        }
        
        // Yeni görünür çarpışma kutuları oluştur
        const collisionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            opacity: 0.5,
            transparent: true,
            visible: false
        });
        
        // Ana mesh
        const mainGeometry = new THREE.BoxGeometry(
            newSize.x * 0.7,
            newSize.y,
            newSize.z
        );
        const mainMesh = new THREE.Mesh(mainGeometry, collisionMaterial);
        mainMesh.position.copy(this.collisionPosition);
        mainMesh.position.x -= 2; // Ana şekil biraz sola kaydırıldı
        mainMesh.rotation.copy(this.collisionRotation);
        this.scene.add(mainMesh);
        this.collisionMeshes.push(mainMesh);
        
        // Sağ çıkıntı mesh
        const rightGeometry = new THREE.BoxGeometry(
            this.rightBoxSize.x,
            this.rightBoxSize.y,
            this.rightBoxSize.z
        );
        const rightMesh = new THREE.Mesh(rightGeometry, collisionMaterial.clone());
        rightMesh.position.copy(this.collisionPosition);
        rightMesh.position.x += this.rightBoxPosition.x;
        rightMesh.position.y += this.rightBoxPosition.y;
        rightMesh.position.z += this.rightBoxPosition.z;
        rightMesh.rotation.copy(this.rightBoxRotation);
        this.scene.add(rightMesh);
        this.collisionMeshes.push(rightMesh);
        
        // Üçüncü çıkıntı mesh
        const thirdGeometry = new THREE.BoxGeometry(
            this.thirdBoxSize.x,
            this.thirdBoxSize.y,
            this.thirdBoxSize.z
        );
        const thirdMesh = new THREE.Mesh(thirdGeometry, collisionMaterial.clone());
        thirdMesh.position.copy(this.collisionPosition);
        thirdMesh.position.x += this.thirdBoxPosition.x;
        thirdMesh.position.y += this.thirdBoxPosition.y;
        thirdMesh.position.z += this.thirdBoxPosition.z;
        thirdMesh.rotation.copy(this.thirdBoxRotation);
        this.scene.add(thirdMesh);
        this.collisionMeshes.push(thirdMesh);
        
        console.log('Japon Parkı çarpışma kutusu boyutu güncellendi (bileşik):', newSize);
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
            <h3 style="margin: 0 0 10px 0; color: #4285f4;">Japon Parkı</h3>
            <p style="margin: 0 0 10px 0;">Japon Parkı hakkında detaylı bilgi burada yer alacak.</p>
            <a href="https://www.konya.bel.tr/hizmet-binalari-ve-sosyal-tesisler/japon-parki" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: bold;">Daha Fazla Bilgi →</a>
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
                        window.open('https://www.konya.bel.tr/hizmet-binalari-ve-sosyal-tesisler/japon-parki', '_blank');
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
                window.open('https://www.konya.bel.tr/hizmet-binalari-ve-sosyal-tesisler/japon-parki', '_blank');
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
