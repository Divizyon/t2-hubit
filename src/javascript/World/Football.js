import * as THREE from 'three'
import CANNON from 'cannon'

export default class Football
{
    constructor(_options)
    {
        // Seçenekler
        this.debug = _options.debug
        this.resources = _options.resources
        this.objects = _options.objects
        this.physics = _options.physics
        this.shadows = _options.shadows
        this.materials = _options.materials
        this.ui = _options.ui
        this.time = _options.time
        this.sounds = _options.sounds
        this.areas = _options.areas

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        
        // Debug modunu açık tut ki collision görünür olsun
        this.debug = true
        
        // Optimizasyon - başlangıçta sadece modelleri tanımla, diğer nesneleri lazım olduğunda oluştur
        this.initialized = false
        
        // Trigger şekli ve pozisyonu sınıf kapsamında
        this.triggerShape = null
        this.triggerPosition = null
        
        this.setModels()
    }
    
    // Oyun nesnelerini oluşturmak için lazım olduğunda çağrılacak
    initialize() {
        if (this.initialized) return;
        
        this.setGoal()
        this.setBall()
        this.setGUI()
        this.setResetButton()
        this.checkInteractions()
        
        this.initialized = true
        console.log('Football mini oyunu başlatıldı')
    }

    /**
     * Model ve fizik nesnelerini ayarla
     */
    setModels()
    {
        this.models = {}

        // Futbol topu
        this.models.ball = {}
        this.models.ball.offset = new THREE.Vector3(0, 0, 0) // Topun yerden yüksekliği
        this.models.ball.radius = 1 // Top yarıçapı
        this.models.ball.position = new THREE.Vector3(0, 0, 0) // Başlangıç pozisyonu - daha sonra güncellenecek

        // Kale boyutları - kale.glb modeline uygun olarak güncellenmiş
        this.models.goal = {}
        this.models.goal.size = new THREE.Vector3(2.0, 0.8, 1.2) // genişlik, derinlik, yükseklik
        this.models.goal.position = new THREE.Vector3(-65, 21, 0) // Yeni kale pozisyonu

        // Topun başlangıç pozisyonu - kaleden belirli bir mesafede
        this.models.ball.initialPosition = new THREE.Vector3(
            this.models.goal.position.x + 5, // Kaleden 5 birim uzakta
            this.models.goal.position.y + 3, // Y ekseninde 5 birim daha yüksekte
            this.models.ball.offset.z
        )
        this.models.ball.position.copy(this.models.ball.initialPosition)

        // Gol algılama için trigger alanı
        this.models.goalTrigger = {}
        this.models.goalTrigger.size = new THREE.Vector3(0.2, this.models.goal.size.y, this.models.goal.size.z)
        this.models.goalTrigger.position = new THREE.Vector3(
            this.models.goal.position.x + this.models.goal.size.x / 2 - this.models.goalTrigger.size.x / 2,
            this.models.goal.position.y,
            this.models.goal.position.z + this.models.goal.size.z / 2
        )
    }

