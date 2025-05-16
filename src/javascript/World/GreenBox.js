import * as THREE from 'three'
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
        this.position = new THREE.Vector3(-73, -40, 0)
        
        // Popup Button'un konumu (Green Box'ın yanında)
        this.buttonPosition = {
            x: -64,  // Green Box ile aynı x pozisyonu
            y: -40   // Green Box'ın biraz önünde
        }
        
        // Arabanın Green Box içindeki hedef konumu
        this.carTargetPosition = new THREE.Vector3(-73, -40, 0.4) // Green Box içinde uygun bir nokta
        this.carTargetRotation = new THREE.Euler(-Math.PI, -Math.PI, 120) // 90 derece sağa dönük
        
        // Popup ile ilgili özellikler
        this.interactiveArea = null       // Buton için etkileşim alanı
        this.isVisible = true             // Görünürlük - her zaman görünür olacak
        this.textureCache = {}            // Yüklenen textureları önbelleğe almak için
        this.currentAppliedImage = null   // En son uygulanan resim
        this.manualPanels = []            // Green Box panelleri
        this.panelLight = null            // Panel ışığı
        this.enterHint = null             // ENTER ipucu
        
        // Reset kontrolü için flag
        this.forceResetBackground = false // Zorla reset için flag
        this.resetAttempts = 0           // Reset deneme sayısı
        this.carExitTime = null          // Arabanın GreenBox'tan çıkış zamanı
        this.resetInProgress = false     // Reset işleminin devam edip etmediği
        this._lastInsideState = false    // Son içeride olma durumu (debug için)
        this._lastDebugOutsideState = false // Son dışarıda olma durumu (debug için)
        
        // ENTER ipucu ve hint elementlerini temizle
        const existingHints = document.querySelectorAll('.enter-hint, .enter-key-hint');
        existingHints.forEach(hint => {
            if (hint && hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        });
        
        // Panel özellikleri
        this.panelProperties = {
            width: 2.5,
            height: 1.2,
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
                id: 'col', 
                name: 'Çöl', 
                color: '#e1c78f',
                image: '/col.webp',
                fallbackImages: [
                    '/col.webp',
                    '/images/backgrounds/col.webp'
                ]
            },
            { 
                id: 'gol', 
                name: 'Göl', 
                color: '#87ceeb',
                image: '/gol.webp',
                fallbackImages: [
                    '/gol.webp',
                    '/images/backgrounds/gol.webp'
                ]
            },
            { 
                id: 'gece', 
                name: 'Gece', 
                color: '#000033',
                image: '/gece.webp',
                fallbackImages: [
                    '/gece.webp',
                    '/images/backgrounds/gece.webp'
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


        // Pozisyon ve rotasyon tanımla
        const fixedPosition = new THREE.Vector3(-50, 0, 0)
        const fixedRotation = new THREE.Euler(0, 0, 0)


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
        
        // Remove all physics/collision related code
        
        // Başlangıç pozisyonunu kaydet
        this.originalPosition = {
            position: new THREE.Vector3(this.position.x, this.position.y, this.position.z),
            quaternion: new THREE.Quaternion()
        }
    }
    
    // Pozisyonu sıfırlama (debug için)
    resetPosition() {
        // Removed physics/collision code
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
        
        // Her frame'de yeni kontrol yöntemi ile araba GreenBox alanından çıktı mı kontrol et
        this.checkCarExitStatus();
        
        // Zorla reset için flag kontrol et
        if (this.forceResetBackground) {
            console.log('!! GreenBox: forceResetBackground flag aktif, zorla sıfırlama yapılıyor !!');
            this.resetBackground();
            this.forceResetBackground = false; // Flag'i temizle
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

        // projectsPanoresimFloorTexture ile zemin oluştur
        if (this.resources && this.resources.items && this.resources.items.projectsPanoresimFloorTexture) {
            console.log('GreenBox: Projeler floor texture ile zemin oluşturuluyor');
            
            // Zemin geometrisi oluştur
            const floorGeometry = new THREE.PlaneGeometry(2, 2)
            
            // Zemin materyali oluştur
            const floorMaterial = new THREE.MeshBasicMaterial({
                map: this.resources.items.projectsPanoresimFloorTexture,
                transparent: true,
                opacity: 0.9
            })
            
            // Zemin mesh'i oluştur
            this.button.floor = new THREE.Mesh(floorGeometry, floorMaterial)
            this.button.floor.rotation.x = -Math.PI * 0.5 // Yatay pozisyon
            this.button.floor.position.z = 0.01 // Yerden hafif yüksekte
            this.button.floor.matrixAutoUpdate = false
            this.button.floor.updateMatrix()
            this.button.container.add(this.button.floor)
            
            // Koyu renk orta panel oluştur
            const panelGeometry = new THREE.PlaneGeometry(1.5, 1.5) // Kare şeklinde ve daha büyük
            const panelMaterial = new THREE.MeshBasicMaterial({
                color: 0x333333, // Koyu gri
                transparent: true,
                opacity: 0.8
            })
            
            // Panel mesh'i oluştur
            this.button.darkPanel = new THREE.Mesh(panelGeometry, panelMaterial)
            this.button.darkPanel.rotation.x = -Math.PI * 0.5 // Yatay pozisyon
            this.button.darkPanel.position.z = 0.02 // Zeminden biraz daha yüksekte
            this.button.darkPanel.matrixAutoUpdate = false
            this.button.darkPanel.updateMatrix()
            this.button.container.add(this.button.darkPanel)
        } else {
            console.warn('GreenBox: projectsPanoresimFloorTexture bulunamadı');
        }

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
        // 3D Text için konteyner oluştur
        this.button.labelContainer = new THREE.Object3D()
        this.button.labelContainer.position.z = 0.3
        this.button.container.add(this.button.labelContainer)

        // Diğer butonlar gibi canvas ile yazı oluştur
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
        ctx.fillText('ÇEKİM YAP', canvas.width/2, canvas.height/2)
        
        ctx.shadowColor = '#4285f4'
        ctx.shadowBlur = 25
        ctx.fillText('ÇEKİM YAP', canvas.width/2, canvas.height/2)

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
        this.button.label.position.z = 0.025 // Koyu panelin biraz üzerinde
        this.button.label.rotation.x = 0 // Düz görünsün
        this.button.labelContainer.add(this.button.label)

        // Label konteynerini matris güncellemesini manuel yap
        this.button.labelContainer.matrixAutoUpdate = false
        this.button.labelContainer.updateMatrix()
    }
    
    animateButton()
    {
        // Butonun yüksekliğini çok hafifçe değiştiren animasyon
        const animate = () => {
            const time = Date.now() * 0.001 // saniye cinsinden
            
            if (this.button && this.button.container) {
                // Buton yükseklik animasyonu - çok daha hafif
                this.button.container.position.z = Math.sin(time * 1.5) * 0.05;
                
                // Alan görsellerini güncelle - biraz daha az sallanma
                if (this.button.fence) {
                    this.button.fence.material.opacity = 0.6 + Math.sin(time * 1.5) * 0.1;
                }
            }
            
            requestAnimationFrame(animate);
        }
        
        animate();
    }

    setupInteractiveArea()
    {
        console.log('GreenBox: setupInteractiveArea çağrıldı', {
            areas: !!this.areas
        });
        
        // Arkaplan sıfırlama için zamanlayıcı referansı
        this.resetBackgroundTimer = null;
        
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
                // Koyu panel parlaklık artışı
                if (this.button && this.button.darkPanel && this.button.darkPanel.material) {
                    gsap.to(this.button.darkPanel.material, {
                        opacity: 1.0,
                        duration: 0.3
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
                
                // Araba tekrar alana girerse zamanlayıcıyı temizle
                if (this.resetBackgroundTimer) {
                    console.log('Araba tekrar alana girdi, zamanlayıcı iptal ediliyor...');
                    clearTimeout(this.resetBackgroundTimer);
                    this.resetBackgroundTimer = null;
                    this.forceResetBackground = false; // Force reset'i de iptal et
                }
            });
            
            // Buton hover çıkışı - araç dışarı çıktığında
            this.interactiveArea.on('out', () => {
                // Koyu panel normale dönüş
                if (this.button && this.button.darkPanel && this.button.darkPanel.material) {
                    gsap.to(this.button.darkPanel.material, {
                        opacity: 0.8,
                        duration: 0.3
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
                
                // İpucunu kaldır
                this.hideEnterHint();
            });
        } else {
            console.warn('GreenBox: Areas bulunamadı, interactiveArea oluşturulamıyor');
        }
    }
    
    setupPopupImage()
    {
        this.popup = {}
        this.popup.visible = false;
        this.popup.selectedImage = null;
        this.popup.currentIndex = 0; // Aktif görünen kartın indeksi

        // HTML Popup oluştur - Bej renkli tasarım
        const popupHTML = document.createElement('div');
        popupHTML.className = 'popup-container';
        popupHTML.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(230, 219, 197, 0.95);
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.5);
            z-index: 1000;
            padding: 28px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            width: 320px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.5);
        `;

        // Popup başlığı
        const popupTitle = document.createElement('h2');
        popupTitle.textContent = 'Arkaplan Seçimi';
        popupTitle.style.cssText = `
            color: rgba(90, 70, 40, 0.95);
            margin: 0 0 20px 0;
            padding: 0;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-align: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        popupHTML.appendChild(popupTitle);

        // Alt alta resimler için konteyner
        const imagesContainer = document.createElement('div');
        imagesContainer.style.cssText = `
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: center;
        `;
        
        // Bej renk tonu ve aksan rengi
        const bejRenk = 'rgba(165, 145, 105, 0.8)';
        // Seçili rengi - daha belirgin bir mavi ton
        const seciliRenk = 'rgba(41, 128, 185, 0.9)';
        
        // Tüm resim elementlerini tutan dizi
        const allImageElements = [];
        
        // Her arkaplan için resim oluştur
        this.backgrounds.forEach((background, index) => {
            // Resim kartı wrapper - içinde sadece image olacak, label kaldırıldı
            const cardWrapper = document.createElement('div');
            cardWrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            `;
            
            // Resim kartı - daha kare şeklinde
            const card = document.createElement('div');
            card.className = 'manzara-item';
            card.dataset.id = background.id;
            card.dataset.index = index;
            
            // Eğer bu arkaplan şu anda uygulanmış olan ise, farklı bir çerçeve rengi kullan
            let borderColor = index === 0 ? 'rgba(230, 219, 197, 0.95)' : bejRenk;
            if (this.currentAppliedImage && this.currentAppliedImage.id === background.id) {
                borderColor = seciliRenk;
            }
            
            card.style.cssText = `
                position: relative;
                width: 220px;
                height: 180px;
                background-color: transparent;
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.2s ease;
                transform: scale(1);
                border: 3px solid ${borderColor};
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            `;
            
            // Hover efekti
            card.addEventListener('mouseover', () => {
                card.style.transform = 'scale(1.02)';
                // Seçiliyse rengi değişmesin
                if (!(this.currentAppliedImage && this.currentAppliedImage.id === background.id)) {
                    card.style.border = `3px solid ${bejRenk}`;
                }
                card.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
            });
            
            card.addEventListener('mouseout', () => {
                card.style.transform = 'scale(1)';
                if (this.popup.currentIndex !== index && !(this.currentAppliedImage && this.currentAppliedImage.id === background.id)) {
                    card.style.border = '3px solid rgba(255, 255, 240, 0.4)';
                } else if (this.currentAppliedImage && this.currentAppliedImage.id === background.id) {
                    card.style.border = `3px solid ${seciliRenk}`;
                } else {
                    card.style.border = `3px solid ${bejRenk}`;
                }
                card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            });
            
            // Mouse ile tıklama - Direkt uygula
            card.addEventListener('click', () => {
                // Tüm seçimleri temizle
                allImageElements.forEach(elem => {
                    elem.style.border = '3px solid rgba(255, 255, 240, 0.4)';
                });
                
                // Bu kartı seç
                card.style.border = `3px solid ${seciliRenk}`;
                this.popup.currentIndex = index;
                
                // Seçilen manzarayı direkt uygula
                this.popup.selectedImage = background;
                
                // Seçilen manzarayı uygula
                const selectedBackground = this.backgrounds[index];
                console.log('GreenBox: Seçilen manzara:', selectedBackground.id);
                
                this.popup.selectedImage = selectedBackground;
                this.changeBackgroundImage(selectedBackground);
                
                // Arabayı ışınla
                setTimeout(() => {
                    this.teleportCarToGreenBox();
                }, 300);
                
                // Popup'ı kapat
                setTimeout(() => {
                    this.hidePopup();
                }, 500);
            });
            
            // Resim - Daha büyük ve kare şeklinde, direk kart içine
            const image = document.createElement('img');
            image.src = background.image;
            image.alt = background.name;
            image.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
                z-index: 1;
            `;
            
            // Hata durumunda düz renk göster
            image.onerror = () => {
                // Sadece resim kısmı görünsün
                image.style.display = 'none';
                const errorBox = document.createElement('div');
                errorBox.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: ${background.color};
                    z-index: 1;
                `;
                card.appendChild(errorBox);
            };
            
            // Tüm elemanları bir araya getir - Burada imgContainer kullanmıyoruz
            card.appendChild(image);
            cardWrapper.appendChild(card);
            imagesContainer.appendChild(cardWrapper);
            
            // Referans için diziye ekle - sadece card
            allImageElements.push(card);
        });
        
        popupHTML.appendChild(imagesContainer);
        
        // Popup'ı sayfaya ekle
        document.body.appendChild(popupHTML);
        
        // Popup referansını sakla
        this.popup.htmlElement = popupHTML;
        this.popup.imageElements = allImageElements;
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
            // R tuşu ile manuel reset
            else if (event.key === 'r' || event.key === 'R') {
                console.log('!! R tuşuna basıldı, manuel reset yapılıyor !!');
                this.manualResetBackground();
            }
            // Ok tuşlarıyla navigasyon
            else if (this.popup.visible) {
                if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                    this.navigateCarousel('prev');
                    event.preventDefault();
                } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                    this.navigateCarousel('next');
                    event.preventDefault();
                } else if (event.key === 'Enter') {
                    // Enter tuşuyla ortadaki kartı seç
                    this.selectCurrentCard();
                    event.preventDefault();
                }
            }
        });
    }
    
    // Enter tuşuna basılınca en üstteki resmi seç
    selectCurrentCard() {
        if (!this.popup.visible) return;
        
        console.log('GreenBox: Enter tuşuna basıldı, en üstteki kart seçiliyor...');
        
        // En üstteki resim (index 0)
        const currentIndex = this.popup.currentIndex || 0;
        
        // Seçili rengi - daha belirgin bir mavi ton
        const seciliRenk = 'rgba(41, 128, 185, 0.9)';
        
        // Tüm seçimleri temizle
        this.popup.imageElements.forEach(elem => {
            elem.style.border = '3px solid rgba(255, 255, 240, 0.4)';
        });
        
        // İlk kartı seç
        if (this.popup.imageElements[currentIndex]) {
            const card = this.popup.imageElements[currentIndex];
            card.style.border = `3px solid ${seciliRenk}`;
            this.popup.currentIndex = currentIndex;
            
            // Seçilen manzarayı uygula
            const selectedBackground = this.backgrounds[currentIndex];
            console.log('GreenBox: Seçilen manzara:', selectedBackground.id);
            
            this.popup.selectedImage = selectedBackground;
            this.changeBackgroundImage(selectedBackground);
            
            // Arabayı ışınla
            setTimeout(() => {
                this.teleportCarToGreenBox();
            }, 300);
            
            // Popup'ı kapat
            setTimeout(() => {
                this.hidePopup();
            }, 500);
            
            return true;
        } else {
            console.error('GreenBox: selectCurrentCard - imageElements bulunamadı');
            return false;
        }
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

    // Yeni metod: Arabanın Green Box alanı içinde olup olmadığını kontrol et
    // Z yüksekliğini de hesaba katar (taban + 5 birim yukarısına kadar)
    isCarInsideGreenBox() {
        if (!this.car || !this.car.chassis || !this.car.chassis.object) {
            console.log('GreenBox: isCarInsideGreenBox - car nesnesi eksik');
            return false;
        }
        
        // Araç pozisyonu
        const carPosition = this.car.chassis.object.position;
        
        // Green Box merkezi
        const boxCenter = this.position;
        
        // Box boyutları (koordinat sistemi değerlerine göre)
        // BOX BOYUTLARINI ARTIRALIM - daha geniş bir alan için
        const boxWidth = 8; // 4.6 yerine
        const boxLength = 5; // 2 yerine
        
        // X ve Y sınırları
        const minX = boxCenter.x - boxWidth/2;
        const maxX = boxCenter.x + boxWidth/2;
        const minY = boxCenter.y - boxLength/2;
        const maxY = boxCenter.y + boxLength/2;
        
        // Green Box alanında mı kontrol et (SADECE x ve y koordinatları)
        const isInside = 
            carPosition.x >= minX && 
            carPosition.x <= maxX &&
            carPosition.y >= minY && 
            carPosition.y <= maxY;
        
        // Debug bilgisi (çok sık yazmasın diye sadece değişiklik olduğunda yazdır)
        if (this._lastInsideState !== isInside) {
            console.log(`GreenBox: Araba ${isInside ? 'içeride' : 'dışarıda'}`, {
                carPos: {x: carPosition.x.toFixed(1), y: carPosition.y.toFixed(1), z: carPosition.z.toFixed(1)},
                boxLimits: {
                    x: [minX.toFixed(1), maxX.toFixed(1)], 
                    y: [minY.toFixed(1), maxY.toFixed(1)],
                }
            });
            this._lastInsideState = isInside;
        }
        
        return isInside;
    }

    togglePopup() {
        if (this.popup.visible) {
            this.hidePopup();
        } else {
            this.showPopup();
        }
    }

    showPopup() {
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

    // Enter tuşu kullanım hatırlatıcısı ekle
    addEnterKeyHint() {
        // Önceki bir ipucu varsa kaldır
        this.removeEnterKeyHint();
        
        // Enter ipucu için div oluştur
        const enterHint = document.createElement('div');
        enterHint.className = 'enter-key-hint';
        enterHint.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            z-index: 1001;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: pulseHint 1.5s infinite alternate;
        `;
        
        // CSS animasyonu ekle
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulseHint {
                from { opacity: 0.7; transform: translateX(-50%) scale(1); }
                to { opacity: 1; transform: translateX(-50%) scale(1.05); }
            }
        `;
        document.head.appendChild(style);
        
        // Sayfaya ekle
        document.body.appendChild(enterHint);
        
        // Referansı sakla
        this.enterKeyHint = enterHint;
    }

    // Enter tuşu ipucunu kaldır
    removeEnterKeyHint() {
        if (this.enterKeyHint && this.enterKeyHint.parentNode) {
            document.body.removeChild(this.enterKeyHint);
            this.enterKeyHint = null;
        }
    }

    hidePopup() {
        this.popup.visible = false;
        
        // HTML popup'ı gizle
        if (this.popup.htmlElement) {
            this.popup.htmlElement.style.visibility = 'hidden';
            this.popup.htmlElement.style.opacity = '0';
            this.popup.htmlElement.style.transform = 'translate(-50%, -50%) scale(0.8)';
            
            // Tüm Enter ipuçlarını kaldır
            const enterHints = document.querySelectorAll('.enter-hint, .enter-key-hint');
            enterHints.forEach(hint => {
                if (hint && hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            });
            
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

    createGameBlocker() {
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

    removeGameBlocker() {
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
            // Green Box'ın merkezine yakın bir konum
            carBody.position.x = this.position.x + 1;  // Green Box'ın biraz sağına
            carBody.position.y = this.position.y;      // Green Box'ın y pozisyonuyla aynı
            carBody.position.z = this.position.z + 5;  // 5 birim yukarıda başlat
            
            // Hedef rotasyonu THREE.Quaternion'a çevir
            const quaternion = new THREE.Quaternion();
            quaternion.setFromEuler(
                this.carTargetRotation.x, 
                this.carTargetRotation.y, 
                this.carTargetRotation.z
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
            
            // Teleport sonrası tüm zamanlayıcıları ve takip değişkenlerini temizle
            if (this.resetBackgroundTimer) {
                clearTimeout(this.resetBackgroundTimer);
                this.resetBackgroundTimer = null;
            }
            this.carExitTime = null;
            this.resetInProgress = false;
            this.forceResetBackground = false;
            
            console.log('Teleport işlemi tamamlandı ve tüm takip değişkenleri temizlendi');
            
            // İşlem başarılı
            return true;
        } catch(error) {
            console.error('Teleport işlemi sırasında hata:', error);
            return false;
        }
    }
    
    // Seçilen görüntüyü Green Box panellerine uygula
    applyImageToGreenBox(background) {
        console.log('Green Box panellerine resim uygulanıyor:', background.id);
        
        // Panel yoksa ilk önce panelleri oluştur
        if (this.manualPanels.length === 0) {
            console.log('Paneller henüz oluşturulmamış, oluşturuluyor...');
            this.createPanels();
        }
        
        // Başarılı bir şekilde paneller oluşturulduysa
        if (this.manualPanels.length > 0) {
            console.log(`${this.manualPanels.length} panel bulundu, texture yükleniyor...`);
            // Texture yükle
            this.loadTextureForPanels(background);
            
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
                    this.loadTextureForPanels(background);
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
        
        // Siyah yüzeylere uygun panel pozisyonları - rotasyonları düzeltilmiş
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
            
            // Panel transform matrisi güncelle
            panel.updateMatrix();
            panel.updateMatrixWorld(true);
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
    loadTextureForPanels(background) {
        // Önceki uygulanmış resmi kaydet
        this.currentAppliedImage = background;
        
        // Texture önbellekte var mı kontrol et
        if (this.textureCache[background.id]) {
            console.log('Texture önbellekten yükleniyor:', background.id);
            this.applyTextureToAllPanels(this.textureCache[background.id]);
            return;
        }
        
        // Texture'ı yükle ve terse çevir
        this.loadImageWithFallback(background, 0);
    }
    
    // Texture'ı yükle ve terse çevir
    loadImageWithFallback(background, fallbackIndex = 0) {
        // Kullanılacak görsel URL'si
        let imageUrl = background.image;
        
        // Eğer fallback indeksi varsa ve fallbackImages dizisi tanımlanmışsa
        if (fallbackIndex > 0 && background.fallbackImages && background.fallbackImages.length >= fallbackIndex) {
            imageUrl = background.fallbackImages[fallbackIndex - 1];
        }
        
        console.log('Görsel yükleme deneniyor:', imageUrl);
        
        // Önce HTML Image elementiyle resmin yüklenip yüklenemediğini test edelim
        const testImage = new Image();
        testImage.onload = () => {
            console.log(`Test Image başarıyla yüklendi: ${imageUrl} (${testImage.width}x${testImage.height})`);
            
            // Resmi ters çeviren canvas işlemi
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Canvas boyutunu ayarla
            canvas.width = testImage.width;
            canvas.height = testImage.height;
            
            // Resmi canvas'a çiz ve ters çevir - 180 derece döndür
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI); // 180 derece
            ctx.drawImage(testImage, 0, 0, canvas.width, canvas.height);
            
            // Canvas'tan texture oluştur
            const canvasTexture = new THREE.CanvasTexture(canvas);
            canvasTexture.needsUpdate = true;
            
            // Texture'ı kaydedip panellere uygula
            this.textureCache[background.id] = canvasTexture;
            
            // Yeni materyali oluştur
            const newMaterial = new THREE.MeshBasicMaterial({
                map: canvasTexture,
                side: THREE.FrontSide
            });
            
            // Materyali uygula
            this.applyMaterialWithTransition(newMaterial);
        };
        
        testImage.onerror = () => {
            console.error(`Test Image yüklenemedi: ${imageUrl}`);
            
            // Fallback görsellerini dene
            const maxFallbackIndex = background.fallbackImages ? background.fallbackImages.length : 0;
            
            if (fallbackIndex < maxFallbackIndex) {
                console.log(`Alternatif görsel deneniyor (${fallbackIndex + 1}/${maxFallbackIndex})...`);
                this.loadImageWithFallback(background, fallbackIndex + 1);
            } else {
                console.error('Tüm görseller yüklenemedi, düz renk kullanılıyor');
                
                // Hiçbir resim yüklenemezse, düz renk kullan
                const fallbackMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(background.color || '#333333'),
                    side: THREE.FrontSide
                });
                
                this.applyMaterialWithTransition(fallbackMaterial);
            }
        };
        
        // Tarayıcı önbelleğinden resmin yüklenmemesi için öneki rastgele parametre ekleyelim
        testImage.src = imageUrl + '?t=' + new Date().getTime();
    }
    
    // Texture'ı tüm panellere uygula
    applyTextureToAllPanels(texture) {
        // Texture ayarları
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 16; // Daha net görüntü için anisotropik filtreleme
        
        console.log('Texture panellere uygulanıyor...');
        
        // Tüm panellere texture'ı uygula
        this.manualPanels.forEach((panel, index) => {
            // Önce eski texture'ı dispose et (memory leak önleme)
            if (panel.material.map) {
                panel.material.map.dispose();
            }
            
            // Her panel için yeni texture kopyası oluştur - 
            // Bu kez repeat/offset ayarlamıyoruz çünkü canvas zaten tersine çevirdi
            const panelTexture = texture.clone();
            panelTexture.needsUpdate = true;
            
            // Panel materyalini yeniden oluştur - daha radikal bir yaklaşım
            panel.material = new THREE.MeshStandardMaterial({
                map: panelTexture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.0, // Başlangıçta saydam, fade-in animasyonu için
                color: 0xffffff,
                emissive: 0x333333,
                emissiveIntensity: 0.5,
                emissiveMap: panelTexture,
                roughness: 0.2,
                metalness: 0.1
            });
            
            // Panel materyalini güncelle
            panel.material.needsUpdate = true;
            
            console.log(`Panel ${index+1} (${panel.name}) texture uygulandı, materyal güncellendi`);
            
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
                // Direkt parlak yeşil materyal oluştur
                this.originalGreenMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(0, 1, 0), // Parlak yeşil
                    transparent: false,
                    side: THREE.DoubleSide
                });
                
                console.log('GreenBox: Orijinal yeşil materyal oluşturuldu');
                
                // Parçanın bilgilerini yazdır
                console.log('Seçilen parça bilgileri:');
                console.log(`- Adı: ${this.greenPart.name}`);
                console.log(`- Materyal türü: ${this.greenPart.material.type}`);
                
                // Orijinal yeşil materyal testi
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
                    // Yeşil materyal uygula
                    this.greenPart.material = this.originalGreenMaterial;
                    this.greenPart.material.needsUpdate = true;
                    console.log('GreenBox: Test materyali kaldırıldı, orijinal YEŞİL materyal uygulandı');
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
    changeBackgroundImage(background) {
        if(!this.greenPart) {
            console.error('GreenBox: Yeşil ekran parçası bulunamadı!');
            return;
        }
        
        console.log('GreenBox: Arkaplan değiştiriliyor:', background.id);
        
        // Uygulanan resmi kaydet
        this.currentAppliedImage = background;
        
        // Texture önbellekte var mı kontrol et
        if(this.textureCache[background.id]) {
            console.log('Texture önbellekten yükleniyor:', background.id);
            this.applyBackgroundTexture(this.textureCache[background.id]);
            return;
        }
        
        // Önce geçici olarak düz renk uygula
        const tempMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(background.color || '#00ff00'),
            side: THREE.FrontSide
        });
        
        // Geçici materyali uygula
        this.applyMaterialWithTransition(tempMaterial);
        
        // Texture'ı yükle
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous'; // CORS için gerekli
        
        // Ana resmi yüklemeyi dene
        this.loadImageWithFallback(background, 0);
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
    
    // Orijinal yeşil materyale geri dön - tamamen yeniden yapılandırıldı
    resetBackground() {
        console.log('!! GreenBox: resetBackground çağrıldı - Arkaplan sıfırlama girişimi !!')
        
        // GÜVENLİK KONTROLÜ: Araba hala GreenBox içindeyse sıfırlama yapma
        // Bu kontrol, hatalı sıfırlamaları önler
        if (this.isCarInsideGreenBox()) {
            console.log('!! GreenBox: Araba hala GreenBox içinde, sıfırlama iptal edildi !!');
            return false;
        }

        // Eğer carExitTime yoksa veya yeteri kadar zaman geçmediyse sıfırlama yapma
        if (this.carExitTime) {
            const timeOutside = Date.now() - this.carExitTime;
            if (timeOutside < 1500) {
                console.log(`!! GreenBox: Araba sadece ${(timeOutside/1000).toFixed(1)} saniye dışarıda, 1.5 saniye dolmadı, sıfırlama iptal !!`);
                return false;
            }
        }
        
        // Temel kontroller
        if(!this.greenPart) {
            console.error('!! GreenBox: resetBackground - greenPart bulunamadı! !!');
            return false;
        }
        
        // Tamamen yeni ve basit bir yaklaşım - Hardcoded yeşil materyal
        try {
            // Doğrudan parlak yeşil materyal
            const greenMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0, 1, 0), // Parlak yeşil
                transparent: false,
                side: THREE.DoubleSide
            });
            
            // Direkt materyal ataması
            this.greenPart.material = greenMaterial;
            this.greenPart.material.needsUpdate = true;
            
            // Force üç boyutlu sahneyi güncelleme
            this.greenPart.updateMatrix();
            this.greenPart.updateMatrixWorld(true);
            
            console.log('!! GreenBox: Arkaplan parlak yeşil renge döndürüldü !!');
            
            // Uygulanan resmi sıfırla
            this.currentAppliedImage = null;
            this.forceResetBackground = false;
            this.resetAttempts = 0;
            
            // Başarı durumunu döndür
            return true;
        } catch (error) {
            console.error('!! GreenBox: Arkaplan sıfırlama hatası:', error, ' !!');
            return false;
        }
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

    // YENİ: Araba çıkışı kontrolü için özel metod
    checkCarExitStatus() {
        // Araba pozisyonu al
        if (!this.car || !this.car.chassis || !this.car.chassis.object) {
            return;
        }
        
        const carPosition = this.car.chassis.object.position;
        
        // GreenBox merkezi
        const boxCenter = this.position;
        
        // Box sınırları - isCarInsideGreenBox ile tutarlı olması için değerleri büyüttük
        const boxWidth = 8; // 4.6 yerine
        const boxLength = 5; // 2 yerine
        const boxMinX = boxCenter.x - boxWidth/2;
        const boxMaxX = boxCenter.x + boxWidth/2;
        const boxMinY = boxCenter.y - boxLength/2;
        const boxMaxY = boxCenter.y + boxLength/2;
        
        // Arabanın kutu dışında olup olmadığını kontrol et (SADECE X ve Y koordinatları)
        const isOutsideBox = 
            carPosition.x < boxMinX || 
            carPosition.x > boxMaxX ||
            carPosition.y < boxMinY || 
            carPosition.y > boxMaxY;
        
        // Debug çıktısı - durumu izlemek için
        if (isOutsideBox && this.currentAppliedImage && !this._lastDebugOutsideState) {
            console.log('GreenBox-Debug: Araba dışarıda, pozisyon:', 
                {x: carPosition.x.toFixed(1), y: carPosition.y.toFixed(1), z: carPosition.z.toFixed(1)});
            this._lastDebugOutsideState = true;
        } else if (!isOutsideBox && this._lastDebugOutsideState) {
            console.log('GreenBox-Debug: Araba içeride, pozisyon:', 
                {x: carPosition.x.toFixed(1), y: carPosition.y.toFixed(1), z: carPosition.z.toFixed(1)});
            this._lastDebugOutsideState = false;
        }
        
        // ÖNEMLİ: İki farklı kontrol yöntemi kullanıyoruz
        // 1. isOutsideBox - checkCarExitStatus metodundaki kutu dışı kontrolü
        // 2. isCarInsideGreenBox() - diğer metod
        const isInsideByOtherMethod = this.isCarInsideGreenBox();
        
        // Araba iki metodun da dışında ise, gerçekten dışarıda kabul edelim
        const isReallyOutside = isOutsideBox && !isInsideByOtherMethod;
        
        // Araba dışarıda ve bir arkaplan uygulanmışsa
        if (isReallyOutside && this.currentAppliedImage) {
            // Daha önce dışarı çıkış zamanı kaydedilmemişse
            if (!this.carExitTime) {
                this.carExitTime = Date.now();
                console.log('!! Araba GreenBox dışına çıktı, 1.5 saniye sayılıyor... !!');
            }
            // Dışarıda geçen süreyi kontrol et
            else {
                const timeOutside = Date.now() - this.carExitTime;
                
                // Belirli aralıklarla debug bilgisi ver
                if (timeOutside % 500 < 50) { // Her 500ms'de bir 
                    console.log(`GreenBox-Debug: Araba ${(timeOutside/1000).toFixed(1)} saniyedir dışarıda`);
                }
                
                // 1.5 saniye geçti mi?
                if (timeOutside >= 1500 && !this.resetInProgress) {
                    console.log(`!! Araba ${(timeOutside/1000).toFixed(1)} saniye dışarıda kaldı, orijinal renge dönülüyor !!`);
                    this.resetInProgress = true;
                    
                    // Reset işlemi yap
                    const success = this.resetBackground();
                    
                    // Reset tamamlandı
                    this.resetInProgress = false;
                    this.carExitTime = null;
                }
            }
        } 
        // Araba içeride veya arkaplan yoksa
        else {
            // Zamanlayıcıyı sıfırla
            if (this.carExitTime) {
                console.log('!! Araba tekrar GreenBox içinde veya arkaplan yok, zamanlayıcı sıfırlandı !!');
                this.carExitTime = null;
                this.resetInProgress = false; // Reset işlemini de iptal et
            }
        }
    }

    // YENİ: Manuel reset fonksiyonu - çağrıldığında anında reset yapar
    manualResetBackground() {
        console.log('!! Manuel reset çağrıldı !!');
        this.resetBackground();
    }
}
