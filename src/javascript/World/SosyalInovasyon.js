import * as THREE from 'three'

export default class SosyalInovasyon
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
                x: 42,
                y: 15,
                z: 3
            },
            rotation: {
                x: 90,
                y: 0,
                z: 0
            },
            scale: {
                x: 1.8,
                y: 1.8,
                z: 1.8
            }
        }

        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('Sosyal İnovasyon Ajansı')
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

        // Sosyal İnovasyon Ajansı'nı ayarla
        this.setSosyalInovasyon()
    }

    updatePosition()
    {
        if(this.sosyalInovasyon && this.sosyalInovasyon.mesh)
        {
            this.sosyalInovasyon.mesh.position.x = this.debugProperties.position.x
            this.sosyalInovasyon.mesh.position.y = this.debugProperties.position.y
            this.sosyalInovasyon.mesh.position.z = this.debugProperties.position.z
        }
    }

    updateRotation()
    {
        if(this.sosyalInovasyon && this.sosyalInovasyon.mesh)
        {
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };

            this.sosyalInovasyon.mesh.rotation.x = degToRad(this.debugProperties.rotation.x)
            this.sosyalInovasyon.mesh.rotation.y = degToRad(this.debugProperties.rotation.y)
            this.sosyalInovasyon.mesh.rotation.z = degToRad(this.debugProperties.rotation.z)
        }
    }

    updateScale()
    {
        if(this.sosyalInovasyon && this.sosyalInovasyon.mesh)
        {
            this.sosyalInovasyon.mesh.scale.x = this.debugProperties.scale.x
            this.sosyalInovasyon.mesh.scale.y = this.debugProperties.scale.y
            this.sosyalInovasyon.mesh.scale.z = this.debugProperties.scale.z
        }
    }

    setSosyalInovasyon()
    {
        this.sosyalInovasyon = {}
        
        // Modeli yükle
        this.sosyalInovasyon.resource = this.resources.items.sosyalInovasyonModel
        
        if(!this.sosyalInovasyon.resource) {
            console.error('Hata: Sosyal İnovasyon Ajansı modeli yüklenemedi!')
            return
        }
        
        console.log('Sosyal İnovasyon Ajansı modeli yüklendi:', this.sosyalInovasyon.resource)
        
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
            this.sosyalInovasyon.mesh = this.objects.getConvertedMesh(this.sosyalInovasyon.resource.scene.children)
            this.sosyalInovasyon.mesh.position.copy(position)
            this.sosyalInovasyon.mesh.rotation.copy(rotation)
            this.sosyalInovasyon.mesh.scale.copy(scale)
            
            // Konteynere ekle
            this.container.add(this.sosyalInovasyon.mesh)
            
            console.log('Sosyal İnovasyon Ajansı modeli başarıyla yüklendi')
        } catch(error) {
            console.error('Sosyal İnovasyon Ajansı modelini yüklerken hata oluştu:', error)
        }
    }
} 