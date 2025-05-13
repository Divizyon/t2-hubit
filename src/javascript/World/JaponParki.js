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
        
        // Buton konumu
        this.buttonPosition = new THREE.Vector3(3, -18, 0);
        
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
            this.model.position.set(-7, -34, 0); // Konumu Japon Parkı için ayarla
            this.model.scale.set(0.5, 0.5, 0.5); // Ölçeği düşürüyorum
            
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
        ctx.fillText('OPEN', canvas.width/2, canvas.height/2)
        
        ctx.shadowColor = '#4285f4'
        ctx.shadowBlur = 25
        ctx.fillText('OPEN', canvas.width/2, canvas.height/2)

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
