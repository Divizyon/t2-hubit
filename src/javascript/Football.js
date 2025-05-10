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
        this.ui = _options.ui || null // ui parametresi opsiyonel
        this.time = _options.time
        this.sounds = _options.sounds
        this.areas = _options.areas

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        
        // Optimizasyon - başlangıçta sadece modelleri tanımla, diğer nesneleri lazım olduğunda oluştur
        this.initialized = false
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
        this.models.ball.offset = new THREE.Vector3(0, 0, 0.2) // Topun yerden yüksekliği
        this.models.ball.radius = 0.2 // Top yarıçapı
        this.models.ball.position = new THREE.Vector3(0, 0, 0) // Başlangıç pozisyonu - daha sonra güncellenecek

        // Kale boyutları - kale.glb modeline uygun olarak güncellenmiş
        this.models.goal = {}
        this.models.goal.size = new THREE.Vector3(2.0, 0.8, 1.2) // genişlik, derinlik, yükseklik
        this.models.goal.position = new THREE.Vector3(5, 0, 0) // Kale pozisyonu

        // Topun başlangıç pozisyonu - kaleden belirli bir mesafede
        this.models.ball.initialPosition = new THREE.Vector3(
            this.models.goal.position.x - 5, // Kaleden 5 birim uzakta
            this.models.goal.position.y,
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
     * Kaleyi oluştur
     */
    setGoal()
    {
        try {
            this.goal = {}

            // Fizik gövdesi
            this.goal.body = new CANNON.Body({
                mass: 0, // Statik gövde
                material: this.physics.materials.items.dummy
            })

            // Kale çerçevesi için fizik şekilleri
            const frameShape = new CANNON.Box(new CANNON.Vec3(
                this.models.goal.size.x / 2,
                this.models.goal.size.y / 2,
                this.models.goal.size.z / 2
            ))

            // Fizik şeklini pozisyonlandır ve gövdeye ekle
            this.goal.body.addShape(
                frameShape,
                new CANNON.Vec3(
                    this.models.goal.position.x,
                    this.models.goal.position.y,
                    this.models.goal.position.z + this.models.goal.size.z / 2
                )
            )

            // Fizik dünyasına ekle
            this.physics.world.addBody(this.goal.body)

            // Görsel model
            this.goal.container = new THREE.Object3D()
            this.goal.container.position.copy(this.models.goal.position)

            // kale.glb modelini yükle
            if (this.resources.items.kaleModel) {
                console.log('Kale modeli bulundu, yükleniyor...')
                
                this.goal.model = new THREE.Object3D()
                
                // Kale modelini kopyala
                const kaleModel = this.resources.items.kaleModel.scene.clone()
                
                // Kale modelini ölçeklendir (boyutu ayarla)
                kaleModel.scale.set(2.0, 2.0, 2.0)
                
                // Modeli döndür (kale modeli doğru yöne baksın)
                kaleModel.rotation.x = Math.PI / 2
                
                // Pozisyonu ayarla
                kaleModel.position.set(0, 0, 0.5)
                
                // Kale modelinin tüm çocuk mesh'lerini döngü ile gezelim
                kaleModel.traverse((child) => {
                    if (child.isMesh) {
                        // Mesh'lere materyal uygula
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xffffff,
                            metalness: 0.3,
                            roughness: 0.2,
                            emissive: 0x222222,
                            emissiveIntensity: 0.5
                        });
                        
                        // Gölgeleri etkinleştir
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Modeli container'a ekle
                this.goal.model.add(kaleModel)
                this.goal.container.add(this.goal.model)
                console.log('Kale modeli başarıyla yüklendi')
            } else {
                console.warn('Kale modeli bulunamadı, basit kale kullanılıyor')
                
                // Basit bir kale oluştur
                const goalMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff,
                    metalness: 0.3,
                    roughness: 0.2
                })

                // U şeklinde kale oluştur
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
                
                // Direkleri container'a ekle
                this.goal.container.add(leftPost);
                this.goal.container.add(rightPost);
                this.goal.container.add(crossbar);
            }

            // Container'a ekle
            this.container.add(this.goal.container)

            // Gol algılama için trigger alanı
            this.goal.trigger = {}
            this.goal.trigger.shape = new CANNON.Box(
                new CANNON.Vec3(
                    this.models.goalTrigger.size.x / 2,
                    this.models.goalTrigger.size.y / 2,
                    this.models.goalTrigger.size.z / 2
                )
            )
            this.goal.trigger.body = new CANNON.Body({
                mass: 0,
                isTrigger: true
            })
            this.goal.trigger.body.addShape(this.goal.trigger.shape)
            this.goal.trigger.body.position.set(
                this.models.goalTrigger.position.x,
                this.models.goalTrigger.position.y,
                this.models.goalTrigger.position.z
            )
            this.physics.world.addBody(this.goal.trigger.body)

            // Debug için trigger görselleştirme
            if (this.debug) {
                const triggerGeometry = new THREE.BoxGeometry(
                    this.models.goalTrigger.size.x,
                    this.models.goalTrigger.size.y,
                    this.models.goalTrigger.size.z
                )
                const triggerMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                })
                this.goal.trigger.mesh = new THREE.Mesh(triggerGeometry, triggerMaterial)
                this.goal.trigger.mesh.position.copy(this.models.goalTrigger.position)
                this.container.add(this.goal.trigger.mesh)
            }
        } catch (error) {
            console.error('Kale oluşturulamadı:', error)
        }
    }

    /**
     * Futbol topunu oluştur
     */
    setBall()
    {
        try {
            // Top nesnesi oluştur
            this.ball = {}

            // Top fizik şekli
            this.ball.shape = new CANNON.Sphere(this.models.ball.radius)

            // Top fizik gövdesi
            this.ball.body = new CANNON.Body({
                mass: 1, // Hafif top
                material: this.physics.materials.items.ball || this.physics.materials.items.default
            })

            // Fizik gövdesine şekil ve konumu ayarla
            this.ball.body.addShape(this.ball.shape)
            this.ball.body.position.set(
                this.models.ball.initialPosition.x,
                this.models.ball.initialPosition.y,
                this.models.ball.initialPosition.z
            )

            // Topun sönümleme değerlerini ayarla (daha gerçekçi zıplama için)
            this.ball.body.linearDamping = 0.5
            this.ball.body.angularDamping = 0.5

            // Topu fizik dünyasına ekle
            this.physics.world.addBody(this.ball.body)

            // Görsel model
            this.ball.mesh = new THREE.Mesh(
                new THREE.SphereGeometry(this.models.ball.radius, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: 0xff69b4, // Pembe renk
                    metalness: 0.3,
                    roughness: 0.4
                })
            )
            
            // Gölgeleri etkinleştir
            this.ball.mesh.castShadow = true
            this.ball.mesh.receiveShadow = true

            // Top mesh'ini sahneye ekle
            this.container.add(this.ball.mesh)

            // Top hareketini ve çarpışmaları izle
            this.time.on('tick', () => {
                if (!this.initialized) return
                
                // Topun pozisyonunu güncelle
                this.ball.mesh.position.copy(this.ball.body.position)
                this.ball.mesh.quaternion.copy(this.ball.body.quaternion)
                
                // Top yere düştü mü kontrol et
                if (this.ball.body.position.z < -5) {
                    console.log('Top yere düştü, sıfırlanıyor')
                    this.resetBall()
                }
                
                // Kaleye gol oldu mu kontrol et
                this.checkGoal()
            })
            
            // Çarpışma olayını dinle
            this.ball.body.addEventListener('collide', (event) => {
                // Çarpışma hızı
                const velocity = event.contact.getImpactVelocityAlongNormal()
                
                // Belirli bir hızın üzerindeyse ses çıkar
                if (velocity > 2) {
                    // Ses çal (ses seviyesini çarpışma hızına göre ayarla)
                    if (this.sounds) {
                        // Ses efekti varsa çal
                        const volume = Math.min(0.5, velocity / 20)
                        this.sounds.play('carHit', volume)
                    }
                }
            })
            
            // Futbol sahasını oluştur
            this.createField()
            
        } catch (error) {
            console.error('Top oluşturulamadı:', error)
        }
    }
    
    /**
     * Futbol sahasını oluştur
     */
    createField() {
        // Saha boyutları
        const fieldWidth = 20
        const fieldLength = 30
        
        // Zemin mesh
        const fieldGeometry = new THREE.PlaneGeometry(fieldWidth, fieldLength, 1, 1)
        const fieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50, // Yeşil renk
            roughness: 0.8,
            metalness: 0.2
        })
        
        const field = new THREE.Mesh(fieldGeometry, fieldMaterial)
        field.rotation.x = -Math.PI / 2 // Yatay olarak döndür
        field.position.set(
            this.models.goal.position.x - fieldLength / 4, // Kaleyi sahanın ucuna yakın konumlandır
            this.models.goal.position.y,
            0
        )
        
        // Gölge alması için ayarla
        field.receiveShadow = true
        
        // Saha çizgileri
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
        
        // Dış çerçeve
        const borderPoints = []
        borderPoints.push(new THREE.Vector3(-fieldWidth / 2, -fieldLength / 2, 0.01))
        borderPoints.push(new THREE.Vector3(fieldWidth / 2, -fieldLength / 2, 0.01))
        borderPoints.push(new THREE.Vector3(fieldWidth / 2, fieldLength / 2, 0.01))
        borderPoints.push(new THREE.Vector3(-fieldWidth / 2, fieldLength / 2, 0.01))
        borderPoints.push(new THREE.Vector3(-fieldWidth / 2, -fieldLength / 2, 0.01))
        
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints)
        const borderLine = new THREE.Line(borderGeometry, lineMaterial)
        
        // Orta çizgi
        const midlinePoints = []
        midlinePoints.push(new THREE.Vector3(-fieldWidth / 2, 0, 0.01))
        midlinePoints.push(new THREE.Vector3(fieldWidth / 2, 0, 0.01))
        
        const midlineGeometry = new THREE.BufferGeometry().setFromPoints(midlinePoints)
        const midLine = new THREE.Line(midlineGeometry, lineMaterial)
        
        // Orta daire
        const centerCircle = new THREE.Line(
            new THREE.CircleGeometry(fieldWidth / 8, 32),
            lineMaterial
        )
        centerCircle.rotation.x = -Math.PI / 2
        centerCircle.position.set(0, 0, 0.01)
        
        // Ceza sahası
        const penaltyBoxWidth = fieldWidth * 0.6
        const penaltyBoxLength = fieldLength * 0.2
        
        const penaltyPoints = []
        penaltyPoints.push(new THREE.Vector3(-penaltyBoxWidth / 2, fieldLength / 2, 0.01))
        penaltyPoints.push(new THREE.Vector3(penaltyBoxWidth / 2, fieldLength / 2, 0.01))
        penaltyPoints.push(new THREE.Vector3(penaltyBoxWidth / 2, fieldLength / 2 - penaltyBoxLength, 0.01))
        penaltyPoints.push(new THREE.Vector3(-penaltyBoxWidth / 2, fieldLength / 2 - penaltyBoxLength, 0.01))
        penaltyPoints.push(new THREE.Vector3(-penaltyBoxWidth / 2, fieldLength / 2, 0.01))
        
        const penaltyGeometry = new THREE.BufferGeometry().setFromPoints(penaltyPoints)
        const penaltyLine = new THREE.Line(penaltyGeometry, lineMaterial)
        
        // Tüm saha elementlerini bir container'a ekle
        this.field = new THREE.Object3D()
        this.field.add(field)
        this.field.add(borderLine)
        this.field.add(midLine)
        this.field.add(centerCircle)
        this.field.add(penaltyLine)
        
        // Sahayı ana container'a ekle
        this.container.add(this.field)
    }
    
    /**
     * Basit bir kullanıcı arayüzü oluştur
     */
    setGUI() {
        // Puan göstergesi oluştur
        this.score = 0
        
        // HTML element kontrolü 
        if (typeof document !== 'undefined') {
            // Skor göstergesi oluştur
            this.scoreElement = document.createElement('div')
            this.scoreElement.style.position = 'absolute'
            this.scoreElement.style.top = '10px'
            this.scoreElement.style.left = '10px'
            this.scoreElement.style.padding = '10px'
            this.scoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
            this.scoreElement.style.color = 'white'
            this.scoreElement.style.fontFamily = 'Arial, sans-serif'
            this.scoreElement.style.fontSize = '24px'
            this.scoreElement.style.borderRadius = '5px'
            this.scoreElement.style.zIndex = '1000'
            this.scoreElement.textContent = `Gol: ${this.score}`
            
            // Belgeye ekle
            document.body.appendChild(this.scoreElement)
        }
    }
    
    /**
     * Sıfırlama butonu oluştur
     */
    setResetButton() {
        if (typeof document !== 'undefined') {
            // Reset buton oluştur
            this.resetButton = document.createElement('button')
            this.resetButton.style.position = 'absolute'
            this.resetButton.style.bottom = '20px'
            this.resetButton.style.right = '20px'
            this.resetButton.style.padding = '10px 20px'
            this.resetButton.style.backgroundColor = '#ff6b6b'
            this.resetButton.style.color = 'white'
            this.resetButton.style.border = 'none'
            this.resetButton.style.borderRadius = '5px'
            this.resetButton.style.fontFamily = 'Arial, sans-serif'
            this.resetButton.style.fontSize = '16px'
            this.resetButton.style.cursor = 'pointer'
            this.resetButton.style.zIndex = '1000'
            this.resetButton.textContent = 'Topu Sıfırla'
            
            // Tıklama olayı
            this.resetButton.addEventListener('click', () => {
                this.resetBall()
            })
            
            // Belgeye ekle
            document.body.appendChild(this.resetButton)
        }
    }
    
    /**
     * Topu başlangıç pozisyonuna döndür
     */
    resetBall() {
        // Topu başlangıç pozisyonuna döndür
        this.ball.body.position.set(
            this.models.ball.initialPosition.x,
            this.models.ball.initialPosition.y,
            this.models.ball.initialPosition.z
        )
        
        // Hareketi durdur
        this.ball.body.velocity.set(0, 0, 0)
        this.ball.body.angularVelocity.set(0, 0, 0)
        
        // Topu uyandır
        this.ball.body.wakeUp()
    }
    
    /**
     * Gol olup olmadığını kontrol et
     */
    checkGoal() {
        // Top ve kale arasındaki mesafeyi kontrol et
        const ballPosition = this.ball.body.position
        const triggerPosition = this.goal.trigger.body.position
        
        // Top kaleye yakın ve yeterince yüksek mi
        const distance = Math.sqrt(
            Math.pow(ballPosition.x - triggerPosition.x, 2) +
            Math.pow(ballPosition.y - triggerPosition.y, 2)
        )
        
        // Top kale çizgisini geçti mi ve uygun yükseklikte mi
        if (distance < this.models.goalTrigger.size.y / 2 &&
            ballPosition.z > 0 && 
            ballPosition.z < this.models.goalTrigger.size.z) {
            
            // Top kale çizgisinin gerisinde mi
            if (ballPosition.x > this.models.goalTrigger.position.x) {
                // Gol kaydet ve topu sıfırla
                this.score++
                
                // Skor göstergesini güncelle
                if (this.scoreElement) {
                    this.scoreElement.textContent = `Gol: ${this.score}`
                }
                
                // Gol sesini çal
                if (this.sounds) {
                    this.sounds.play('horn', 0.5)
                }
                
                // Topu sıfırla
                setTimeout(() => this.resetBall(), 1000)
            }
        }
    }
    
    /**
     * Etkileşimleri kontrol et
     */
    checkInteractions() {
        // Klavye kontrolü
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (event) => {
                // Boşluk tuşu - topu sıfırla
                if (event.code === 'Space') {
                    this.resetBall()
                }
                
                // Top kontrolü (oyuncunun arabayla topa vurması gerekir)
                if (event.code === 'KeyF') {
                    // Topa hafif bir itme uygula (test için)
                    this.ball.body.applyImpulse(
                        new CANNON.Vec3(5, 0, 1), 
                        this.ball.body.position
                    )
                }
            })
        }
    }
} 