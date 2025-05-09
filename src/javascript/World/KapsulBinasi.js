import * as THREE from 'three'

export default class KapsulBinasi
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

        this.setModel()
    }

    setModel()
    {       
        this.model = {}

        // Resources
        this.model.resource = this.resources.items.KapsulBinasi

        // Pozisyon ve rotasyon tanımla -arabanın spawn konumuna göre ayarlanışı
        // Konum ayarlama
        const fixedPosition = new THREE.Vector3(10, 3.3, 1.5)
        const fixedRotation = new THREE.Euler(-Math.PI, -Math.PI, 2.759)

        // Add to objects - sabit obje (mass: 0)
        this.model.object = this.objects.add({
            base: this.model.resource.scene,
            collision: this.model.resource.scene, // Fizik olmayacağı için 
            offset: fixedPosition,
            rotation: fixedRotation,
            mass: 0 // Sabit obje,fizik yok
        })
    }
} 