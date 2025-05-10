import * as THREE from 'three'
import * as CANNON from 'cannon'

export default class GenclikMerkezi
{
    constructor(_options)
    {
        // Options
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug
        this.physics = _options.physics // Physics eklendi

        // Setup
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.setModel()
    }

    setModel()
    {       
        this.model = {}

        // Resources
        this.model.resource = this.resources.items.CalisanGenclikMerkezi

        // Pozisyon ve rotasyon tanımla
        const fixedPosition = new THREE.Vector3(41, -14, 0)
        const fixedRotation = new THREE.Euler(0, 0, -0.99)

        // Add to objects - sabit obje (mass: 0)
        this.model.object = this.objects.add({
            base: this.model.resource.scene,
            collision: this.model.resource.scene, // Dinamik collision modelimiz yok, bu yüzden aynı modeli kullanıyoruz
            offset: fixedPosition,
            rotation: fixedRotation,
            mass: 0 // Sabit obje
        })
        
        // Manuel fizik bileşeni oluşturma
        const buildingMaterial = this.physics.materials.items.dummy
        
        // Fizik gövdesi oluştur - statik bir nesne
        const body = new CANNON.Body({
            mass: 0, // 0 kütle = statik nesne
            material: buildingMaterial,
            position: new CANNON.Vec3(fixedPosition.x + 1.5, fixedPosition.y + 1.2, fixedPosition.z),
            type: CANNON.Body.STATIC
        })
        
        // Binanın boyutları (yaklaşık değerler)
        const width = 5;  // x-ekseni genişliği
        const length = 3.5;  // y-ekseni uzunluğu
        const height = 5;  // z-ekseni yüksekliği
        
        // Merkez kutu oluştur (tüm binanın etrafına)
        const buildingSize = new CANNON.Vec3(width/2, length/2, height/2)
        const buildingShape = new CANNON.Box(buildingSize)
        
        // Rotasyonu uygulamak için bir quaternion oluştur
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
    }
}