import * as THREE from 'three'
import * as CANNON from 'cannon'

export default class Kelebekler
{
    constructor(_options)
    {
        // Gerekli parametreler
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug
        this.config = _options.config
        this.time = _options.time
        this.physics = _options.physics // Fizik motorunu al
        
        // Container oluştur
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        // Debug
        this.debugProperties = {
            position: {
                x: 27,
                y: 15,
                z: -3
            },
            rotation: {
                x: 0,
                y: 0, 
                z: 25
            },
            scale: {
                x: 2.6,
                y: 2.6,
                z: 2.6
            },
            animasyonHizi: 0.00000001,
            ucusYuksekligi: 0,
            showCollision: false // Çarpışma görünürlüğü için
        }

        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('Kelebekler')
            this.debugFolder.add(this.debugProperties.position, 'x').min(-50).max(50).step(0.1).name('pozisyon x').onChange(() => { this.updatePosition() })
            this.debugFolder.add(this.debugProperties.position, 'y').min(-20).max(20).step(0.1).name('pozisyon y').onChange(() => { this.updatePosition() })
            this.debugFolder.add(this.debugProperties.position, 'z').min(-50).max(50).step(0.1).name('pozisyon z').onChange(() => { this.updatePosition() })
            
            this.debugFolder.add(this.debugProperties.rotation, 'x').min(0).max(360).step(1).name('rotasyon x').onChange(() => { this.updateRotation() })
            this.debugFolder.add(this.debugProperties.rotation, 'y').min(0).max(360).step(1).name('rotasyon y').onChange(() => { this.updateRotation() })
            this.debugFolder.add(this.debugProperties.rotation, 'z').min(0).max(360).step(1).name('rotasyon z').onChange(() => { this.updateRotation() })
            
            this.debugFolder.add(this.debugProperties.scale, 'x').min(0.1).max(5).step(0.1).name('ölçek x').onChange(() => { this.updateScale() })
            this.debugFolder.add(this.debugProperties.scale, 'y').min(0.1).max(5).step(0.1).name('ölçek y').onChange(() => { this.updateScale() })
            this.debugFolder.add(this.debugProperties.scale, 'z').min(0.1).max(5).step(0.1).name('ölçek z').onChange(() => { this.updateScale() })
            
            this.debugFolder.add(this.debugProperties, 'animasyonHizi').min(0).max(2).step(0.01).name('animasyon hızı')
            this.debugFolder.add(this.debugProperties, 'ucusYuksekligi').min(0).max(5).step(0.1).name('uçuş yüksekliği')
            this.debugFolder.add(this.debugProperties, 'showCollision').name('Çarpışma göster').onChange(() => {
                if(this.collisionHelpers) {
                    this.collisionHelpers.visible = this.debugProperties.showCollision
                }
            })
        }

        // Kelebekler'i ayarla
        this.setKelebekler()
        
