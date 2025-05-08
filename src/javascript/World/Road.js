import * as THREE from 'three'

export default class Road
{
    constructor(_options)
    {
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
        this.x = 35 // X pozisyonu
        this.y = -10 // Y pozisyonu
        this.z = 0.0001 // Z pozisyonu
        
        // Container oluştur
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        // Yolu ayarla
        this.setRoad()
    }

    setRoad()
    {
        this.road = {}
        
        // Road modelini yükle
        this.road.resource = this.resources.items.roadModel
        
        if(!this.road.resource || !this.road.resource.scene) {
            console.error('Hata: Road modeli yüklenemedi veya bulunamadı!')
            return
        }
        
        console.log('Road modeli yüklendi:', this.road.resource)
        
        // Yol mesh'i oluştur 
        try {
            // Dereceyi radyana çeviren yardımcı fonksiyon
            const degToRad = (degrees) => {
                return degrees * (Math.PI / 180);
            };
            
            // Eğim değerleri (derece cinsinden)
            const xRotation = -90;
            const yRotation = 180; 
            const zRotation = 180;  
            
            // Pozisyon ayarla
            const position = new THREE.Vector3(this.x, this.y, this.z)
            
            // Rotasyon ayarla
            const rotation = new THREE.Euler(
                degToRad(xRotation),
                degToRad(yRotation),
                degToRad(zRotation)
            )
            
            // Ölçek ayarla
            const scale = new THREE.Vector3(1.6, 1, 2) // Yolu istenen ölçeklere getirdim
            
            // Mesh oluştur
            this.road.mesh = this.objects.getConvertedMesh(this.road.resource.scene.children)
            this.road.mesh.position.copy(position)
            this.road.mesh.rotation.copy(rotation)
            this.road.mesh.scale.copy(scale)
            
            // Konteynere ekle
            this.container.add(this.road.mesh)
            
            console.log('Yol modeli başarıyla yüklendi')
        } catch(error) {
            console.error('Yol modelini yüklerken hata oluştu:', error)
        }
    }
}
