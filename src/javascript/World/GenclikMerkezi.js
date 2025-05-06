import * as THREE from 'three'

export default class GenclikMerkezi
{
    constructor(_options)
    {
        // Options
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.setModel()
    }

    setModel()
    {
        this.model = {}
        
        // Resource
        this.model.resource = this.resources.items.genclikMerkezi

        // Pozisyon ve rotasyon tanımla - arabanın spawn konumuna göre ayarlanmıştır
        // Arabaya yakın bir pozisyon (x:12, z:0)
        const fixedPosition = new THREE.Vector3(10, -20, 0)
        const fixedRotation = new THREE.Euler(0, 0, 0)

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('genclikMerkezi')
            this.debugFolder.add(fixedPosition, 'x').step(0.1).name('positionX')
            this.debugFolder.add(fixedPosition, 'y').step(0.1).name('positionY') 
            this.debugFolder.add(fixedPosition, 'z').step(0.1).name('positionZ')
        }

        // Add to objects - objects.add kullan çünkü bu materyal işleme için gerekli
        this.model.object = this.objects.add({
            base: this.model.resource.scene,
            collision: this.model.resource.scene,
            offset: fixedPosition,
            rotation: fixedRotation,
            mass: 0 // Sabit obje, fizik yok
        })
    }
} 