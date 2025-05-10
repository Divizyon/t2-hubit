import * as THREE from 'three'

export default class JaponParki
{
    constructor(_options)
    {
        // Options
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug

        // Setup
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        console.log('JaponParki sınıfı oluşturuldu')
        this.setModel()
    }

    setModel()
    {       
        this.model = {}

        // Resources
        this.model.resource = this.resources.items.japonParkiModel
        
        if (!this.model.resource) {
            console.error('Japon Parkı modeli yüklenemedi!')
            return
        }
        
        console.log('Japon Parkı modeli başarıyla yüklendi:', this.model.resource)

        // Pozisyon ve rotasyon tanımla
        // Uygun bir konuma yerleştirme
        const fixedPosition = new THREE.Vector3(5, -30, -1.87)
        const fixedRotation = new THREE.Euler(Math.PI/2, Math.PI,0)

        // Add to objects - sabit obje (mass: 0)
        this.model.object = this.objects.add({
            base: this.model.resource.scene,
            collision: this.model.resource.scene, // Fizik olmayacağı için scene kullanıldı
            offset: fixedPosition,
            rotation: fixedRotation,
            mass: 0 // Sabit obje, fizik yok
        })
        
        console.log('Japon Parkı modeli sahneye eklendi')
    }
} 