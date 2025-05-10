import * as THREE from 'three'

export default class AlaaddinTepesi
{
    constructor(_options)
    {
        // Gerekli parametreler
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug
        this.config = _options.config
        this.time = _options.time
        
        // Container oluştur
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        // Debug
        this.debugProperties = {
            position: {
                x: -10,
                y: -30,
                z: -3
            },
            rotation: {
                x: 0,
                y: 180,
                z: 0
            },
            scale: {
                x: 0.8,
                y: 0.8,
                z: 0.8
            }
        }

        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('Alaaddin Tepesi')
            this.debugFolder.add(this.debugProperties.position, 'x').min(-50).max(50).step(0.1).name('pozisyon x').onChange(() => { this.updatePosition() })
            this.debugFolder.add(this.debugProperties.position, 'y').min(-50).max(50).step(0.1).name('pozisyon y').onChange(() => { this.updatePosition() })
            this.debugFolder.add(this.debugProperties.position, 'z').min(-50).max(50).step(0.1).name('pozisyon z').onChange(() => { this.updatePosition() })
            
            this.debugFolder.add(this.debugProperties.rotation, 'x').min(0).max(360).step(1).name('rotasyon x').onChange(() => { this.updateRotation() })
            this.debugFolder.add(this.debugProperties.rotation, 'y').min(0).max(360).step(1).name('rotasyon y').onChange(() => { this.updateRotation() })
            this.debugFolder.add(this.debugProperties.rotation, 'z').min(0).max(360).step(1).name('rotasyon z').onChange(() => { this.updateRotation() })
            
            this.debugFolder.add(this.debugProperties.scale, 'x').min(0.1).max(5).step(0.1).name('ölçek x').onChange(() => { this.updateScale() })
            this.debugFolder.add(this.debugProperties.scale, 'y').min(0.1).max(5).step(0.1).name('ölçek y').onChange(() => { this.updateScale() })
            this.debugFolder.add(this.debugProperties.scale, 'z').min(0.1).max(5).step(0.1).name('ölçek z').onChange(() => { this.updateScale() })
        }

        // Alaaddin Tepesi'ni ayarla
        this.setAlaaddinTepesi()
    }

    updatePosition()
    {
        if(this.alaaddinTepesi && this.alaaddinTepesi.mesh)
        {
            this.alaaddinTepesi.mesh.position.x = this.debugProperties.position.x
            this.alaaddinTepesi.mesh.position.y = this.debugProperties.position.y
            this.alaaddinTepesi.mesh.position.z = this.debugProperties.position.z
        }
    }

    updateRotation()
    {
        if(this.alaaddinTepesi && this.alaaddinTepesi.mesh)
        {
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };

            this.alaaddinTepesi.mesh.rotation.x = degToRad(this.debugProperties.rotation.x)
            this.alaaddinTepesi.mesh.rotation.y = degToRad(this.debugProperties.rotation.y)
            this.alaaddinTepesi.mesh.rotation.z = degToRad(this.debugProperties.rotation.z)
        }
    }

    updateScale()
    {
        if(this.alaaddinTepesi && this.alaaddinTepesi.mesh)
        {
            this.alaaddinTepesi.mesh.scale.x = this.debugProperties.scale.x
            this.alaaddinTepesi.mesh.scale.y = this.debugProperties.scale.y
            this.alaaddinTepesi.mesh.scale.z = this.debugProperties.scale.z
        }
    }

    setAlaaddinTepesi()
    {
        this.alaaddinTepesi = {}
        
        // Modeli yükle
        this.alaaddinTepesi.resource = this.resources.items.alaaddinTepesiModel
        
        if(!this.alaaddinTepesi.resource) {
            console.error('Hata: Alaaddin Tepesi modeli yüklenemedi!')
            return
        }
        
        console.log('Alaaddin Tepesi modeli yüklendi:', this.alaaddinTepesi.resource)
        
        try {
            // Dereceyi radyana çeviren yardımcı fonksiyon
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };
            
            // Eğim değerleri (derece cinsinden)
            const xRotation = this.debugProperties.rotation.x;
            const yRotation = this.debugProperties.rotation.y; 
            const zRotation = this.debugProperties.rotation.z;  
            
            // Pozisyon ayarla - görünür bir yere yerleştir
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
            this.alaaddinTepesi.mesh = this.objects.getConvertedMesh(this.alaaddinTepesi.resource.scene.children)
            this.alaaddinTepesi.mesh.position.copy(position)
            this.alaaddinTepesi.mesh.rotation.copy(rotation)
            this.alaaddinTepesi.mesh.scale.copy(scale)
            
            // Konteynere ekle
            this.container.add(this.alaaddinTepesi.mesh)
            
            console.log('Alaaddin Tepesi modeli başarıyla yüklendi')
        } catch(error) {
            console.error('Alaaddin Tepesi modelini yüklerken hata oluştu:', error)
        }
    }
} 