        // Animasyon
        this.time.on('tick', () => {
            this.animate()
        })
    }

    updatePosition()
    {
        if(this.kelebekler && this.kelebekler.model)
        {
            this.kelebekler.model.position.x = this.debugProperties.position.x
            this.kelebekler.model.position.y = this.debugProperties.position.y
            this.kelebekler.model.position.z = this.debugProperties.position.z
            
            // Fizik gövdesini de güncelle
            if(this.kelebekler.collision && this.kelebekler.collision.body) {
                this.kelebekler.collision.body.position.set(
                    this.debugProperties.position.x,
                    this.debugProperties.position.y,
                    this.debugProperties.position.z
                )
                
                // Helper'ları da güncelle
                if(this.collisionHelpers) {
                    this.updateCollisionHelpers()
                }
            }
        }
    }

    updateRotation()
    {
        if(this.kelebekler && this.kelebekler.model)
        {
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };

            this.kelebekler.model.rotation.x = degToRad(this.debugProperties.rotation.x)
            this.kelebekler.model.rotation.y = degToRad(this.debugProperties.rotation.y)
            this.kelebekler.model.rotation.z = degToRad(this.debugProperties.rotation.z)
            
            // Fizik gövdesini de güncelle
            if(this.kelebekler.collision && this.kelebekler.collision.body) {
                const rotation = new CANNON.Quaternion()
                rotation.setFromEuler(
                    degToRad(this.debugProperties.rotation.x),
                    degToRad(this.debugProperties.rotation.y),
                    degToRad(this.debugProperties.rotation.z)
                )
                this.kelebekler.collision.body.quaternion.copy(rotation)
                
                // Helper'ları da güncelle
                if(this.collisionHelpers) {
                    this.updateCollisionHelpers()
                }
            }
        }
    }

    updateScale()
    {
        if(this.kelebekler && this.kelebekler.model)
        {
            this.kelebekler.model.scale.x = this.debugProperties.scale.x
            this.kelebekler.model.scale.y = this.debugProperties.scale.y
            this.kelebekler.model.scale.z = this.debugProperties.scale.z
            
            // Fizik gövdesini de güncelle - ölçek değiştiğinde collider'ları yeniden oluştur
            if(this.physics && this.kelebekler.collision && this.kelebekler.collision.body) {
                // Mevcut gövdeyi kaldır
                this.physics.world.removeBody(this.kelebekler.collision.body)
                
                // Yeni gövde oluştur
                this.createCollisionBody()
                
                // Helper'ları da güncelle
                if(this.collisionHelpers) {
                    this.updateCollisionHelpers()
                }
            }
        }
    }

    setKelebekler()
    {
        this.kelebekler = {}
        
        // Modeli yükle
        this.kelebekler.resource = this.resources.items.kelebeklerModel
        
        if(!this.kelebekler.resource) {
            console.error('Hata: Kelebekler modeli yüklenemedi!')
            return
        }
        
        console.log('Kelebekler modeli yüklendi:', this.kelebekler.resource)
        
        try {
            // Dereceyi radyana çeviren yardımcı fonksiyon
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };
            
            // Eğim değerleri (derece cinsinden)
            const xRotation = this.debugProperties.rotation.x;
            const yRotation = this.debugProperties.rotation.y; 
            const zRotation = this.debugProperties.rotation.z;  
            
            // Pozisyon ayarla
            const position = new THREE.Vector3(
                this.debugProperties.position.x, 
                this.debugProperties.position.y, 
                this.debugProperties.position.z
            )
            
            // Rotasyon ayarla
            const rotation = new THREE.Euler(
                degToRad(xRotation),
                degToRad(yRotation),
                degToRad(zRotation)
            )
            
            // Ölçek ayarla
            const scale = new THREE.Vector3(
                this.debugProperties.scale.x, 
                this.debugProperties.scale.y, 
                this.debugProperties.scale.z
            )
            
            // Mesh oluştur
            this.kelebekler.model = this.objects.getConvertedMesh(this.kelebekler.resource.scene.children)
            this.kelebekler.model.position.copy(position)
            this.kelebekler.model.rotation.copy(rotation)
            this.kelebekler.model.scale.copy(scale)
            
            // İlk pozisyonları kaydet (animasyon için)
            this.kelebekler.initialPositions = []
            
            // Tüm kelebeklerin başlangıç pozisyonlarını kaydet
            if (this.kelebekler.model.children && this.kelebekler.model.children.length > 0) {
                for (let i = 0; i < this.kelebekler.model.children.length; i++) {
                    const butterfly = this.kelebekler.model.children[i]
                    this.kelebekler.initialPositions.push({
                        x: butterfly.position.x,
                        y: butterfly.position.y,
                        z: butterfly.position.z
                    })
                }
            }
            
            // Konteynere ekle
            this.container.add(this.kelebekler.model)
            
            // Fizik çarpışma gövdesi oluştur
            if(this.physics) {
                this.createCollisionBody()
            }
            
            console.log('Kelebekler modeli başarıyla yüklendi')
        } catch(error) {
            console.error('Kelebekler modelini yüklerken hata oluştu:', error)
        }
    }
    
    createCollisionBody() {
        // Fizik malzemesi al
        const material = this.physics.materials.items.dummy
        
        // Kelebekler için ana sınır kutusu boyutları
        const width = 3.5 * this.debugProperties.scale.x
        const height = 3.5 * this.debugProperties.scale.y
        const depth = 3.5 * this.debugProperties.scale.z
        
        // Fizik gövdesi oluştur - statik nesne (kütle=0)
        const body = new CANNON.Body({
            mass: 0, // Statik nesne
            material: material,
            position: new CANNON.Vec3(
                this.debugProperties.position.x, 
                this.debugProperties.position.y, 
                this.debugProperties.position.z
            ),
            type: CANNON.Body.STATIC
        })
        
        // Rotasyon ayarla
        const degToRad = (degrees) => {
            return degrees * (Math.PI / 180)
        }
        
        const rotationQuaternion = new CANNON.Quaternion()
        rotationQuaternion.setFromEuler(
            degToRad(this.debugProperties.rotation.x),
            degToRad(this.debugProperties.rotation.y),
            degToRad(this.debugProperties.rotation.z)
        )
        body.quaternion = rotationQuaternion
        
        // Ana kutu şekli oluştur
        const boxShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2))
        body.addShape(boxShape)
        
        // Dünyaya ekle
        this.physics.world.addBody(body)
        
        // Fizik gövdesini kaydet
        this.kelebekler.collision = {
            body: body
        }
        
        // Debug için görsel helper'lar oluştur
        if(this.debug) {
            this.createCollisionHelpers(width, height, depth)
        }
    }
    
    createCollisionHelpers(width, height, depth) {
        // Varsa mevcut helper'ları kaldır
        if(this.collisionHelpers) {
            this.container.remove(this.collisionHelpers)
        }
        
        // Yeni helper grup oluştur
        this.collisionHelpers = new THREE.Group()
        
        // Ana kutu helper
        const boxHelper = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        )
        
        // Helper pozisyonunu ve rotasyonunu ayarla
        boxHelper.position.set(
            this.debugProperties.position.x,
            this.debugProperties.position.y,
            this.debugProperties.position.z
        )
        
        const degToRad = (degrees) => {
            return degrees * (Math.PI / 180)
        }
        
        boxHelper.rotation.set(
            degToRad(this.debugProperties.rotation.x),
            degToRad(this.debugProperties.rotation.y),
            degToRad(this.debugProperties.rotation.z)
        )
        
        this.collisionHelpers.add(boxHelper)
        
        // Görünürlüğü ayarla
        this.collisionHelpers.visible = this.debugProperties.showCollision
        
        // Container'a ekle
        this.container.add(this.collisionHelpers)
    }
    
    updateCollisionHelpers() {
        if(this.collisionHelpers && this.collisionHelpers.children.length > 0) {
            const boxHelper = this.collisionHelpers.children[0]
            
            // Helper pozisyonunu güncelle
            boxHelper.position.set(
                this.debugProperties.position.x,
                this.debugProperties.position.y,
                this.debugProperties.position.z
            )
            
            // Helper rotasyonunu güncelle
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180)
            }
            
            boxHelper.rotation.set(
                degToRad(this.debugProperties.rotation.x),
                degToRad(this.debugProperties.rotation.y),
                degToRad(this.debugProperties.rotation.z)
            )
        }
    }
    
    animate() {
        // Kelebekler varsa animasyonu gerçekleştir
        if (this.kelebekler && this.kelebekler.model && this.kelebekler.model.children) {
            const time = this.time.elapsed * this.debugProperties.animasyonHizi
            
            // Her bir kelebeği animasyonla hareket ettir
            for (let i = 0; i < this.kelebekler.model.children.length; i++) {
                const butterfly = this.kelebekler.model.children[i]
                const initialPos = this.kelebekler.initialPositions[i]
                
                if (butterfly && initialPos) {
                    // Sinüs dalgası kullanarak uçuş hareketi oluştur
                    butterfly.position.y = initialPos.y + Math.sin(time + i * 0.5) * this.debugProperties.ucusYuksekligi
                    
                    // Kelebeklerin kanatlarını çırpmasını simüle et
                    butterfly.rotation.z = Math.sin(time * 5 + i) * 0.2
                }
            }
        }
    }
} 