    /**
     * Kaleyi oluştur (tamamen içinden geçilebilir, collision olmayan şekilde)
     */
    setGoal()
    {
        try {
            // Tüm kale bileşenlerini tutacak nesne
            this.goal = {}
            
            // Kale pozisyonu - models.goal.position'dan al
            const goalX = this.models.goal.position.x;
            const goalY = this.models.goal.position.y;
            const goalZ = this.models.goal.position.z;
            const goalWidth = 2.0;
            const goalHeight = 1.2;
            const goalDepth = 0.8;
            
            // ----------------------------------
            // 1. ADIM: GÖRSEL MODEL OLUŞTURMA
            // ----------------------------------
            
            // Görsel model container'ı
            this.goal.container = new THREE.Object3D()
            this.goal.container.position.copy(this.models.goal.position)
            
            // kale.glb modelini yükle
            if (this.resources.items.kaleModel) {
                console.log('Kale modeli bulundu, yükleniyor...')
                
                this.goal.model = new THREE.Object3D()
                
                // Kale modelini kopyala
                const kaleModel = this.resources.items.kaleModel.scene.clone()
                
                // Kale modelini ayarla
                kaleModel.scale.set(2.0, 2.0, 2.0)
                kaleModel.rotation.x = 0
                kaleModel.position.set(0, 0, -0.5) // Modeli container'a göre konumlandır
                
                // Kale modelinin tüm parçalarını geç ve materyal uygula
                kaleModel.traverse((child) => {
                    if (child.isMesh) {
                        console.log('Kale mesh bulundu:', child.name)
                        
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xffffff,
                            metalness: 0.3,
                            roughness: 0.2,
                            emissive: 0x222222,
                            emissiveIntensity: 0.5
                        });
                        
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                this.goal.model.add(kaleModel)
                this.goal.container.add(this.goal.model)
                console.log('Kale modeli başarıyla yüklendi')
            } else {
                console.warn('Kale modeli bulunamadı, basit kale kullanılıyor')
                
                // Basit kale oluştur
                const goalMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff,
                    metalness: 0.3,
                    roughness: 0.2
                })

                // U şeklinde kale direkleri
                const postSize = { width: 0.1, height: 1.2 };
                const crossbarSize = { width: 2.0, height: 0.1 };

                // Sol direk
                const leftPost = new THREE.Mesh(
                    new THREE.BoxGeometry(postSize.width, postSize.height, postSize.width),
                    goalMaterial
                );
                leftPost.position.set(-crossbarSize.width/2 + postSize.width/2, 0, postSize.height/2);
                
                // Sağ direk
                const rightPost = new THREE.Mesh(
                    new THREE.BoxGeometry(postSize.width, postSize.height, postSize.width),
                    goalMaterial
                );
                rightPost.position.set(crossbarSize.width/2 - postSize.width/2, 0, postSize.height/2);
                
                // Üst direk
                const crossbar = new THREE.Mesh(
                    new THREE.BoxGeometry(crossbarSize.width, postSize.width, postSize.width),
                    goalMaterial
                );
                crossbar.position.set(0, 0, postSize.height);
                
                this.goal.container.add(leftPost);
                this.goal.container.add(rightPost);
                this.goal.container.add(crossbar);
            }

            // Görsel modeli ana container'a ekle
            this.container.add(this.goal.container)
            
            // ----------------------------------
            // 2. ADIM: TAMAMEN GHOST BODY OLUŞTURMA (HİÇBİR FİZİK ETKİLEŞİMİ OLMAYACAK)
            // ----------------------------------
            
            // Tüm kale collider'ları - bunları takip edeceğiz
            this.allGoalBodies = [];
            
            // Kale ana ghost body - direkler için
            // ÖNEMLİ: TAMAMEN GHOST - FİZİK ETKİLEŞİMİ YOK!
            const ghostOptions = {
                mass: 0,
                material: this.physics.materials.items.dummy,
                collisionResponse: false, // ÖNEMLİ: İÇİNDEN GEÇİLEBİLİR
                type: CANNON.Body.STATIC,
                collisionFilterGroup: 0, // Hiçbir grupla çarpışmaz
                collisionFilterMask: 0   // Hiçbir grupla çarpışmaz
            };
            
            this.goal.ghostBody = new CANNON.Body(ghostOptions);
            this.goal.ghostBody.position.set(goalX, goalY, goalZ);
            
            // Sol direk collider
            const leftPostShape = new CANNON.Box(new CANNON.Vec3(
                0.1, 0.1, goalHeight/2
            ));
            
            // Sağ direk collider
            const rightPostShape = new CANNON.Box(new CANNON.Vec3(
                0.1, 0.1, goalHeight/2
            ));
            
            // Üst direk collider
            const crossbarShape = new CANNON.Box(new CANNON.Vec3(
                goalWidth/2, 0.1, 0.1
            ));
            
            // Collider'ları ghost body'ye ekle
            this.goal.ghostBody.addShape(leftPostShape, new CANNON.Vec3(
                -goalWidth/2, 0, goalHeight/2
            ));
            
            this.goal.ghostBody.addShape(rightPostShape, new CANNON.Vec3(
                goalWidth/2, 0, goalHeight/2
            ));
            
            this.goal.ghostBody.addShape(crossbarShape, new CANNON.Vec3(
                0, 0, goalHeight
            ));
            
            // Fizik motoruna ghost body'yi ekle
            this.physics.world.addBody(this.goal.ghostBody);
            this.allGoalBodies.push(this.goal.ghostBody);
            
            // ----------------------------------
            // 3. ADIM: YENİ GOL ALGILAMA ÇİZGİSİ OLUŞTURMA (x=-73.5 sabit, y=19.6 ile y=27 arası)
            // ----------------------------------
            
            // Yeni gol çizgisi için trigger noktaları - kullanıcının belirttiği koordinatlar
            this.goalLine = {
                x: -73.5,
                y1: 19.6,
                y2: 27,
                z: goalZ, // Kale z seviyesi
                tolerance: 1.0 // Geçiş toleransı (metre)
            };
            
            // Debug modunda gol çizgisini görselleştirmeyi kaldırdık - kullanıcı isteği üzerine
            // Görünmez algılama alanı olarak çalışacak
            
            console.log('Yeni gol çizgisi oluşturuldu (görünmez):', this.goalLine);
            
        } catch (error) {
            console.error('Kale oluşturulamadı:', error);
        }
    }
    
    /**
     * Debug için wireframe box oluşturur
     */
    createDebugBox(halfExtents, bodyPosition, shapeOffset, color) {
        // Tam boyutlarla kutu geometrisi oluştur
        const geometry = new THREE.BoxGeometry(
            halfExtents.x * 2,
            halfExtents.y * 2,
            halfExtents.z * 2
        );
        
        // Wireframe materyal
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        
        // Mesh oluştur
        const mesh = new THREE.Mesh(geometry, material);
        
        // Pozisyonu ayarla (body pozisyonu + shape offset)
        mesh.position.set(
            bodyPosition.x + shapeOffset.x,
            bodyPosition.y + shapeOffset.y,
            bodyPosition.z + shapeOffset.z
        );
        
        return mesh;
    }

    /**
     * Gol kontrolü için yeni fonksiyon - çizgi bazlı kontrol
     */
    checkBallCrossedGoalLine() {
        if (!this.ball || !this.ball.body || !this.goalLine || this.hasScored) {
            return false;
        }
        
        const ballPos = this.ball.body.position;
        const prevBallPos = this.ball.previousPosition || ballPos.clone();
        
        // Topun önceki ve şimdiki pozisyonu arasında x ekseninde çizgiyi geçti mi kontrol et
        // ve topun y pozisyonu gol çizgisinin y aralığında mı kontrol et
        
        // Topun önceki pozisyonu çizginin sağında mı?
        const wasRightOfLine = prevBallPos.x > this.goalLine.x;
        // Topun şimdiki pozisyonu çizginin solunda mı?
        const isLeftOfLine = ballPos.x < this.goalLine.x;
        // Çizgiyi x ekseninde sağdan sola geçti mi?
        const crossedX = wasRightOfLine && isLeftOfLine;
        
        // Top y ekseninde gol çizgisi aralığında mı?
        const isInYRange = ballPos.y >= this.goalLine.y1 && ballPos.y <= this.goalLine.y2;
        
        // Top çizgiyi geçti ve y aralığında ise gol oldu
        if (crossedX && isInYRange) {
            console.log('GOL OLDU! Top çizgiyi geçti!', ballPos);
            this.hasScored = true;
            
            // Gol mesajını göster
            if (this.gui && this.gui.goalMessage) {
                this.gui.goalMessage.style.display = 'block';
            }
            
            // Ses efekti
            if (this.sounds) {
                this.sounds.play('carHit', 3);
            }
            
            // 3 saniye sonra mesajı gizle ve topu sıfırla
            setTimeout(() => {
                if (this.gui && this.gui.goalMessage) {
                    this.gui.goalMessage.style.display = 'none';
                }
                this.resetBall();
            }, 3000);
            
            return true;
        }
        
        // Topun önceki pozisyonunu kaydet
        this.ball.previousPosition = ballPos.clone();
        return false;
    }

    /**
     * Futbol topunu oluştur
     */
    setBall()
    {
        try {
            this.ball = {}

            // Fizik gövdesi
            this.ball.body = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(
                    this.models.ball.initialPosition.x,
                    this.models.ball.initialPosition.y,
                    this.models.ball.initialPosition.z
                ),
                shape: new CANNON.Sphere(this.models.ball.radius),
                material: this.physics.materials.items.dummy,
                linearDamping: 0.5,
                angularDamping: 0.5
            })
            this.physics.world.addBody(this.ball.body)

            // Top başlangıç pozisyonu kaydedilir (önceki pozisyon takibi için)
            this.ball.previousPosition = new CANNON.Vec3(
                this.models.ball.initialPosition.x,
                this.models.ball.initialPosition.y,
                this.models.ball.initialPosition.z
            );

            // Görsel model - daha güzel top
            const ballGeometry = new THREE.SphereGeometry(this.models.ball.radius, 32, 32)
            
            // Futbol topu dokusu
            const ballTexture = new THREE.TextureLoader().load('/assets/textures/football.jpg')
            
            // Daha güzel materyal
            const ballMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                map: ballTexture,
                metalness: 0.2,
                roughness: 0.4
            })
            
            // Eğer doku bulunamazsa basit beyaz top kullan
            if (!ballTexture) {
                console.warn('Futbol topu dokusu yüklenemedi, basit top kullanılıyor')
                this.ball.mesh = new THREE.Mesh(
                    ballGeometry, 
                    new THREE.MeshBasicMaterial({ color: 0xffffff })
                )
            } else {
                this.ball.mesh = new THREE.Mesh(ballGeometry, ballMaterial)
            }
            
            // Gölge ayarları
            this.ball.mesh.castShadow = true
            this.ball.mesh.receiveShadow = true
            
            this.container.add(this.ball.mesh)

            // Top-zemin etkileşimi
            const ballGroundContact = new CANNON.ContactMaterial(
                this.physics.materials.items.floor,
                this.physics.materials.items.dummy,
                {
                    friction: 0.3,
                    restitution: 0.4
                }
            )
            this.physics.world.addContactMaterial(ballGroundContact)

            // Top-araç etkileşimi
            const ballVehicleContact = new CANNON.ContactMaterial(
                this.physics.materials.items.wheel,
                this.physics.materials.items.dummy,
                {
                    friction: 0.3,
                    restitution: 0.2
                }
            )
            this.physics.world.addContactMaterial(ballVehicleContact)

            // Her karede topun pozisyonunu güncelle
            this.time.on('tick', () => {
                if (this.ball && this.ball.mesh && this.ball.body) {
                    this.ball.mesh.position.copy(this.ball.body.position)
                    this.ball.mesh.quaternion.copy(this.ball.body.quaternion)
                    
                    // YENİ: Gol çizgisini geçip geçmediğini kontrol et
                    this.checkBallCrossedGoalLine();
                    
                    // Debug modu açıksa collider görsellerini güncelle
                    if (this.debug && this.colliderVisuals) {
                        // Debug olarak eklenen görsel öğeleri güncelle
                        // Böylece fizik motorundaki pozisyonlar görsel olarak da görünür
                    }
                }
            })
        } catch (error) {
            console.error('Top oluşturulamadı:', error)
        }
    }

    /**
     * UI ve gol mesajını ayarla
     */
    setGUI()
    {
        try {
            this.gui = {}
            
            // Gol mesajı - daha canlı stil
            this.gui.goalMessage = document.createElement('div')
            this.gui.goalMessage.className = 'goal-message'
            this.gui.goalMessage.style.position = 'absolute'
            this.gui.goalMessage.style.top = '50%'
            this.gui.goalMessage.style.left = '50%'
            this.gui.goalMessage.style.transform = 'translate(-50%, -50%)'
            this.gui.goalMessage.style.color = '#ff0000'
            this.gui.goalMessage.style.fontSize = '72px'
            this.gui.goalMessage.style.fontWeight = 'bold'
            this.gui.goalMessage.style.textShadow = '0 0 20px rgba(255,255,255,0.8)'
            this.gui.goalMessage.style.fontFamily = 'Arial, sans-serif'
            this.gui.goalMessage.style.display = 'none'
            this.gui.goalMessage.style.zIndex = '1000'
            this.gui.goalMessage.style.transition = 'all 0.3s ease-in-out'
            this.gui.goalMessage.style.animation = 'goalPulse 0.5s infinite alternate'
            this.gui.goalMessage.textContent = 'GOOOL!'
            
            // CSS animasyon ekle
            const style = document.createElement('style')
            style.innerHTML = `
                @keyframes goalPulse {
                    from { transform: translate(-50%, -50%) scale(1); }
                    to { transform: translate(-50%, -50%) scale(1.1); }
                }
            `
            document.head.appendChild(style)
            
            document.body.appendChild(this.gui.goalMessage)

            // Gol durumunu takip et
            this.hasScored = false
        } catch (error) {
            console.error('GUI oluşturulamadı:', error)
        }
    }

    /**
     * Reset butonunu oluştur
     */
    setResetButton()
    {
        try {
            // Reset butonu için bir alan oluştur - yeni konuma göre güncellendi
            this.resetArea = this.areas.add({
                position: new THREE.Vector2(
                    this.models.ball.initialPosition.x +5 , // Topun sol tarafında
                    this.models.ball.initialPosition.y   // Ve biraz aşağısında
                ),
                halfExtents: new THREE.Vector2(2.5, 2.5), // 5 kat daha büyük (0.5 * 5 = 2.5)
                debug: this.debug ? { color: 0x00ff00 } : false,
                text: {
                    value: 'SIFIRLA',
                    position: new THREE.Vector2(0, 0),
                    size: 2.5 // Yazı boyutunu da 5 kat büyüt
                }
            })

            // Reset fonksiyonu
            this.resetArea.on('interact', () => {
                this.resetBall()
            })
        } catch (error) {
            console.error('Reset butonu oluşturulamadı:', error)
        }
    }

    /**
     * Topu başlangıç pozisyonuna geri döndür
     */
    resetBall()
    {
        try {
            // Topun fizik gövdesini sıfırla
            if (this.ball && this.ball.body) {
                this.ball.body.position.copy(this.models.ball.initialPosition)
                this.ball.body.velocity.set(0, 0, 0)
                this.ball.body.angularVelocity.set(0, 0, 0)
                this.ball.body.wakeUp()
            }

            // Gol durumunu sıfırla
            this.hasScored = false
            
            // Gol mesajını gizle
            if (this.gui && this.gui.goalMessage) {
                this.gui.goalMessage.style.display = 'none'
            }
        } catch (error) {
            console.error('Top sıfırlanamadı:', error)
        }
    }

    /**
     * Etkileşimleri kontrol et
     */
    checkInteractions()
    {
        try {
            console.log('Kale-top etkileşimleri kontrolü başlatıldı.');
            
            // CANNON.js çarpışma olay dinleyicileri
            this.ball?.body?.addEventListener('collide', (event) => {
                // Hangi body ile çarpıştı kontrol et
                const collidedBody = event.body;
                
                // Eğer kale trigger'ı ile çarpıştıysa (olmaması lazım, collisionResponse: false)
                if (this.goal && collidedBody === this.goal.goalTrigger) {
                    console.error('HATA: Top trigger ile çarpıştı! collisionResponse: false olmalıydı!');
                    console.error('Top hızı:', this.ball.body.velocity);
                    console.error('Collision body:', collidedBody);
                }
                
                // Diğer kale collider'ları ile çarpışma (olmaması lazım)
                if (this.allGoalBodies && this.allGoalBodies.includes(collidedBody)) {
                    console.error('HATA: Top kale bileşeni ile çarpıştı! collisionResponse: false olmalıydı!');
                    console.error('Top hızı:', this.ball.body.velocity); 
                    console.error('Collision body:', collidedBody);
                }
            });
            
        } catch (error) {
            console.error('Etkileşim kontrolü kurulamadı:', error);
        }
    }
} 