import * as THREE from 'three'
import { gsap } from 'gsap'

export default class TrafikLambasi
{
    constructor(_options)
    {
        // Seçenekler
        this.resources = _options.resources
        this.debug = _options.debug
        this.time = _options.time
        this.scene = _options.scene
        this.x = _options.x || 0
        this.y = _options.y || 0
        this.z = _options.z || 0

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('trafikLambasi')
        }

        // Ayarlar
        this.setModel()
    }

    setModel()
    {
        try {
            // Trafik lambası modelini al
            const trafikModel = this.resources.items.trafikLambasi
            
            // GLTF/GLB formatında model genellikle 'scene' içinde gelir
            if (trafikModel && trafikModel.scene) {
                this.model = trafikModel.scene.clone()
                
                // Modeli ölçeklendir (gerekirse)
                this.model.scale.set( 0.2, 0.2, 0.2)
                
                // Modeli Y ekseni etrafında döndür
                this.model.rotation.y = Math.PI 
                
                // Modeli X ekseni etrafında 90 derece döndür
                this.model.rotation.x = Math.PI / 2
                
                // Modeli konumlandır
                this.model.position.set(this.x, this.y, this.z)
                
                // Modeli sahneye ekle
                this.scene.add(this.model)

                console.log('Trafik lambası başarıyla yüklendi ve 90 derece döndürüldü')
                
                // Debug
                if(this.debug)
                {
                    this.debugFolder.add(this.model.position, 'x').min(-50).max(50).step(0.1).name('pozisyonX')
                    this.debugFolder.add(this.model.position, 'y').min(-50).max(50).step(0.1).name('pozisyonY')
                    this.debugFolder.add(this.model.position, 'z').min(-50).max(50).step(0.1).name('pozisyonZ')
                    this.debugFolder.add(this.model.scale, 'x').min(0.1).max(5).step(0.1).name('ölçekX')
                    this.debugFolder.add(this.model.scale, 'y').min(0.1).max(5).step(0.1).name('ölçekY')
                    this.debugFolder.add(this.model.scale, 'z').min(0.1).max(5).step(0.1).name('ölçekZ')
                    this.debugFolder.add(this.model.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.1).name('rotasyonX')
                    this.debugFolder.add(this.model.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.1).name('rotasyonY')
                    this.debugFolder.add(this.model.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.1).name('rotasyonZ')
                }
            } else {
                console.error('Trafik lambası modeli doğru formatta değil:', trafikModel)
            }
        } catch (error) {
            console.error('Trafik lambası yüklenirken hata oluştu:', error)
        }
    }

    update()
    {
        // Animasyon veya güncelleme kodları buraya eklenebilir
    }
} 