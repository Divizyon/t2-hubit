import * as THREE from 'three'

export default class render_odasi
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
        this.model.resource = this.resources.items.render_odasi

        // Pozisyon ve rotasyon tanımla -arabanın spawn konumuna göre ayarlanışı
        // Arabaya yakın bir pozisyon 
        const fixedPosition = new THREE.Vector3(-10, 10, 0)
        const fixedRotation = new THREE.Euler(0, 0, 0)

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