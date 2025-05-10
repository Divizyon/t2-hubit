import * as THREE from 'three'
import * as CANNON from 'cannon'

export default class SosyalInovasyonAjans
{
    constructor(_options)
    {
        // Options
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug
        this.physics = _options.physics
        this.materials = _options.materials
        this.shadows = _options.shadows

        // Setup
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.setModel()
    }

    setModel()
    {       
        this.model = {}

        try {
            // Resources - model mevcut değilse veya yüklenmediyse null olabilir
            this.model.resource = this.resources.items.sosyalInovasyonAjans
            
            if (!this.model.resource) {
                console.warn('Sosyal İnovasyon Ajansı modeli bulunamadı! Geçici küp oluşturuluyor.')
                this.createPlaceholder()
                return
            }

            // Model yüklendiyse normal işleme devam et
            if (this.model.resource && this.model.resource.scene) {
                // Pozisyon ve rotasyon tanımla
                const fixedPosition = new THREE.Vector3(49, 18, 3)
                const fixedRotation = new THREE.Euler(90,0, 0)

                // Add to objects - sabit obje (mass: 0)
                this.model.object = this.objects.add({
                    base: this.model.resource.scene,
                    collision: this.model.resource.scene,
                    offset: fixedPosition,
                    rotation: fixedRotation,
                    mass: 0
                })
                
                // Manuel fizik bileşeni oluşturma
                const buildingMaterial = this.physics.materials.items.dummy
                
                // Fizik gövdesi oluştur - statik bir nesne
                const body = new CANNON.Body({
                    mass: 0,
                    material: buildingMaterial,
                    position: new CANNON.Vec3(fixedPosition.x, fixedPosition.y, fixedPosition.z),
                    type: CANNON.Body.STATIC
                })
                
                // Binanın boyutları (yaklaşık değerler)
                const width = 4  
                const length = 4  
                const height = 5  
                
                // Merkez kutu oluştur
                const buildingSize = new CANNON.Vec3(width/2, length/2, height/2)
                const buildingShape = new CANNON.Box(buildingSize)
                
                // Rotasyonu uygula
                const rotation = new CANNON.Quaternion()
                rotation.setFromEuler(fixedRotation.x, fixedRotation.y, fixedRotation.z)
                body.quaternion = rotation
                
                // Ana çarpışma kutusunu ekle
                body.addShape(buildingShape)
                
                // Fizik dünyasına ekle
                this.physics.world.addBody(body)
                
                // Model referansı 
                this.model.collision = {
                    body: body
                }
            } else {
                console.warn('Sosyal İnovasyon Ajansı modeli scene içermiyor! Geçici küp oluşturuluyor.')
                this.createPlaceholder()
            }
        } catch (error) {
            console.error('Sosyal İnovasyon Ajansı modeli yüklenirken bir hata oluştu:', error)
            this.createPlaceholder()
        }
    }
    
    // Model bulunamadığında yerine geçici bir küp oluştur
    createPlaceholder() {
        console.log('Sosyal İnovasyon Ajansı için geçici bir küp oluşturuluyor...')
        
        // Geçici küp oluştur
        const geometry = new THREE.BoxGeometry(4, 5, 4)
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        const mesh = new THREE.Mesh(geometry, material)
        
        // Pozisyon ayarla
        const fixedPosition = new THREE.Vector3(49, 18, 3)
        mesh.position.copy(fixedPosition)
        
        // Container'a ekle
        this.container.add(mesh)
        
        // Fizik bileşeni ekle
        if (this.physics && this.physics.materials && this.physics.materials.items) {
            const buildingMaterial = this.physics.materials.items.dummy
            
            if (buildingMaterial) {
                const body = new CANNON.Body({
                    mass: 0,
                    material: buildingMaterial,
                    position: new CANNON.Vec3(fixedPosition.x, fixedPosition.y, fixedPosition.z),
                    type: CANNON.Body.STATIC
                })
                
                const buildingSize = new CANNON.Vec3(2, 2.5, 2)
                const buildingShape = new CANNON.Box(buildingSize)
                body.addShape(buildingShape)
                
                this.physics.world.addBody(body)
                this.model.collision = { body: body }
            }
        }
    }
} 