import * as THREE from 'three'
import gsap from 'gsap'
import AreaFenceGeometry from '../Geometries/AreaFenceGeometry.js'
import AreaFloorBorderGeometry from '../Geometries/AreaFloorBorderGeometry.js'

export default class PopupButton
{
    constructor(_options)
    {
        // Options
        this.resources = _options.resources
        this.materials = _options.materials || null
        this.car = _options.car
        this.physics = _options.physics
        this.areas = _options.areas

        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        // Button konumu (0,0)
        this.x = 0
        this.y = 0
        
        // Etkileşim alanı
        this.interactiveArea = null
        
        // Görünürlük - her zaman görünür olacak
        this.isVisible = true
        
        this.setupInteractiveArea()
        this.setupButton()
        this.setupPopupImage()
        this.setupKeyboardEvents()
    }

    setupButton()
    {
        this.button = {}

        // Container
        this.button.container = new THREE.Object3D()
        this.button.container.position.x = this.x
        this.button.container.position.y = this.y
        this.button.container.matrixAutoUpdate = false
        this.button.container.updateMatrix()
        this.container.add(this.button.container)

        // Alan çerçevesi (AreaFloorBorderGeometry kullanarak)
        if (this.materials && this.materials.items && this.materials.items.areaFloorBorder) {
            const floorBorderGeometry = new AreaFloorBorderGeometry(4, 4, 0.5)
            this.button.floorBorder = new THREE.Mesh(
                floorBorderGeometry,
                this.materials.items.areaFloorBorder.clone()
            )
            this.button.floorBorder.matrixAutoUpdate = false
            this.button.floorBorder.updateMatrix()
            this.button.container.add(this.button.floorBorder)
        }
        
        // Alan duvarları (AreaFenceGeometry kullanarak)
        if (this.materials && this.materials.items && this.materials.items.areaGradientTexture) {
            const fenceGeometry = new AreaFenceGeometry(4, 4, 0.5)
            
            // Duvar materyali
            const fenceMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                side: THREE.DoubleSide,
                alphaMap: this.materials.items.areaGradientTexture,
                color: 0x4285f4 // Mavi
            })
            
            this.button.fence = new THREE.Mesh(fenceGeometry, fenceMaterial)
            this.button.fence.position.z = 0.25
            this.button.fence.matrixAutoUpdate = false
            this.button.fence.updateMatrix()
            this.button.container.add(this.button.fence)
        }

        // Button Etiketi/İkonu - silindir olmadan sadece etiket
        this.createButtonLabel()
        
        // Başlangıçta görünür yap
        this.button.container.visible = true
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

        // "ENTER" metni
        ctx.fillStyle = 'white'
        ctx.font = 'bold 64px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('ENTER', canvas.width/2, canvas.height/2)
        
        // Yazı etrafına glow efekti
        ctx.shadowColor = '#4285f4'
        ctx.shadowBlur = 20
        ctx.fillText('ENTER', canvas.width/2, canvas.height/2)

        // Texture oluştur
        const texture = new THREE.CanvasTexture(canvas)
        texture.magFilter = THREE.LinearFilter
        texture.minFilter = THREE.LinearFilter

        // Etiket mesh'i oluştur
        const labelGeometry = new THREE.PlaneGeometry(2.5, 1)
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide // Her iki taraftan da görünür
        })

        this.button.label = new THREE.Mesh(labelGeometry, labelMaterial)
        this.button.label.position.z = 0.3 // Zeminin biraz üzerinde
        this.button.container.add(this.button.label)
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
        
        // Manzara resimleri
        const manzaralar = [
            { id: 'mnzr1', image: '../images/manzaralar/mnzr1.jpg' },
            { id: 'mnzr2', image: '../images/manzaralar/mnzr2.jpg' },
            { id: 'mnzr3', image: '../images/manzaralar/mnzr3.jpg' },
            { id: 'mnzr4', image: '../images/manzaralar/mnzr4.jpg' },
            { id: 'mnzr5', image: '../images/manzaralar/mnzr5.jpg' }
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
                    this.popup.selectedImage = manzara.id;
                    
                    // Önceki seçili kartların işaretlerini kaldır
                    allCards.forEach(c => {
                        if (c.querySelector('.check-icon')) {
                            c.querySelector('.check-icon').style.opacity = '0';
                        }
                    });
                    
                    // Bu kartı işaretle
                    card.querySelector('.check-icon').style.opacity = '1';
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
        this.navigateCarousel = function(direction) {
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
        
        // Buton animasyonu ve ışıldama efekti
        this.animateButton();
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
    
    animateButton()
    {
        // Butonun yüksekliğini hafifçe değiştiren animasyon
        const animate = () => {
            const time = Date.now() * 0.001 // saniye cinsinden
            
            if (this.button && this.button.container && this.isVisible) {
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
        // Etkileşimli alan oluştur (AreaFence gibi)
        if (this.areas) {
            // Etkileşimli alan ekle
            this.interactiveArea = this.areas.add({
                position: new THREE.Vector2(this.x, this.y),
                halfExtents: new THREE.Vector2(3, 3), // Etkileşim alanı boyutu
                floorShadowType: 'primary',
                debug: false
            });
            
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
                
                // Kullanıcıya görsel ipucu ver
                this.showEnterHint();
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
                
                // İpucunu kaldır
                this.hideEnterHint();
            });
        }
    }

    update()
    {
        // Buton artık her zaman görünür, araç mesafesi kontrolüne gerek yok
        if (this.button && this.button.container) {
            this.button.container.visible = true;
            
            // Etkileşim alanını aktifleştir
            if (this.interactiveArea) {
                this.interactiveArea.activate();
            }
        }
    }

    // Arabanın butonun etkileşim alanı içinde olup olmadığını kontrol eden yeni metod
    isCarInside() {
        if (!this.car || !this.car.chassis || !this.car.chassis.object) {
            return false;
        }
        
        // Araç pozisyonu
        const carPosition = this.car.chassis.object.position;
        
        // Buton merkezi ile araç arasındaki mesafe
        const distance = Math.sqrt(
            Math.pow(carPosition.x - this.x, 2) + 
            Math.pow(carPosition.y - this.y, 2)
        );
        
        // Etkileşim alanı yarıçapı - floorBorder geometrisinin yarısı
        const interactionRadius = 2; // 4 birimlik genişliğin yarısı
        
        // Araç çerçeve içinde mi?
        return distance < interactionRadius;
    }
    
    // Enter tuşu ipucunu göster
    showEnterHint() {
        // Eğer ipucu henüz oluşturulmadıysa
        if (!this.enterHint) {
            this.enterHint = document.createElement('div');
            this.enterHint.className = 'enter-hint';
            this.enterHint.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 16px;
                opacity: 0;
                transition: opacity 0.3s;
                z-index: 1000;
            `;
            this.enterHint.textContent = 'Popup açmak için ENTER tuşuna basın';
            document.body.appendChild(this.enterHint);
        }
        
        // İpucunu göster
        setTimeout(() => {
            this.enterHint.style.opacity = '1';
        }, 10);
    }
    
    // Enter tuşu ipucunu gizle
    hideEnterHint() {
        if (this.enterHint) {
            this.enterHint.style.opacity = '0';
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
}
