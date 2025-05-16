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
        
        this.setGround()
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
        this.models.ball.radius = 0.8 // Top yarıçapı (daha küçük)
        this.models.ball.position = new THREE.Vector3(0, 0, 0) // Başlangıç pozisyonu - daha sonra güncellenecek

        // Kale boyutları - kale.glb modeline uygun olarak güncellenmiş
        this.models.goal = {}
        this.models.goal.size = new THREE.Vector3(2.0, 0.8, 1.2) // genişlik, derinlik, yükseklik
        this.models.goal.position = new THREE.Vector3(-65, 21, 0) // Yeni kale pozisyonu

        // Topun başlangıç pozisyonu - kaleden belirli bir mesafede
        this.models.ball.initialPosition = new THREE.Vector3(
            this.models.goal.position.x + 2.5, // Kaleden 5 birim uzakta
            this.models.goal.position.y + 2, // Y ekseninde 5 birim daha yüksekte
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
        
        // Zemin modeli tanımları
        this.models.ground = {}
        this.models.ground.size = new THREE.Vector2(20, 15) // Zeminin genişliği ve derinliği
        // Zeminin pozisyonu - kalenin önünde ve topun etrafında yeterli alan olacak şekilde
        this.models.ground.position = new THREE.Vector3(
            this.models.goal.position.x + 2.5, // Kalenin biraz sağında
            this.models.goal.position.y+2.3,     // Kale ile aynı y koordinatında
            -0.01                           // Zemin seviyesinde, hafif aşağıda
        )
    }

    /**
     * Futbol sahasını/zeminini oluştur
     */
    setGround() {
        try {
            this.ground = {}
            
            // Zemin container'ı
            this.ground.container = new THREE.Object3D()
            this.ground.container.position.copy(this.models.ground.position)
            
            // Zemin boyutları
            const groundWidth = this.models.ground.size.x
            const groundDepth = this.models.ground.size.y
            
            // Çim dokusu oluştur
            const textureSize = 512
            const canvas = document.createElement('canvas')
            canvas.width = textureSize
            canvas.height = textureSize
            const ctx = canvas.getContext('2d')
            
            // Koyu yeşil arka plan
            ctx.fillStyle = '#1a6300'
            ctx.fillRect(0, 0, textureSize, textureSize)
            
            // Çizgiler için açık yeşil
            ctx.fillStyle = '#2e8c0e'
            
            // Yatay çim şeritleri (satranç deseni)
            const stripeCount = 9
            const stripeWidth = textureSize / stripeCount
            
            for(let i = 0; i < stripeCount; i += 2) {
                ctx.fillRect(0, i * stripeWidth, textureSize, stripeWidth)
            }
            
            // Texture oluştur
            const grassTexture = new THREE.CanvasTexture(canvas)
            grassTexture.wrapS = THREE.RepeatWrapping
            grassTexture.wrapT = THREE.RepeatWrapping
            grassTexture.repeat.set(4, 3) // Dokuyu tekrarla
            
            // Normal haritası
            const bumpCanvas = document.createElement('canvas')
            bumpCanvas.width = textureSize
            bumpCanvas.height = textureSize
            const bumpCtx = bumpCanvas.getContext('2d')
            
            // Rastgele bump/yükseklik değerleri ekle
            bumpCtx.fillStyle = '#888888'
            bumpCtx.fillRect(0, 0, textureSize, textureSize)
            
            for(let i = 0; i < 1000; i++) {
                const x = Math.random() * textureSize
                const y = Math.random() * textureSize
                const size = 1 + Math.random() * 2
                const brightness = Math.random() * 50 + 80 // 80-130 arası gri ton
                
                bumpCtx.fillStyle = `rgb(${brightness},${brightness},${brightness})`
                bumpCtx.beginPath()
                bumpCtx.arc(x, y, size, 0, Math.PI * 2)
                bumpCtx.fill()
            }
            
            const bumpTexture = new THREE.CanvasTexture(bumpCanvas)
            bumpTexture.wrapS = THREE.RepeatWrapping
            bumpTexture.wrapT = THREE.RepeatWrapping
            bumpTexture.repeat.set(8, 6) // Daha fazla detay için daha fazla tekrar
            
            // Zemin materyali
            const groundMaterial = new THREE.MeshStandardMaterial({
                map: grassTexture,
                bumpMap: bumpTexture,
                bumpScale: 0.02,
                roughness: 0.8,
                metalness: 0.1,
                side: THREE.DoubleSide
            })
            
            // Zemin geometrisi
            const groundGeometry = new THREE.PlaneGeometry(groundWidth, groundDepth, 1, 1)
            
            // Zemin mesh'i oluştur - XY düzleminde, Z'ye dik
            this.ground.mesh = new THREE.Mesh(groundGeometry, groundMaterial)
            this.ground.mesh.rotation.x = -Math.PI // Yatay düzleme döndür
            this.ground.mesh.receiveShadow = true
            
            // Futbol sahası çizgileri
            this.addFieldLines()
            
            // Ana container'a ekle
            this.ground.container.add(this.ground.mesh)
            this.container.add(this.ground.container)
            
            console.log('Futbol sahası zemini başarıyla oluşturuldu')
        } catch(error) {
            console.error('Futbol sahası zemini oluşturulamadı:', error)
        }
    }
    
    /**
     * Futbol sahası çizgilerini ekle
     */
    addFieldLines() {
        if (!this.ground || !this.ground.mesh) return
        
        const groundWidth = this.models.ground.size.x
        const groundDepth = this.models.ground.size.y
        
        // Çizgi materyali
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            linewidth: 2
        })
        
        // Saha dış çerçevesi
        const borderPoints = []
        const halfWidth = groundWidth / 2 
        const halfDepth = groundDepth / 2
        const lineHeight = 0.01 // Çizgileri zeminden biraz yükseğe yerleştir
        
        // Saha kenarlarını oluştur - dikdörtgen
        borderPoints.push(new THREE.Vector3(-halfWidth, -halfDepth, lineHeight))
        borderPoints.push(new THREE.Vector3(halfWidth, -halfDepth, lineHeight))
        borderPoints.push(new THREE.Vector3(halfWidth, halfDepth, lineHeight))
        borderPoints.push(new THREE.Vector3(-halfWidth, halfDepth, lineHeight))
        borderPoints.push(new THREE.Vector3(-halfWidth, -halfDepth, lineHeight))
        
        // Geometri ve line mesh oluştur
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints)
        const borderLine = new THREE.Line(borderGeometry, lineMaterial)
        
        // Orta çizgi
        const middlePoints = []
        middlePoints.push(new THREE.Vector3(-halfWidth, 0, lineHeight))
        middlePoints.push(new THREE.Vector3(halfWidth, 0, lineHeight))
        
        const middleGeometry = new THREE.BufferGeometry().setFromPoints(middlePoints)
        const middleLine = new THREE.Line(middleGeometry, lineMaterial)
        
        // Orta nokta dairesi
        const centerCircleRadius = groundDepth / 8
        const centerCircleSegments = 32
        const centerCirclePoints = []
        
        for (let i = 0; i <= centerCircleSegments; i++) {
            const theta = (i / centerCircleSegments) * Math.PI * 2
            const x = Math.cos(theta) * centerCircleRadius
            const y = Math.sin(theta) * centerCircleRadius
            centerCirclePoints.push(new THREE.Vector3(x, y, lineHeight))
        }
        
        const centerCircleGeometry = new THREE.BufferGeometry().setFromPoints(centerCirclePoints)
        const centerCircle = new THREE.Line(centerCircleGeometry, lineMaterial)
        
        // Kaleci sahası (küçük dikdörtgen)
        const goalAreaWidth = groundWidth / 8
        const goalAreaDepth = groundDepth / 6
        const goalAreaPoints = []
        
        goalAreaPoints.push(new THREE.Vector3(-halfWidth, -goalAreaDepth/2, lineHeight))
        goalAreaPoints.push(new THREE.Vector3(-halfWidth + goalAreaWidth, -goalAreaDepth/2, lineHeight))
        goalAreaPoints.push(new THREE.Vector3(-halfWidth + goalAreaWidth, goalAreaDepth/2, lineHeight))
        goalAreaPoints.push(new THREE.Vector3(-halfWidth, goalAreaDepth/2, lineHeight))
        goalAreaPoints.push(new THREE.Vector3(-halfWidth, -goalAreaDepth/2, lineHeight))
        
        const goalAreaGeometry = new THREE.BufferGeometry().setFromPoints(goalAreaPoints)
        const goalArea = new THREE.Line(goalAreaGeometry, lineMaterial)
        
        // Ceza sahası (büyük dikdörtgen)
        const penaltyAreaWidth = groundWidth / 4
        const penaltyAreaDepth = groundDepth / 2
        const penaltyAreaPoints = []
        
        penaltyAreaPoints.push(new THREE.Vector3(-halfWidth, -penaltyAreaDepth/2, lineHeight))
        penaltyAreaPoints.push(new THREE.Vector3(-halfWidth + penaltyAreaWidth, -penaltyAreaDepth/2, lineHeight))
        penaltyAreaPoints.push(new THREE.Vector3(-halfWidth + penaltyAreaWidth, penaltyAreaDepth/2, lineHeight))
        penaltyAreaPoints.push(new THREE.Vector3(-halfWidth, penaltyAreaDepth/2, lineHeight))
        penaltyAreaPoints.push(new THREE.Vector3(-halfWidth, -penaltyAreaDepth/2, lineHeight))
        
        const penaltyAreaGeometry = new THREE.BufferGeometry().setFromPoints(penaltyAreaPoints)
        const penaltyArea = new THREE.Line(penaltyAreaGeometry, lineMaterial)
        
        // Penaltı noktası
        const penaltySpotGeometry = new THREE.CircleGeometry(0.2, 16)
        const penaltySpotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const penaltySpot = new THREE.Mesh(penaltySpotGeometry, penaltySpotMaterial)
        penaltySpot.position.set(-halfWidth + penaltyAreaWidth/2, 0, lineHeight)
        penaltySpot.rotation.x = -Math.PI / 2
        
        // Çizgileri ground container'a ekle
        this.ground.container.add(borderLine)
        this.ground.container.add(middleLine)
        this.ground.container.add(centerCircle)
        this.ground.container.add(goalArea)
        this.ground.container.add(penaltyArea)
        this.ground.container.add(penaltySpot)
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

            // Ana container önce oluşturulur - hem top modeli hem collision sphere bunun altında olacak
            this.ball.container = new THREE.Object3D()
            this.ball.container.position.copy(this.models.ball.initialPosition)
            this.container.add(this.ball.container)
            
            // Önce collision sphere oluştur - referans olarak kullanılacak
            this.createCollisionDebugSphere()
            
            // GLB modelini kullanarak topun görsel modelini oluştur
            if (this.resources.items.topv2Model) {
                console.log('Top modeli (topv2.glb) bulundu, yükleniyor...')
                
                // Modeli için ayrı container oluştur (pivot noktası için)
                this.ball.modelContainer = new THREE.Object3D()
                this.ball.modelContainer.position.set(0, 0, 0) // Collision sphere ile aynı merkezde
                
                // ModelContainer'ı ana container'a ekle
                this.ball.container.add(this.ball.modelContainer)
                
                // GLB modelini kopyala
                const topModel = this.resources.items.topv2Model.scene.clone()
                
                // Önce varsayılan bir ölçek uygula (daha küçük başlangıç ölçeği)
                topModel.scale.set(1.8, 1.8, 1.8)
                
                // BoundingBox oluştur ve modelin boyutunu hesapla
                const tempBbox = new THREE.Box3().setFromObject(topModel)
                const modelSize = new THREE.Vector3()
                tempBbox.getSize(modelSize)
                
                // Modelin en büyük boyutu
                const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z)
                
                // Collision sphere'in çapı
                const sphereDiameter = this.models.ball.radius * 2
                
                // Modelin tam olarak sphere'e sığması için ölçek faktörü hesapla
                const scaleFactor = sphereDiameter / maxDimension
                
                // Yeni ölçeği uygula - top tam olarak collision sphere boyutunda olacak
                const finalScale = 1.8 * scaleFactor * 0.99 // %99 oranında sığdırma (kesin taşmama için)
                topModel.scale.set(finalScale, finalScale, finalScale)
                
                console.log('Top modeli için hesaplanan ölçek:', finalScale)
                
                // Son durumda modelin merkez noktasını hesapla
                const bbox = new THREE.Box3().setFromObject(topModel)
                const modelCenter = new THREE.Vector3()
                bbox.getCenter(modelCenter)
                
                console.log('Model merkez noktası:', modelCenter)
                
                // Modeli merkez noktası (0,0,0) olacak şekilde konumlandır
                topModel.position.set(-modelCenter.x, -modelCenter.y, -modelCenter.z)
                
                // Merkeze tam oturması için küçük bir offset 
                const manualOffset = new THREE.Vector3(0, 0, 0);
                topModel.position.add(manualOffset);
                
                // Tüm mesh'leri geçip materyalleri ayarla
                topModel.traverse((child) => {
                    if (child.isMesh) {
                        console.log('Top mesh bulundu:', child.name)
                        
                        // Beyaz kısımlar için basit flat materyal kullan - daha parlak
                        if (child.name.includes('White') || child.name === 'shadeWhite.001') {
                            child.material = new THREE.MeshBasicMaterial({
                                color: 0xFFFFFF, // Tam beyaz
                                flatShading: true
                            })
                        } 
                        // Siyah kısımlar için daha belirgin renk kullan
                        else if (child.name.includes('Black') || child.name === 'shadeBlack') {
                            child.material = new THREE.MeshBasicMaterial({
                                color: 0x222222, // Daha koyu siyah
                                flatShading: true
                            })
                        }
                        
                        // Gölgeleri tamamen kapat
                        child.castShadow = false
                        child.receiveShadow = false
                    }
                })
                
                // Modeli modelContainer'a ekle
                this.ball.modelContainer.add(topModel)
                
                // Top mesh'i olarak container'ı ata (tüm fizik güncellemeleri buna uygulanacak) 
                this.ball.mesh = this.ball.container
                
                console.log('Top modeli başarıyla yüklendi, shader ve gölgeler düzeltildi')
            } else {
                // Varsayılan top (model bulunamazsa)
                const ballGeometry = new THREE.SphereGeometry(this.models.ball.radius, 32, 32)
                const ballMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xffffff,
                    wireframe: true
                })
                const simpleBallMesh = new THREE.Mesh(ballGeometry, ballMaterial)
                
                // Gölge özelliklerini kapat
                simpleBallMesh.castShadow = false
                simpleBallMesh.receiveShadow = false
                
                // Basit topu ana container'a ekle
                this.ball.container.add(simpleBallMesh)
                this.ball.mesh = this.ball.container
                
                console.warn('Top modeli (topv2.glb) bulunamadı, basit top kullanılıyor')
            }

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
                    // Ana container'ı fizik gövdesine senkronize et
                    this.ball.container.position.copy(this.ball.body.position);
                    this.ball.container.quaternion.copy(this.ball.body.quaternion);
                    
                    // YENİ: Gol çizgisini geçip geçmediğini kontrol et
                    this.checkBallCrossedGoalLine();
                }
            });
        } catch (error) {
            console.error('Top oluşturulamadı:', error)
        }
    }

    // Fizik motoru collision için debug sphere oluştur
    createCollisionDebugSphere() {
        // Debug sphere için materyal oluştur - GÖRÜNMEZ wireframe
        const debugMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0, // Tamamen saydam (görünmez)
            depthTest: false,
            depthWrite: false
        });
        
        // Physics body boyutlarıyla uyumlu debug sphere oluştur
        const debugGeometry = new THREE.SphereGeometry(this.models.ball.radius, 24, 24);
        this.ball.debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        
        // Debug mesh'i container'ın merkezine yerleştir - tam 0,0,0 noktasında
        this.ball.debugMesh.position.set(0, 0, 0);
        
        // Debug mesh'i container'a ekle
        this.ball.container.add(this.ball.debugMesh);
        
        // Debug mesh'i görünmez yap
        this.ball.debugMesh.visible = false;
        
        console.log('Collision debug mesh oluşturuldu (GÖRÜNMEZ)');
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
                    this.models.ball.initialPosition.y+0.3   // Ve biraz aşağısında
                ),
                halfExtents: new THREE.Vector2(2.5, 2.5), // 5 kat daha büyük (0.5 * 5 = 2.5)
                debug: this.debug ? { color: 0x00ff00 } : false,
                text: {
                    value: 'YENİLE',
                    position: new THREE.Vector2(0, 0),
                    size: 2.5 // Yazı boyutunu da 5 kat büyüt
                }
            })

            // Diğer butonlar gibi canvas ile yazı label'ı ekle
            if (!this.resetButtonLabel) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 1024;
                canvas.height = 256;
                const gradient = ctx.createRadialGradient(
                    canvas.width/2, canvas.height/2, 0,
                    canvas.width/2, canvas.height/2, canvas.width/2
                );
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
                gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 96px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('YENİLE', canvas.width/2, canvas.height/2);
                ctx.shadowColor = '#4285f4';
                ctx.shadowBlur = 25;
                ctx.fillText('YENİLE', canvas.width/2, canvas.height/2);
                const texture = new THREE.CanvasTexture(canvas);
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                const labelGeometry = new THREE.PlaneGeometry(3, 0.8);
                const labelMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                this.resetButtonLabel = new THREE.Mesh(labelGeometry, labelMaterial);
                this.resetButtonLabel.position.set(
                    this.models.ball.initialPosition.x + 5,
                    this.models.ball.initialPosition.y + 0.3,
                    0 // Zeminle aynı hizada olsun
                );
                this.container.add(this.resetButtonLabel);
            }

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