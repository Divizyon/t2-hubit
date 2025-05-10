import * as THREE from 'three'
import * as CANNON from 'cannon'

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

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.setModel()
        
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
            offset: fixedPosition,
            rotation: fixedRotation,
            mass: 0 // Sabit obje
        })
        
        // Manuel fizik bileşeni oluşturma
        const boxMaterial = this.physics.materials.items.dummy
        
        // Fizik gövdesi oluştur - statik bir nesne
        const body = new CANNON.Body({
            mass: 0, // 0 kütle = statik nesne
            material: boxMaterial,
            position: new CANNON.Vec3(fixedPosition.x, fixedPosition.y, fixedPosition.z),
            type: CANNON.Body.STATIC
        })
        
        // Oda boyutları
        const width = 5;  // x-ekseni genişliği
        const length = 6;  // y-ekseni uzunluğu
        const height = 12;   // z-ekseni yüksekliği
        
        // Duvar konumlarını modele yaklaştır
        const backWallDistance = 2.3;  // Daha küçük değer = modele daha yakın (eski değer: length/2 = 5)
        const leftWallDistance = 2.3;  // Daha küçük değer = modele daha yakın (eski değer: width/2 = 5)

        // Kamera objesinin konumu - görüntüdeki pozisyona göre yaklaşık değerler
        const cameraPosition = {
            x: fixedPosition.x + 5.9, 
            y: fixedPosition.y-5.8,     // kamera collisionun konumu
            z: fixedPosition.z      
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
                cameraPosition.x - fixedPosition.x, 
                cameraPosition.y - fixedPosition.y, 
                cameraPosition.z - fixedPosition.z + 1 // Kamera yüksekliği için hafif yukarıda
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
                fixedPosition.x, 
                fixedPosition.y + backWallDistance, 
                fixedPosition.z
            )
            this.wallHelpers.add(backWallHelper)
            
            // Sol duvar helper
            const leftWallHelper = new THREE.Mesh(
                new THREE.BoxGeometry(leftWallSize.x * 2, leftWallSize.y * 2, leftWallSize.z * 2),
                new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
            )
            leftWallHelper.position.set(
                fixedPosition.x - leftWallDistance, 
                fixedPosition.y, 
                fixedPosition.z
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
}
