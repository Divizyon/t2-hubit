import * as THREE from 'three'

export default class Divizyon
{
    constructor(_options)
    {
        // Debug kontrolü
        console.log('Divizyon constructor çalıştı, debug durumu:', _options.debug);
        
        // Gerekli parametreler
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug
        this.config = _options.config
        this.time = _options.time
        this.areas = _options.areas
        this.walls = _options.walls
        this.tiles = _options.tiles
        this.materials = _options.materials
        this.x =  -98// X pozisyonu
        this.y = -1 // Y pozisyonu
        this.z = 0 // Z pozisyonu
        
        // Container oluştur
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        // Debug
        if(this.debug)
        {
            console.log('Debug modunda Divizyon paneli oluşturuluyor');
            this.debugFolder = this.debug.addFolder('divizyon')
            this.debugFolder.open()
            
            // Position debug
            const positionFolder = this.debugFolder.addFolder('position')
            positionFolder.add(this, 'x').name('X').min(-100).max(100).step(0.1).onChange(() => this.updatePosition())
            positionFolder.add(this, 'y').name('Y').min(-100).max(100).step(0.1).onChange(() => this.updatePosition())
            positionFolder.add(this, 'z').name('Z').min(-100).max(100).step(0.1).onChange(() => this.updatePosition())
            
            // Scale debug
            this.debugObject = {
                scaleX: 0.5,
                scaleY: 0.5,
                scaleZ: 0.5,
                rotationX: 53,
                rotationY: 90,
                rotationZ: 180
            }
            
            const scaleFolder = this.debugFolder.addFolder('scale')
            scaleFolder.add(this.debugObject, 'scaleX').name('Scale X').min(0.1).max(5).step(0.1).onChange(() => this.updateScale())
            scaleFolder.add(this.debugObject, 'scaleY').name('Scale Y').min(0.1).max(5).step(0.1).onChange(() => this.updateScale())
            scaleFolder.add(this.debugObject, 'scaleZ').name('Scale Z').min(0.1).max(5).step(0.1).onChange(() => this.updateScale())
            
            // Rotation debug
            const rotationFolder = this.debugFolder.addFolder('rotation')
            rotationFolder.add(this.debugObject, 'rotationX').name('Rotation X').min(-180).max(180).step(1).onChange(() => this.updateRotation())
            rotationFolder.add(this.debugObject, 'rotationY').name('Rotation Y').min(-180).max(180).step(1).onChange(() => this.updateRotation())
            rotationFolder.add(this.debugObject, 'rotationZ').name('Rotation Z').min(-180).max(180).step(1).onChange(() => this.updateRotation())
        }
        else
        {
            console.log('Debug modu aktif değil');
        }

        // Divizyon modeli ayarla
        this.setDivizyon()
    }

    setDivizyon()
    {
        this.divizyon = {}
        
        // Divizyon modelini yükle
        this.divizyon.resource = this.resources.items.divizyon
        
        if(!this.divizyon.resource || !this.divizyon.resource.scene) {
            console.error('Hata: Divizyon modeli yüklenemedi veya bulunamadı!')
            return
        }
        
        console.log('Divizyon modeli yüklendi:', this.divizyon.resource)
        
        // Mesh'i oluştur 
        try {
            // Dereceyi radyana çeviren yardımcı fonksiyon
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };
            
            // Eğim değerleri (derece cinsinden)
            const xRotation = this.debug ? this.debugObject.rotationX : -Math.PI / 2;
            const yRotation = this.debug ? this.debugObject.rotationY : -Math.PI / 2; 
            const zRotation = this.debug ? this.debugObject.rotationZ : 50;  
            
            // Pozisyon ayarla
            this.position = new THREE.Vector3(this.x, this.y, this.z)
            
            // Rotasyon ayarla
            this.rotation = new THREE.Euler(
                degToRad(xRotation),
                degToRad(yRotation),
                degToRad(zRotation)
            )
            
            // Ölçek ayarla
            const scaleX = this.debug ? this.debugObject.scaleX : 1.6;
            const scaleY = this.debug ? this.debugObject.scaleY : 1;
            const scaleZ = this.debug ? this.debugObject.scaleZ : 2;
            this.scale = new THREE.Vector3(scaleX, scaleY, scaleZ)
            
            // Mesh oluştur
            this.divizyon.mesh = this.objects.getConvertedMesh(this.divizyon.resource.scene.children)
            this.divizyon.mesh.position.copy(this.position)
            this.divizyon.mesh.rotation.copy(this.rotation)
            this.divizyon.mesh.scale.copy(this.scale)
            
            // Konteynere ekle
            this.container.add(this.divizyon.mesh)
            
            console.log('Divizyon modeli başarıyla yüklendi')
        } catch(error) {
            console.error('Divizyon modelini yüklerken hata oluştu:', error)
        }
    }

    // Debug için yardımcı metodlar
    updatePosition() {
        if (this.divizyon && this.divizyon.mesh) {
            this.position.set(this.x, this.y, this.z)
            this.divizyon.mesh.position.copy(this.position)
        }
    }
    
    updateScale() {
        if (this.divizyon && this.divizyon.mesh) {
            this.scale.set(this.debugObject.scaleX, this.debugObject.scaleY, this.debugObject.scaleZ)
            this.divizyon.mesh.scale.copy(this.scale)
        }
    }
    
    updateRotation() {
        if (this.divizyon && this.divizyon.mesh) {
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };
            
            this.rotation.set(
                degToRad(this.debugObject.rotationX),
                degToRad(this.debugObject.rotationY),
                degToRad(this.debugObject.rotationZ)
            )
            this.divizyon.mesh.rotation.copy(this.rotation)
        }
    }
}
