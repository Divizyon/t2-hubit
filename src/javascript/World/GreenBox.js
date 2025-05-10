import * as THREE from 'three'
import * as CANNON from 'cannon'
import gsap from 'gsap'
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js'
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js'

export default class GreenBox
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.objects = _options.objects
        this.physics = _options.physics
        this.debug = _options.debug
        this.sounds = _options.sounds
        
        // Eski PopupButton'dan gelen opsiyonlar
        this.materials = _options.materials || null
        this.car = _options.car
        this.areas = _options.areas

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        // Green Box'ın konumu (sabit pozisyon)
        this.position = new THREE.Vector3(-85, 0, 0)
        
        // Popup Button'un konumu (Green Box'ın yanında)
        this.buttonPosition = {
            x: -78,  // Green Box'ın sağına
            y: -3    // Biraz arkaya
        }
        
        // Arabanın Green Box içindeki hedef konumu
        this.carTargetPosition = new THREE.Vector3(-85, 0, 0.4) // Green Box içinde uygun bir nokta
        this.carTargetRotation = new THREE.Euler(-Math.PI, -Math.PI, 90) // 90 derece sağa dönük
        
        // Popup ile ilgili özellikler
        this.interactiveArea = null       // Buton için etkileşim alanı
        this.isVisible = true             // Görünürlük - her zaman görünür olacak
        this.textureCache = {}            // Yüklenen textureları önbelleğe almak için
        this.currentAppliedImage = null   // En son uygulanan resim
        this.manualPanels = []            // Green Box panelleri
        this.panelLight = null            // Panel ışığı
        this.enterHint = null             // ENTER ipucu
        
        // ENTER ipucu elementlerini temizle
        const existingHints = document.querySelectorAll('.enter-hint')
        existingHints.forEach(hint => {
            if (hint && hint.parentNode) {
                hint.parentNode.removeChild(hint)
            }
        })
        
        // Panel özellikleri
        this.panelProperties = {
            width: 2.0,
            height: 1.8,
            positions: [
                // Arka panel (merkez)
                new THREE.Vector3(this.position.x - 1.5, this.position.y, this.position.z + 1.5),
                // Sol panel
                new THREE.Vector3(this.position.x, this.position.y - 1.5, this.position.z + 1.5),
                // Sağ panel
                new THREE.Vector3(this.position.x, this.position.y + 1.5, this.position.z + 1.5)
            ],
            rotations: [
                // Arka panel - Y ekseni etrafında 90 derece
                new THREE.Euler(0, Math.PI / 2, 0),
                // Sol panel - Y ekseni etrafında 0 derece
                new THREE.Euler(0, 0, 0),
                // Sağ panel - Y ekseni etrafında 180 derece
                new THREE.Euler(0, Math.PI, 0)
            ]
        }
        
        // Arkaplan verileri - yeşil ekran arka plan resimleri
        this.backgrounds = [
            { 
                id: 'mnzr1', 
                name: 'Manzara 1', 
                color: '#e1c78f',
                image: '/static/images/manzaralar/mnzr1.jpg',
                fallbackImages: [
                    '/static/mnzr1.jpg',
                    'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ]
            },
            { 
                id: 'mnzr2', 
                name: 'Manzara 2', 
                color: '#87ceeb',
                image: '/static/images/manzaralar/mnzr2.jpg',
                fallbackImages: [
                    '/static/mnzr2.jpg',
                    'https://images.unsplash.com/photo-1520942702018-0862200e6873?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ]
            },
            { 
                id: 'mnzr3', 
                name: 'Manzara 3', 
                color: '#228b22',
                image: '/static/images/manzaralar/mnzr3.jpg',
                fallbackImages: [
                    '/static/mnzr3.jpg',
                    'https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ]
            },
            { 
                id: 'mnzr4', 
                name: 'Manzara 4', 
                color: '#696969',
                image: '/static/images/manzaralar/mnzr4.jpg',
                fallbackImages: [
                    '/static/mnzr4.jpg',
                    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ]
            },
            { 
                id: 'mnzr5', 
                name: 'Manzara 5', 
                color: '#4682b4',
                image: '/static/images/manzaralar/mnzr5.jpg',
                fallbackImages: [
                    '/static/mnzr5.jpg',
                    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ]
            }
        ];

        // Model oluştur
        this.setModel()
        
        // Popup butonu oluştur
        this.setupButton()
        this.setupPopupImage()
        this.setupKeyboardEvents()
        this.setupInteractiveArea()
        
        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('greenBox')
            this.debugFolder.add(this, 'resetPosition').name('Reset Position')
        }
    }

    setModel()
    {
        this.model = {}
        
        // Resources
        this.model.resource = this.resources.items.greenBoxModel
        this.model.collisionResource = this.resources.items.greenBoxCollision

        // Add to objects - Sabit obje (mass: 0)
        this.model.object = this.objects.add({
            base: this.model.resource.scene,
            collision: this.model.collisionResource.scene,
            offset: this.position,
            rotation: new THREE.Euler(0, 0, 0),
            mass: 0 // Sabit obje
        })
        
        // Yeşil materyal referansını al
        this.findGreenMaterial();
        
        // Manuel fizik bileşeni oluşturma
        const boxMaterial = this.physics.materials.items.dummy
        
        // Fizik gövdesi oluştur - statik bir nesne
        const body = new CANNON.Body({
            mass: 0, // 0 kütle = statik nesne
            material: boxMaterial,
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            type: CANNON.Body.STATIC
        })
        
        // Oda boyutları
        const width = 5;  // x-ekseni genişliği
        const length = 6;  // y-ekseni uzunluğu
        const height = 12; // z-ekseni yüksekliği
        
        // Duvar konumlarını modele yaklaştır
        const backWallDistance = 2.3;  // Daha küçük değer = modele daha yakın (eski değer: length/2 = 5)
        const leftWallDistance = 2.3;  // Daha küçük değer = modele daha yakın (eski değer: width/2 = 5)

        // Kamera objesinin konumu - görüntüdeki pozisyona göre yaklaşık değerler
        const cameraPosition = {
            x: this.position.x + 5.9, 
            y: this.position.y-5.8,     // kamera collisionun konumu
            z: this.position.z      
        };

        // Arka duvar (pozitif Y yönünde) - GreenBox'ın arkasına
        const backWallSize = new CANNON.Vec3(width/2, 0.5, height/2) // x, y, z yarı genişlikler
        const backWallShape = new CANNON.Box(backWallSize)
        body.addShape(backWallShape, new CANNON.Vec3(0, backWallDistance, 0)) // Modele daha yakın
        
        // Sol duvar (negatif X yönünde) - GreenBox'ın soluna
        const leftWallSize = new CANNON.Vec3(0.5, length/2, height/2)
        const leftWallShape = new CANNON.Box(leftWallSize)
        body.addShape(leftWallShape, new CANNON.Vec3(-leftWallDistance, 0, 0)) // Modele daha yakın
        
        // Kamera çarpışma engeli - kamera etrafında küçük bir engel
        const cameraSize = new CANNON.Vec3(0.8, 0.8, 1.5) // Kamera boyutu (x, y, z yarı genişlikler)
        const cameraShape = new CANNON.Box(cameraSize)
        body.addShape(
            cameraShape, 
            new CANNON.Vec3(
                cameraPosition.x - this.position.x, 
                cameraPosition.y - this.position.y, 
                cameraPosition.z - this.position.z + 1 // Kamera yüksekliği için hafif yukarıda
            )
        )
        
        // Fizik dünyasına ekle
        this.physics.world.addBody(body)
        
        // Debug için görsel helper'lar
        if (this.debug) {
            this.wallHelpers = new THREE.Group()
            
            // Arka duvar helper
            const backWallHelper = new THREE.Mesh(
                new THREE.BoxGeometry(backWallSize.x * 2, backWallSize.y * 2, backWallSize.z * 2),
                new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
            )
            backWallHelper.position.set(
                this.position.x, 
                this.position.y + backWallDistance, 
                this.position.z
            )
            this.wallHelpers.add(backWallHelper)
            
            // Sol duvar helper
            const leftWallHelper = new THREE.Mesh(
                new THREE.BoxGeometry(leftWallSize.x * 2, leftWallSize.y * 2, leftWallSize.z * 2),
                new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
            )
            leftWallHelper.position.set(
                this.position.x - leftWallDistance, 
                this.position.y, 
                this.position.z
            )
            this.wallHelpers.add(leftWallHelper)
            
            // Kamera collision helper
            const cameraHelper = new THREE.Mesh(
                new THREE.BoxGeometry(cameraSize.x * 2, cameraSize.y * 2, cameraSize.z * 2),
                new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
            )
            cameraHelper.position.set(
                cameraPosition.x,
                cameraPosition.y,
                cameraPosition.z + 1 // Kamera yüksekliğini ayarla
            )
            this.wallHelpers.add(cameraHelper)
            
            this.wallHelpers.visible = false
            this.container.add(this.wallHelpers)
            
            // Debug paneline gösterge ekle
            this.debugFolder.add(this.wallHelpers, 'visible').name('Show Collision Walls')
        }
        
        // Model referansı 
        this.model.collision = {
            body: body,
            reset: () => this.resetPosition()
        }
        
        // Başlangıç pozisyonunu kaydet
        this.originalPosition = {
            position: body.position.clone(),
            quaternion: body.quaternion.clone()
        }
    }
    
    // Pozisyonu sıfırlama (debug için)
    resetPosition() {
        if(this.model.collision && this.model.collision.body) {
            this.model.collision.body.position.copy(this.originalPosition.position)
            this.model.collision.body.quaternion.copy(this.originalPosition.quaternion)
            this.model.collision.body.velocity.set(0, 0, 0)
            this.model.collision.body.angularVelocity.set(0, 0, 0)
            this.model.collision.body.wakeUp()
        }
    }

    // Update metodu - her frame'de çağrılır
    update() {
        // Buton artık her zaman görünür
        if (this.button && this.button.container) {
            this.button.container.visible = true;
            
            // Etkileşim alanını aktifleştir
            if (this.interactiveArea) {
                this.interactiveArea.activate();
            }
        }
    }

    setupButton()
    {
        console.log('GreenBox: setupButton çağrıldı', {
            materials: !!this.materials,
            car: !!this.car,
            areas: !!this.areas
        });
        
        this.button = {}

        // Container
        this.button.container = new THREE.Object3D()
        this.button.container.position.x = this.buttonPosition.x
        this.button.container.position.y = this.buttonPosition.y
        this.button.container.matrixAutoUpdate = false
        this.button.container.updateMatrix()
        this.container.add(this.button.container)

        // Alan çerçevesi (AreaFloorBorderGeometry kullanarak)
        if (this.materials && this.materials.items && this.materials.items.areaFloorBorder) {
            console.log('GreenBox: floorBorder oluşturuluyor');
            // Boyutu küçültüldü (4,4 -> 2,2)
            const floorBorderGeometry = new AreaFloorBorderGeometry(2, 2, 0.3)
            this.button.floorBorder = new THREE.Mesh(
                floorBorderGeometry,
                this.materials.items.areaFloorBorder.clone()
            )
            this.button.floorBorder.matrixAutoUpdate = false
            this.button.floorBorder.updateMatrix()
            this.button.container.add(this.button.floorBorder)
        } else {
            console.warn('GreenBox: Materials yok veya areaFloorBorder bulunamadı', this.materials);
        }
        
        // Alan duvarları (AreaFenceGeometry kullanarak)
        if (this.materials && this.materials.items && this.materials.items.areaGradientTexture) {
            console.log('GreenBox: fence oluşturuluyor');
            // Boyutu küçültüldü (4,4 -> 2,2)
            const fenceGeometry = new AreaFenceGeometry(2, 2, 0.3)
            
            // Duvar materyali
            const fenceMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                side: THREE.DoubleSide,
                alphaMap: this.materials.items.areaGradientTexture,
                color: 0x4285f4 // Mavi
            })
            
            this.button.fence = new THREE.Mesh(fenceGeometry, fenceMaterial)
            this.button.fence.position.z = 0.15 // Yükseklik azaltıldı
            this.button.fence.matrixAutoUpdate = false
            this.button.fence.updateMatrix()
            this.button.container.add(this.button.fence)
        } else {
            console.warn('GreenBox: Materials yok veya areaGradientTexture bulunamadı');
        }

        // Button Etiketi/İkonu - silindir olmadan sadece etiket
        this.createButtonLabel()
        
        // Başlangıçta görünür yap
        this.button.container.visible = true
        
        // Buton animasyonu ve ışıldama efekti
        this.animateButton()
    }

    createButtonLabel()
    {
        // Canvas ile etiket oluştur
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = 512 // Daha yüksek çözünürlük
        canvas.height = 256
        
        // Arkaplan (buton üzerinde daha belirgin olması için)
        const gradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, 0,
            canvas.width/2, canvas.height/2, canvas.width/2
        )
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)')
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0)')
        
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // "ENTER" metni - Daha küçük yazı tipi
        ctx.fillStyle = 'white'
        ctx.font = 'bold 48px Arial' // Küçültüldü (64px -> 48px)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('ENTER', canvas.width/2, canvas.height/2)
        
        // Yazı etrafına glow efekti
        ctx.shadowColor = '#4285f4'
        ctx.shadowBlur = 15 // Azaltıldı (20 -> 15)
        ctx.fillText('ENTER', canvas.width/2, canvas.height/2)

        // Texture oluştur
        const texture = new THREE.CanvasTexture(canvas)
        texture.magFilter = THREE.LinearFilter
        texture.minFilter = THREE.LinearFilter

        // Etiket mesh'i oluştur - Boyutu küçültüldü
        const labelGeometry = new THREE.PlaneGeometry(1.5, 0.6) // Küçültüldü (2.5, 1 -> 1.5, 0.6)
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide // Her iki taraftan da görünür
        })

        this.button.label = new THREE.Mesh(labelGeometry, labelMaterial)
        this.button.label.position.z = 0.2 // Yükseklik azaltıldı (0.3 -> 0.2)
        this.button.container.add(this.button.label)
    }
    
    animateButton()
    {
        // Butonun yüksekliğini hafifçe değiştiren animasyon
        const animate = () => {
            const time = Date.now() * 0.001 // saniye cinsinden
            
            if (this.button && this.button.container) {
                // Buton yükseklik animasyonu
                this.button.container.position.z = Math.sin(time * 2) * 0.1
                
                // Buton dönme animasyonu
                if (this.button.label) {
                    this.button.label.rotation.z = Math.sin(time) * 0.05 // Daha az sallanma
                }
                
                // Alan görsellerini güncelle
                if (this.button.fence) {
                    this.button.fence.material.opacity = 0.5 + Math.sin(time * 2) * 0.2
                }
            }
            
            requestAnimationFrame(animate)
        }
        
        animate()
    }

    setupInteractiveArea()
    {
        console.log('GreenBox: setupInteractiveArea çağrıldı', {
            areas: !!this.areas
        });
        
        // Etkileşimli alan oluştur (AreaFence gibi)
        if (this.areas) {
            // Etkileşimli alan ekle - Boyutu küçültüldü
            this.interactiveArea = this.areas.add({
                position: new THREE.Vector2(this.buttonPosition.x, this.buttonPosition.y),
                halfExtents: new THREE.Vector2(1.5, 1.5), // Küçültüldü (3, 3 -> 1.5, 1.5)
                floorShadowType: 'primary',
                debug: false
            });
            
            console.log('GreenBox: interactiveArea oluşturuldu', this.interactiveArea);
            
            // Artık interactiveArea'nın interact olayını kullanmıyoruz,
            // çünkü sadece Enter tuşu ile tetiklenecek
            
            // Buton hover etkisi - araç içeri girdiğinde
            this.interactiveArea.on('in', () => {
                // Buton hover efekti - mesh yerine label ve fence kullan
                if (this.button && this.button.label) {
                    gsap.to(this.button.label.position, { 
                        z: 0.5, // Yükselme efekti
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                }
                
                // Renk değişimi - fence için
                if (this.button && this.button.fence && this.button.fence.material) {
                    gsap.to(this.button.fence.material.color, {
                        r: 0.1,
                        g: 0.7,
                        b: 1.0,
                        duration: 0.3
                    });
                }
                
                // Enter ipucunu göstermeyi kaldırdık
            });
            
            // Buton hover çıkışı - araç dışarı çıktığında
            this.interactiveArea.on('out', () => {
                // Buton hover çıkış efekti
                if (this.button && this.button.label) {
                    gsap.to(this.button.label.position, { 
                        z: 0.3, // Normal yükseklik
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                }
                
                // Orijinal renk - fence için
                if (this.button && this.button.fence && this.button.fence.material) {
                    gsap.to(this.button.fence.material.color, {
                        r: 0.25,
                        g: 0.52,
                        b: 0.95,
                        duration: 0.3
                    });
                }
                
                // İpucunu kaldır metodu artık çalışmayacak
                this.hideEnterHint();
            });
        } else {
            console.warn('GreenBox: Areas bulunamadı, interactiveArea oluşturulamıyor');
        }
    }
    
    setupPopupImage()
    {
        this.popup = {}
        this.popup.visible = false
        this.popup.selectedImage = null;
        this.popup.currentIndex = 0; // Aktif görünen kartın indeksi

        // HTML Popup oluştur (3D yerine) - Çerçevesiz tasarım
        const popupHTML = document.createElement('div');
        popupHTML.className = 'popup-container';
        popupHTML.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0);
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: Arial, sans-serif;
            box-shadow: none;
            z-index: 1000;
            padding: 15px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, transform 0.3s;
            width: 600px;
            height: 480px;
            overflow: hidden;
        `;

        // Kaydırılabilir container
        const carouselContainer = document.createElement('div');
        carouselContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
        `;
        
        // Manzara resimleri - çoklu alternatif yollar deneyerek
        const manzaralar = [
            { 
                id: 'mnzr1', 
                image: '/static/images/manzaralar/mnzr1.jpg',
                fallbackImages: [
                    '/static/mnzr1.jpg',
                    'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ] 
            },
            { 
                id: 'mnzr2', 
                image: '/static/images/manzaralar/mnzr2.jpg',
                fallbackImages: [
                    '/static/mnzr2.jpg',
                    'https://images.unsplash.com/photo-1520942702018-0862200e6873?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ] 
            },
            { 
                id: 'mnzr3', 
                image: '/static/images/manzaralar/mnzr3.jpg',
                fallbackImages: [
                    '/static/mnzr3.jpg',
                    'https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ] 
            },
            { 
                id: 'mnzr4', 
                image: '/static/images/manzaralar/mnzr4.jpg',
                fallbackImages: [
                    '/static/mnzr4.jpg',
                    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ] 
            },
            { 
                id: 'mnzr5', 
                image: '/static/images/manzaralar/mnzr5.jpg',
                fallbackImages: [
                    '/static/mnzr5.jpg',
                    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                ] 
            }
        ];
        
        // Tüm kartları tutan dizi
        const allCards = [];
        
        // Sürükleme ve scroll için değişkenler
        let isDragging = false;
        let startY = 0;
        let startIndex = 0;
        
        // Her manzara için card oluştur
        manzaralar.forEach((manzara, index) => {
            // Resim kartı - sadeleştirilmiş tasarım
            const card = document.createElement('div');
            card.className = 'manzara-card';
            card.dataset.id = manzara.id;
            card.dataset.index = index;
            card.style.cssText = `
                position: absolute;
                width: 420px;
                background-color: #333;
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.4s ease;
                box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                transform: translateY(${index === 0 ? '-180px' : (index === 1 ? '0' : '180px')}) scale(${index === 1 ? 1 : 0.8});
                opacity: ${index === 1 ? 1 : 0.6};
                z-index: ${index === 1 ? 3 : (index < 1 ? 2 : 1)};
                ${index > 2 ? 'display: none;' : ''}
            `;
            
            // Tıklama olayı - seçim işlevi ve kaydırma
            card.addEventListener('click', () => {
                // Eğer sürükleme esnasında tıklanmışsa, normal tıklama olarak değerlendirme
                if (isDragging) return;
                
                // Eğer ortadaki kart ise seç
                if (parseInt(card.dataset.index) === this.popup.currentIndex + 1) {
                    // Seçilen kartı işaretle
                    this.popup.selectedImage = manzara;
                    
                    // Önceki seçili kartların işaretlerini kaldır
                    allCards.forEach(c => {
                        if (c.querySelector('.check-icon')) {
                            c.querySelector('.check-icon').style.opacity = '0';
                        }
                    });
                    
                    // Bu kartı işaretle
                    card.querySelector('.check-icon').style.opacity = '1';
                    
                    // Resmi yeşil ekrana uygula
                    this.changeBackgroundImage(manzara);
                    
                    // Sadece arabayı ışınla
                    setTimeout(() => {
                        this.teleportCarToGreenBox();
                    }, 800);
                    
                    // Popup'ı otomatik olarak kapat
                    setTimeout(() => {
                        this.hidePopup();
                    }, 500); // Kullanıcıya seçtiğini görmesi için kısa bir süre bekle
                } 
                // Eğer üstteki kart ise bir yukarı kay
                else if (parseInt(card.dataset.index) === this.popup.currentIndex) {
                    this.navigateCarousel('prev');
                } 
                // Eğer alttaki kart ise bir aşağı kay
                else if (parseInt(card.dataset.index) === this.popup.currentIndex + 2) {
                    this.navigateCarousel('next');
                }
            });
            
            // Resim - tam kart boyutunda
            const image = document.createElement('div');
            image.style.cssText = `
                width: 100%;
                height: 270px;
                background-image: url('${manzara.image}');
                background-size: cover;
                background-position: center;
                display: flex;
                align-items: center;
                justify-content: center;
                color: transparent;
                font-size: 0;
            `;
            
            // Alternatif olarak img elementi de ekleyelim
            const imgElement = document.createElement('img');
            imgElement.src = manzara.image;
            imgElement.alt = `Manzara ${manzara.id}`;
            imgElement.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 1;
            `;
            
            // Fallback mekanizması için tüm alternatifleri deneyelim
            let currentFallbackIndex = 0;
            
            imgElement.onerror = () => {
                if (manzara.fallbackImages && currentFallbackIndex < manzara.fallbackImages.length) {
                    imgElement.src = manzara.fallbackImages[currentFallbackIndex];
                    currentFallbackIndex++;
                } else {
                    imgElement.style.display = 'none';
                    image.style.backgroundColor = '#333';
                    image.innerHTML += '<div style="color:white;padding:10px;">Manzara resmi</div>';
                }
            };
            
            imgElement.onload = () => {
            };
            
            image.appendChild(imgElement);
            
            // Onay işareti ikonu
            const checkIcon = document.createElement('div');
            checkIcon.className = 'check-icon';
            checkIcon.style.cssText = `
                position: absolute;
                top: 15px;
                right: 15px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background-color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            
            // Tik işareti
            const check = document.createElement('div');
            check.style.cssText = `
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background-color: #2ecc71;
            `;
            checkIcon.appendChild(check);
            
            card.appendChild(image);
            card.appendChild(checkIcon);
            carouselContainer.appendChild(card);
            
            // Kartı diziye ekle
            allCards.push(card);
        });
        
        // Sürükleme ve scroll özelliği ekle
        carouselContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startIndex = this.popup.currentIndex;
            carouselContainer.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.popup.visible) return;
            
            const deltaY = e.clientY - startY;
            const sensitivity = 20; // Daha küçük değer = daha hassas sürükleme
            
            if (deltaY > sensitivity) {
                this.navigateCarousel('prev');
                isDragging = false;
            } else if (deltaY < -sensitivity) {
                this.navigateCarousel('next');
                isDragging = false;
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (this.popup.visible) {
                carouselContainer.style.cursor = 'default';
            }
        });
        
        // Scroll özelliği ekle
        carouselContainer.addEventListener('wheel', (e) => {
            if (!this.popup.visible) return;
            
            // Wheel event'inin sayfa zoomunu tetiklemesini engelle
            e.preventDefault();
            e.stopPropagation();
            
            // Yukarı scroll ise prev, aşağı scroll ise next
            if (e.deltaY < 0) {
                this.navigateCarousel('prev');
            } else {
                this.navigateCarousel('next');
            }
        }, { passive: false });
        
        // Sayfa zoom'unu engelle (dokunmatik cihazlar için)
        popupHTML.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Sayfa zoom'unu engelle (klavye için)
        popupHTML.addEventListener('keydown', (e) => {
            // Ctrl+'+', Ctrl+'-' gibi zoom kısayollarını engelle
            if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
                e.preventDefault();
            }
        });
        
        // Gezinme metodunu ekle
        this.navigateCarousel = (direction) => {
            // Toplam kart sayısı
            const totalCards = manzaralar.length;
            
            // Mevcut indeksi güncelle - döngülü navigasyon
            if (direction === 'next') {
                // Son elemana geldiysek başa dön
                if (this.popup.currentIndex >= totalCards - 3) {
                    this.popup.currentIndex = 0;
                } else {
                    this.popup.currentIndex++;
                }
            } else if (direction === 'prev') {
                // İlk elemana geldiysek sona dön
                if (this.popup.currentIndex <= 0) {
                    this.popup.currentIndex = totalCards - 3;
                } else {
                    this.popup.currentIndex--;
                }
            }
            
            // Tüm kartları güncelle
            allCards.forEach((card, i) => {
                const relativeIndex = i - this.popup.currentIndex;
                const wrappedIndex = (relativeIndex + totalCards) % totalCards; // Döngüsel indeks
                
                // Görünürlük durumunu ayarla (0, 1, 2 konumlarındakiler görünür)
                if (wrappedIndex >= 0 && wrappedIndex <= 2) {
                    card.style.display = 'block';
                    
                    // Pozisyon
                    card.style.transform = `translateY(${wrappedIndex === 0 ? '-180px' : (wrappedIndex === 1 ? '0' : '180px')}) scale(${wrappedIndex === 1 ? 1 : 0.8})`;
                    
                    // Opaklık
                    card.style.opacity = wrappedIndex === 1 ? 1 : 0.6;
                    
                    // z-index
                    card.style.zIndex = wrappedIndex === 1 ? 3 : (wrappedIndex < 1 ? 2 : 1);
                } else {
                    card.style.display = 'none';
                }
            });
        };
        
        // Tüm öğeleri ekle
        popupHTML.appendChild(carouselContainer);
        
        // Popup'ı sayfaya ekle
        document.body.appendChild(popupHTML);
        
        // Popup referansını sakla
        this.popup.htmlElement = popupHTML;
    }

    setupKeyboardEvents()
    {
        // Enter tuşu kontrolü
        window.addEventListener('keydown', (event) => {
            // Sadece Enter tuşuna basıldığında ve araç butonun yakınındayken çalışsın
            if (event.key === 'Enter' && this.isCarInside()) {
                // Popup'ı göster (ama arabayı henüz ışınlama)
                this.togglePopup();
            }
            // ESC tuşu ile kapatma
            else if (event.key === 'Escape' && this.popup.visible) {
                this.hidePopup();
            }
            // Ok tuşlarıyla navigasyon
            else if (this.popup.visible) {
                if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                    this.navigateCarousel('prev');
                    event.preventDefault();
                } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                    this.navigateCarousel('next');
                    event.preventDefault();
                }
            }
        });
    }
    
    // Arabanın butonun etkileşim alanı içinde olup olmadığını kontrol eden metod
    isCarInside() {
        if (!this.car || !this.car.chassis || !this.car.chassis.object) {
            return false;
        }
        
        // Araç pozisyonu
        const carPosition = this.car.chassis.object.position;
        
        // Buton merkezi ile araç arasındaki mesafe
        const distance = Math.sqrt(
            Math.pow(carPosition.x - this.buttonPosition.x, 2) + 
            Math.pow(carPosition.y - this.buttonPosition.y, 2)
        );
        
        // Etkileşim alanı yarıçapı - floorBorder geometrisinin yarısı
        const interactionRadius = 1; // Küçültüldü (2 -> 1)
        
        // Araç çerçeve içinde mi?
        return distance < interactionRadius;
    }
    
    togglePopup()
    {
        if (this.popup.visible) {
            this.hidePopup()
        } else {
            this.showPopup()
        }
    }
    
    showPopup()
    {
        this.popup.visible = true;
        
        // HTML popup'ı göster
        if (this.popup.htmlElement) {
            this.popup.htmlElement.style.visibility = 'visible';
            this.popup.htmlElement.style.opacity = '1';
            this.popup.htmlElement.style.transform = 'translate(-50%, -50%) scale(1)';
            
            // Arka plandaki oyun etkileşimini engelle
            this.createGameBlocker();
            
            // Araç kontrolünü devre dışı bırak
            this.disableCarControls();
        } else {
            // HTML element bulunamadı
        }
    }
    
    hidePopup()
    {
        this.popup.visible = false;
        
        // HTML popup'ı gizle
        if (this.popup.htmlElement) {
            this.popup.htmlElement.style.visibility = 'hidden';
            this.popup.htmlElement.style.opacity = '0';
            this.popup.htmlElement.style.transform = 'translate(-50%, -50%) scale(0.8)';
            
            // Oyun etkileşim engelleyicisini kaldır
            this.removeGameBlocker();
            
            // Araç kontrolünü tekrar etkinleştir
            this.enableCarControls();
        }
    }
    
    // Enter tuşu ipucunu göster - İşlevsiz hale getirildi
    showEnterHint() {
        // İpucu özelliği kaldırıldı
    }
    
    // Enter tuşu ipucunu gizle
    hideEnterHint() {
        if (this.enterHint) {
            this.enterHint.style.opacity = '0';
            
            // İpucu elementini tamamen kaldır
            setTimeout(() => {
                if (this.enterHint && this.enterHint.parentNode) {
                    document.body.removeChild(this.enterHint);
                    this.enterHint = null;
                }
            }, 300);
        }
    }
    
    createGameBlocker() 
    {
        // Eğer zaten bir blocker varsa, tekrar oluşturma
        if (this.gameBlocker) return;
        
        // Tüm ekranı kaplayan ve tıklamaları yakalayan ama görünmez bir overlay oluştur
        this.gameBlocker = document.createElement('div');
        this.gameBlocker.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            cursor: default;
            backdrop-filter: blur(3px);
        `;
        
        // Tıklama olayını yakala ve popup dışında tıklanırsa popup'ı kapat
        this.gameBlocker.addEventListener('click', (e) => {
            // Eğer popup dışına tıklandıysa kapat
            if (e.target === this.gameBlocker) {
                this.hidePopup();
            }
        });
        
        document.body.appendChild(this.gameBlocker);
    }
    
    removeGameBlocker() 
    {
        // Eğer game blocker varsa kaldır
        if (this.gameBlocker && this.gameBlocker.parentNode) {
            document.body.removeChild(this.gameBlocker);
            this.gameBlocker = null;
        }
    }

    // Araç kontrollerini devre dışı bırak
    disableCarControls() {
        // Orijinal ok tuşu işleyicilerini yedekle ve geçersiz kıl
        if (!this._originalKeydownHandler && this.car && this.car.controls) {
            // Sayfadaki tüm keydown event listener'ları kaldırılamaz,
            // bunun yerine event.stopPropagation ve event.preventDefault kullanacağız
            this._keydownHandler = (event) => {
                if (this.popup.visible) {
                    // Eğer popup açıksa ve ok tuşları kullanılıyorsa, araç kontrollerini engelle
                    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                        // Sadece navigasyon kullan
                        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                            this.navigateCarousel('prev');
                        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                            this.navigateCarousel('next');
                        }
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            };
            
            // Olay dinleyicisini ekle
            document.addEventListener('keydown', this._keydownHandler, true);
        }
    }
    
    // Araç kontrollerini tekrar etkinleştir
    enableCarControls() {
        // Orijinal event listener'ı geri yükle
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler, true);
            this._keydownHandler = null;
        }
    }

    // Arabayı Green Box'ın içine teleport et
    teleportCarToGreenBox() {
        console.log('Teleport işlemi başlatılıyor...');
        
        if (!this.physics || !this.physics.car || !this.physics.car.chassis || !this.physics.car.chassis.body) {
            console.error('Teleport işlemi için gerekli fizik bileşenleri bulunamadı:', {
                physics: !!this.physics,
                car: this.physics ? !!this.physics.car : false,
                chassis: this.physics && this.physics.car ? !!this.physics.car.chassis : false,
                body: this.physics && this.physics.car && this.physics.car.chassis ? !!this.physics.car.chassis.body : false
            });
            return false;
        }
        
        try {
            // Arabanın fizik gövdesini al
            const carBody = this.physics.car.chassis.body;
            
            console.log('Araç mevcut pozisyonu:', {
                x: carBody.position.x,
                y: carBody.position.y,
                z: carBody.position.z
            });
            
            // Arabayı uyku moduna al (fizik etkileşimlerini durdur)
            carBody.sleep();
            
            // Green Box'ın içindeki hedef pozisyona teleport et
            // YÜKSEK POZİSYON: z değerini arttırarak yukarıdan düşmeyi sağlama
            carBody.position.x = this.carTargetPosition.x;
            carBody.position.y = this.carTargetPosition.y;
            carBody.position.z = this.carTargetPosition.z + 5; // 5 birim yukarıda başlat (10'dan düşürüldü)
            
            // Hedef rotasyonu quaternion'a çevir
            const quaternion = new CANNON.Quaternion();
            quaternion.setFromEuler(
                this.carTargetRotation.x,
                this.carTargetRotation.y,
                this.carTargetRotation.z,
                'XYZ'
            );
            
            // Rotasyonu ayarla
            carBody.quaternion.copy(quaternion);
            
            // Hızı sıfırla
            carBody.velocity.set(0, 0, 0);
            carBody.angularVelocity.set(0, 0, 0);
            
            // Arabayı aktifleştir
            carBody.wakeUp();
            
            console.log('Araç yeni pozisyonu:', {
                x: carBody.position.x,
                y: carBody.position.y,
                z: carBody.position.z
            });
            
            // Teleport sonrası kamera shake efekti
            if (this.car && this.car.camera && this.car.camera.shake) {
                this.car.camera.shake(0.5, 300); // Efekti de biraz azalttık (0.8 -> 0.5)
            }
            
            console.log('Teleport işlemi tamamlandı');
            
            // İşlem başarılı
            return true;
        } catch(error) {
            console.error('Teleport işlemi sırasında hata:', error);
            return false;
        }
    }
    
    // Seçilen görüntüyü Green Box panellerine uygula
    applyImageToGreenBox(manzara) {
        console.log('Green Box panellerine resim uygulanıyor:', manzara.id);
        
        // Panel yoksa ilk önce panelleri oluştur
        if (this.manualPanels.length === 0) {
            console.log('Paneller henüz oluşturulmamış, oluşturuluyor...');
            this.createPanels();
        }
        
        // Başarılı bir şekilde paneller oluşturulduysa
        if (this.manualPanels.length > 0) {
            console.log(`${this.manualPanels.length} panel bulundu, texture yükleniyor...`);
            // Texture yükle
            this.loadTextureForPanels(manzara);
            
            // Ekstra güvenlik - resimleri 3D ortamda daha görünür kılmak için bir kez daha kontrol et
            setTimeout(() => {
                // Panellerin texture'ını kontrol et
                let textureApplied = false;
                this.manualPanels.forEach(panel => {
                    if (panel.material && panel.material.map) {
                        textureApplied = true;
                    }
                });
                
                if (!textureApplied) {
                    console.warn('Texture uygulaması başarısız olabilir, tekrar deneniyor...');
                    this.loadTextureForPanels(manzara);
                }
            }, 300);
            
            // Resim uygulandıktan sonra arabayı Green Box içine ışınla
            setTimeout(() => {
                console.log('Araba Green Box\'a ışınlanıyor...');
                // Arabayı Green Box'a ışınla
                this.teleportCarToGreenBox();
            }, 800); // Resmin yüklenmesi için biraz daha uzun bekle
        } else {
            console.error('Panel oluşturma başarısız oldu!');
        }
    }
    
    // Panelleri oluştur
    createPanels() {
        console.log('Green Box panelleri oluşturuluyor');
        
        // Eski panelleri temizle
        this.manualPanels.forEach(panel => {
            if (panel.parent) {
                panel.parent.remove(panel);
            }
        });
        this.manualPanels = [];
        
        // Green Box merkezi
        const boxCenter = this.position.clone();
        
        // Paneller için daha yansıtıcı materyal (siyah başlangıç rengiyle)
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.2,
            roughness: 0.3,
            emissive: 0x111111,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide // Her iki taraftan da görünür
        });
        
        // Siyah yüzeylere uygun panel pozisyonları
        const panelConfigs = [
            // Arka panel (Z eksenine dik, Green Box'ın arkasında)
            {
                geometry: new THREE.PlaneGeometry(6, 6),
                position: new THREE.Vector3(boxCenter.x - 2.5, boxCenter.y, boxCenter.z + 3),
                rotation: new THREE.Euler(0, Math.PI / 2, 0),
                name: "ArkaSiyahPanel"
            },
            // Taban panel (Y eksenine dik, Green Box'ın tabanı)
            {
                geometry: new THREE.PlaneGeometry(6, 5),
                position: new THREE.Vector3(boxCenter.x, boxCenter.y, boxCenter.z + 0.1),
                rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
                name: "TabanSiyahPanel"
            },
            // Sağ yan panel (X eksenine dik, ön taraftan bakıldığında sağda)
            {
                geometry: new THREE.PlaneGeometry(5, 6),
                position: new THREE.Vector3(boxCenter.x, boxCenter.y + 2.5, boxCenter.z + 3),
                rotation: new THREE.Euler(0, Math.PI, 0),
                name: "SagSiyahPanel"
            }
        ];
        
        // Her panel için döngü
        panelConfigs.forEach(config => {
            const panel = new THREE.Mesh(
                config.geometry,
                panelMaterial.clone() // Her panel için ayrı materyal klonu
            );
            
            panel.name = config.name;
            panel.position.copy(config.position);
            panel.rotation.copy(config.rotation);
            
            // Panel materyaline emissive ekle (daha parlak görünmesi için)
            panel.material.emissive = new THREE.Color(0x222222);
            panel.material.emissiveIntensity = 0.3;
            
            // Gölge alabilir
            panel.receiveShadow = true;
            
            // Container'a ekle
            this.container.add(panel);
            
            // Panel listesine ekle
            this.manualPanels.push(panel);
        });
        
        // Panel ışığı ekle (yüzeylerin daha iyi görünmesi için)
        if (!this.panelLight) {
            // Ana ışık
            this.panelLight = new THREE.PointLight(0xffffff, 2.0, 20);
            this.panelLight.position.set(
                boxCenter.x, 
                boxCenter.y, 
                boxCenter.z + 5
            );
            this.container.add(this.panelLight);
            
            // Dolgu ışıkları
            const fillLights = [
                // Sağ ön
                {
                    position: new THREE.Vector3(boxCenter.x + 2, boxCenter.y + 2, boxCenter.z + 3),
                    intensity: 0.8
                },
                // Sol ön
                {
                    position: new THREE.Vector3(boxCenter.x + 2, boxCenter.y - 2, boxCenter.z + 3),
                    intensity: 0.8
                },
                // Arka orta
                {
                    position: new THREE.Vector3(boxCenter.x - 4, boxCenter.y, boxCenter.z + 3),
                    intensity: 1.0
                }
            ];
            
            fillLights.forEach((light, index) => {
                const fillLight = new THREE.PointLight(0xffffff, light.intensity, 15);
                fillLight.position.copy(light.position);
                this.container.add(fillLight);
                // Referansı saklayalım ki daha sonra temizleyebilelim
                this[`fillLight${index}`] = fillLight;
            });
        }
        
        console.log(`${this.manualPanels.length} panel oluşturuldu`);
    }
    
    // Paneller için texture yükle
    loadTextureForPanels(manzara) {
        // Önceki uygulanmış resmi kaydet
        this.currentAppliedImage = manzara;
        
        // Texture önbellekte var mı kontrol et
        if (this.textureCache[manzara.id]) {
            console.log('Texture önbellekten yükleniyor:', manzara.id);
            this.applyTextureToAllPanels(this.textureCache[manzara.id]);
            return;
        }
        
        // Yeni texture yükle
        const textureLoader = new THREE.TextureLoader();
        
        // Ana resmi yüklemeyi dene
        this.loadImageWithFallback(manzara, 0);
    }
    
    // Fallback ile görsel yükleme
    loadImageWithFallback(manzara, fallbackIndex = 0) {
        // Kullanılacak görsel URL'si
        let imageUrl = manzara.image;
        
        // Eğer fallback indeksi varsa ve fallbackImages dizisi tanımlanmışsa
        if (fallbackIndex > 0 && manzara.fallbackImages && manzara.fallbackImages.length >= fallbackIndex) {
            imageUrl = manzara.fallbackImages[fallbackIndex - 1];
        }
        
        // Görsel yükleme
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous';
        
        textureLoader.load(
            imageUrl,
            (texture) => {
                console.log('Texture yüklendi:', imageUrl);
                
                // Texture ayarları
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                
                // Texture önbelleğe kaydet
                this.textureCache[manzara.id] = texture;
                
                // Yeni materyal oluştur
                const newMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.FrontSide
                });
                
                // Materyali uygula
                this.applyMaterialWithTransition(newMaterial);
            },
            undefined,
            (error) => {
                console.warn(`Görsel yüklenemedi (${imageUrl}):`, error);
                
                // Fallback görsellerini dene
                const maxFallbackIndex = manzara.fallbackImages ? manzara.fallbackImages.length : 0;
                
                if (fallbackIndex < maxFallbackIndex) {
                    console.log(`Alternatif görsel deneniyor (${fallbackIndex + 1}/${maxFallbackIndex})...`);
                    this.loadImageWithFallback(manzara, fallbackIndex + 1);
                } else {
                    console.error('Tüm görseller yüklenemedi, düz renk kullanılıyor');
                }
            }
        );
    }
    
    // Texture'ı tüm panellere uygula
    applyTextureToAllPanels(texture) {
        // Texture ayarları
        texture.encoding = THREE.sRGBEncoding;
        texture.flipY = false;
        texture.anisotropy = 16; // Daha net görüntü için anisotropik filtreleme
        
        console.log('Texture panellere uygulanıyor...');
        
        // Tüm panellere texture'ı uygula
        this.manualPanels.forEach((panel, index) => {
            // Texture'ı panele uygula
            panel.material.map = texture;
            
            // Panel materyalini geliştir
            panel.material.needsUpdate = true;
            panel.material.transparent = true;
            panel.material.opacity = 1.0;
            
            // Materyal ayarlarını güncelle - texture ile daha iyi görünmesi için
            panel.material.color.set(0xffffff); // Beyaz materyal (texture'ın renklerini göstermek için)
            panel.material.emissive.set(0x333333); // Daha güçlü emissive
            panel.material.emissiveIntensity = 0.5; // Daha parlak
            panel.material.emissiveMap = texture; // Texture'ı emissive map olarak da kullan
            
            // Materyal yansıma özelliklerini iyileştir
            panel.material.roughness = 0.2; // Daha pürüzsüz 
            panel.material.metalness = 0.1; // Az metalik
            
            console.log(`Panel ${index+1} texture uygulandı, materyal güncellendi`);
            
            // Animasyonla fadeIn efekti ekleyelim
            gsap.fromTo(panel.material, 
                { opacity: 0 }, 
                { opacity: 1, duration: 1.0, ease: "power2.inOut" }
            );
        });
        
        // Işıkları daha parlak yapalım
        if (this.panelLight) {
            gsap.to(this.panelLight, { intensity: 3.0, duration: 0.8 });
            console.log('Panel ışıkları güçlendirildi');
        }
        
        console.log('Texture tüm panellere başarıyla uygulandı');
    }

    // Yeşil materyal referansını bulup sakla
    findGreenMaterial() {
        // Green Box model taraması
        this.greenPart = null;
        this.originalGreenMaterial = null;
        
        console.log('GreenBox: Yeşil parça aranıyor...');
        
        if(this.model && this.model.object && this.model.object.container) {
            // Önce tüm mesh'leri ve materyalleri konsola yazdır
            console.log('GreenBox: Model içindeki tüm mesh\'ler:');
            
            const allMeshes = [];
            this.model.object.container.traverse((child) => {
                if(child instanceof THREE.Mesh) {
                    console.log(`Mesh: ${child.name}, Materyal: ${child.material ? (child.material.name || 'İsimsiz') : 'Yok'}`);
                    if(child.material && child.material.color) {
                        console.log(`  Renk: R=${child.material.color.r.toFixed(2)}, G=${child.material.color.g.toFixed(2)}, B=${child.material.color.b.toFixed(2)}`);
                    }
                    
                    // Geometri boyutu da yazdır (büyük yeşil parçayı tespit etmek için)
                    if(child.geometry) {
                        const size = new THREE.Vector3();
                        child.geometry.computeBoundingBox();
                        child.geometry.boundingBox.getSize(size);
                        console.log(`  Boyut: X=${size.x.toFixed(2)}, Y=${size.y.toFixed(2)}, Z=${size.z.toFixed(2)}`);
                        
                        // Vertex sayısını da yazdır
                        const vertexCount = child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
                        console.log(`  Vertex sayısı: ${vertexCount}`);
                    }
                    
                    allMeshes.push(child);
                }
            });
            
            console.log(`Toplam ${allMeshes.length} mesh bulundu`);
            
            // Doğrudan "pureUc" isimli parçayı ara - bu genellikle yeşil ekranı temsil eder
            this.model.object.container.traverse((child) => {
                if(child instanceof THREE.Mesh && child.name === 'pureUc') {
                    console.log('GreenBox: "pureUc" adlı yeşil parça bulundu');
                    this.greenPart = child;
                    return;
                }
            });
            
            // Doğrudan Cube.002 (genellikle yeşil kısım) isimli parçayı ara
            if(!this.greenPart) {
                this.model.object.container.traverse((child) => {
                    if(child instanceof THREE.Mesh && child.name === 'Cube.002') {
                        console.log('GreenBox: "Cube.002" adlı yeşil parça bulundu');
                        this.greenPart = child;
                        return;
                    }
                });
            }
            
            // Hem renk hem de boyut kriterlerini birlikte kullan
            if(!this.greenPart) {
                console.log('GreenBox: İsim eşleşmedi, renk ve boyut ile yeşil parça aranıyor');
                
                // Yeşil ve büyük mesh'leri bul
                const greenLargeMeshes = [];
                
                this.model.object.container.traverse((child) => {
                    if(child instanceof THREE.Mesh && child.material && child.material.color && child.geometry) {
                        const color = child.material.color;
                        
                        // Belirgin yeşil renk koşulu
                        const isGreen = color.g > color.r * 1.5 && color.g > color.b * 1.5 && color.g > 0.4;
                        
                        // Boyut hesapla - büyük parçalar için
                        let isLarge = false;
                        if(child.geometry) {
                            const size = new THREE.Vector3();
                            child.geometry.computeBoundingBox();
                            child.geometry.boundingBox.getSize(size);
                            
                            // Minimum boyut eşiği - ana yeşil parça genellikle büyüktür
                            isLarge = (size.x > 2 || size.y > 2 || size.z > 2);
                            
                            // Vertex sayısı da yüksek olmalı
                            const vertexCount = child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
                            const hasHighVertexCount = vertexCount > 100;
                            
                            if(isGreen && (isLarge || hasHighVertexCount)) {
                                console.log(`GreenBox: Büyük ve yeşil mesh bulundu: ${child.name}`);
                                greenLargeMeshes.push({
                                    mesh: child,
                                    size: size,
                                    vertexCount: vertexCount,
                                    greenness: color.g
                                });
                            }
                        }
                    }
                });
                
                if(greenLargeMeshes.length > 0) {
                    // Önce boyut ve vertex sayısına göre sırala, sonra yeşillik derecesine göre
                    greenLargeMeshes.sort((a, b) => {
                        // Önce vertex sayısı yüksek olanlar
                        if(a.vertexCount > b.vertexCount * 1.5) return -1;
                        if(b.vertexCount > a.vertexCount * 1.5) return 1;
                        
                        // Sonra boyutu büyük olanlar
                        const aVolume = a.size.x * a.size.y * a.size.z;
                        const bVolume = b.size.x * b.size.y * b.size.z;
                        if(aVolume > bVolume * 1.5) return -1;
                        if(bVolume > aVolume * 1.5) return 1;
                        
                        // Son olarak daha yeşil olanlar
                        return b.greenness - a.greenness;
                    });
                    
                    this.greenPart = greenLargeMeshes[0].mesh;
                    console.log(`GreenBox: En uygun yeşil mesh seçildi: ${this.greenPart.name}`);
                } else {
                    console.log('GreenBox: Büyük ve yeşil mesh bulunamadı');
                }
            }
            
            // Son çare: En büyük mesh'i bul
            if(!this.greenPart) {
                console.log('GreenBox: Yeşil parça bulunamadı, en büyük mesh aranıyor');
                
                // Mesh'leri boyuta göre sırala
                const sortedBySize = [...allMeshes].filter(mesh => mesh.geometry).map(mesh => {
                    const size = new THREE.Vector3();
                    mesh.geometry.computeBoundingBox();
                    mesh.geometry.boundingBox.getSize(size);
                    const volume = size.x * size.y * size.z;
                    return { mesh, volume, vertexCount: mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count : 0 };
                }).sort((a, b) => {
                    // Önce hacmi büyük olanlar
                    if(a.volume > b.volume * 1.5) return -1;
                    if(b.volume > a.volume * 1.5) return 1;
                    
                    // Sonra vertex sayısı yüksek olanlar
                    return b.vertexCount - a.vertexCount;
                });
                
                if(sortedBySize.length > 0) {
                    this.greenPart = sortedBySize[0].mesh;
                    console.log(`GreenBox: En büyük mesh seçildi: ${this.greenPart.name}, Hacim: ${sortedBySize[0].volume.toFixed(2)}`);
                }
            }
            
            // Bulunan parçanın orijinal materyalini sakla
            if(this.greenPart && this.greenPart.material) {
                this.originalGreenMaterial = this.greenPart.material.clone();
                console.log('GreenBox: Orijinal materyal kaydedildi');
                
                // Parçanın bilgilerini yazdır
                console.log('Seçilen parça bilgileri:');
                console.log(`- Adı: ${this.greenPart.name}`);
                console.log(`- Materyal türü: ${this.greenPart.material.type}`);
                if(this.greenPart.material.color) {
                    console.log(`- Renk: R=${this.greenPart.material.color.r.toFixed(2)}, G=${this.greenPart.material.color.g.toFixed(2)}, B=${this.greenPart.material.color.b.toFixed(2)}`);
                }
                
                // Geçici olarak renk değiştirerek test et
                const testMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(1, 0, 0), // Parlak kırmızı - daha kolay görünür
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });
                
                // Geçici materyali uygula
                const oldMaterial = this.greenPart.material;
                this.greenPart.material = testMaterial;
                
                // 1.5 saniye sonra geri al
                setTimeout(() => {
                    this.greenPart.material = oldMaterial;
                    console.log('GreenBox: Test materyali kaldırıldı, orijinal materyal geri yüklendi');
                }, 1500);
                
                return true;
            } else {
                console.error('GreenBox: Uygun parça bulunamadı veya materyal yok!');
                return false;
            }
        } else {
            console.error('GreenBox: Model veya container bulunamadı!');
            return false;
        }
    }
    
    // Arkaplanı değiştir
    changeBackgroundImage(manzara) {
        if(!this.greenPart) {
            console.error('GreenBox: Yeşil ekran parçası bulunamadı!');
            return;
        }
        
        console.log('GreenBox: Arkaplan değiştiriliyor:', manzara.id);
        
        // Texture önbellekte var mı kontrol et
        if(this.textureCache[manzara.id]) {
            console.log('Texture önbellekten yükleniyor:', manzara.id);
            this.applyBackgroundTexture(this.textureCache[manzara.id]);
            return;
        }
        
        // Önce geçici olarak düz renk uygula
        const tempMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(manzara.color || '#00ff00'),
            side: THREE.FrontSide
        });
        
        // Geçici materyali uygula
        this.applyMaterialWithTransition(tempMaterial);
        
        // Texture'ı yükle
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous'; // CORS için gerekli
        
        // Ana resmi yüklemeyi dene
        this.loadImageWithFallback(manzara, 0);
    }
    
    // Texture'ı arka plana uygula
    applyBackgroundTexture(texture) {
        if(!this.greenPart) {
            console.error('GreenBox: Yeşil ekran parçası bulunamadı!');
            return;
        }
        
        // Yeni materyal oluştur
        const newMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.FrontSide
        });
        
        // Materyali uygula
        this.applyMaterialWithTransition(newMaterial);
    }
    
    // Materyal geçişi
    applyMaterialWithTransition(newMaterial) {
        if(!this.greenPart) return;
        
        // Geçiş için yeni materyali klonla
        const transitionMaterial = newMaterial.clone();
        transitionMaterial.transparent = true;
        transitionMaterial.opacity = 0;
        
        // Geçici olarak geçiş materyalini ata
        this.greenPart.material = transitionMaterial;
        
        // Animasyon ile geçiş
        gsap.to(transitionMaterial, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete: () => {
                // Animasyon tamamlandığında orijinal materyali ata
                this.greenPart.material = newMaterial;
            }
        });
    }
    
    // Orijinal yeşil materyale geri dön
    resetBackground() {
        if(!this.greenPart || !this.originalGreenMaterial) return;
        
        // Animasyonlu geçiş
        this.applyMaterialWithTransition(this.originalGreenMaterial.clone());
        console.log('GreenBox: Arkaplan orijinal rengine döndürüldü');
    }
    
    // Arkaplan texture'ı yükleme yardımcısı
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.crossOrigin = 'anonymous'; // CORS için gerekli
            
            loader.load(
                url,
                (texture) => {
                    // Texture başarıyla yüklendi
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    resolve(texture);
                },
                undefined, // Progress callback
                (error) => {
                    // Hata olduğunda
                    console.error('GreenBox: Texture yüklenemedi:', error);
                    reject(error);
                }
            );
        });
    }
}
