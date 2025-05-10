import * as THREE from 'three'

export default class SesOdasi
{
    constructor(_options)
    {
        // Debug kontrolü
        console.log('SesOdasi constructor çalıştı, debug durumu:', _options.debug);
        
        // Gerekli parametreler
        this.resources = _options.resources
        this.objects = _options.objects
        this.debug = _options.debug
        this.materials = _options.materials
        this.x = -86 // X pozisyonu
        this.y = -12 // Y pozisyonu
        this.z = 0  // Z pozisyonu
        
        // Container oluştur
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        // Debug
        if(this.debug)
        {
            console.log('Debug modunda SesOdasi paneli oluşturuluyor');
            this.debugFolder = this.debug.addFolder('sesOdasi')
            this.debugFolder.open()
            
            // Position debug
            const positionFolder = this.debugFolder.addFolder('position')
            positionFolder.add(this, 'x').name('X').min(-100).max(100).step(0.1).onChange(() => this.updatePosition())
            positionFolder.add(this, 'y').name('Y').min(-100).max(100).step(0.1).onChange(() => this.updatePosition())
            positionFolder.add(this, 'z').name('Z').min(-100).max(100).step(0.1).onChange(() => this.updatePosition())
            
            // Scale debug
            this.debugObject = {
                scaleX: 1.0,
                scaleY: 1.0,
                scaleZ: 1.0,
                rotationX: -90,
                rotationY: -180,
                rotationZ: 0
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

        // SesOdasi modeli ayarla
        this.setSesOdasi()
    }

    setSesOdasi()
    {
        this.sesOdasi = {}
        
        // SesOdasi modelini yükle
        this.sesOdasi.resource = this.resources.items.sesOdasi
        
        console.log('SesOdasi resource kontrolü:', this.sesOdasi.resource);
        
        if(!this.sesOdasi.resource) {
            console.error('Hata: SesOdasi modeli yüklenemedi veya bulunamadı!');
            return;
        }
        
        if(!this.sesOdasi.resource.scene) {
            console.error('Hata: SesOdasi modelinin scene özelliği bulunamadı!', this.sesOdasi.resource);
            return;
        }
        
        console.log('SesOdasi modeli yüklendi:', this.sesOdasi.resource);
        
        // Mesh'i oluştur 
        try {
            // Dereceyi radyana çeviren yardımcı fonksiyon
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };
            
            // Eğim değerleri (derece cinsinden)
            const xRotation = this.debug ? this.debugObject.rotationX : 0;
            const yRotation = this.debug ? this.debugObject.rotationY : 0; 
            const zRotation = this.debug ? this.debugObject.rotationZ : -8;  
            
            // Pozisyon ayarla
            this.position = new THREE.Vector3(this.x, this.y, this.z)
            
            // Rotasyon ayarla
            this.rotation = new THREE.Euler(
                degToRad(xRotation),
                degToRad(yRotation),
                degToRad(zRotation)
            )
            
            // Ölçek ayarla
            const scaleX = this.debug ? this.debugObject.scaleX : 1.0;
            const scaleY = this.debug ? this.debugObject.scaleY : 1.0;
            const scaleZ = this.debug ? this.debugObject.scaleZ : 1.0;
            this.scale = new THREE.Vector3(scaleX, scaleY, scaleZ)
            
            // Mesh oluştur
            this.sesOdasi.mesh = this.objects.getConvertedMesh(this.sesOdasi.resource.scene.children)
            this.sesOdasi.mesh.position.copy(this.position)
            this.sesOdasi.mesh.rotation.copy(this.rotation)
            this.sesOdasi.mesh.scale.copy(this.scale)
            
            // Konteynere ekle
            this.container.add(this.sesOdasi.mesh)
            
            console.log('SesOdasi modeli başarıyla yüklendi')
        } catch(error) {
            console.error('SesOdasi modelini yüklerken hata oluştu:', error)
        }
    }

    // Debug için yardımcı metodlar
    updatePosition() {
        if (this.sesOdasi && this.sesOdasi.mesh) {
            this.position.set(this.x, this.y, this.z)
            this.sesOdasi.mesh.position.copy(this.position)
        }
    }
    
    updateScale() {
        if (this.sesOdasi && this.sesOdasi.mesh) {
            this.scale.set(this.debugObject.scaleX, this.debugObject.scaleY, this.debugObject.scaleZ)
            this.sesOdasi.mesh.scale.copy(this.scale)
        }
    }
    
    updateRotation() {
        if (this.sesOdasi && this.sesOdasi.mesh) {
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };
            
            this.rotation.set(
                degToRad(this.debugObject.rotationX),
                degToRad(this.debugObject.rotationY),
                degToRad(this.debugObject.rotationZ)
            )
            this.sesOdasi.mesh.rotation.copy(this.rotation)
        }
    }
} 