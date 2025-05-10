import { Howl, Howler } from 'howler'
import * as THREE from 'three'

export default class Sounds
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.debug = _options.debug

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('sounds')
            // this.debugFolder.open()
        }

        // Set up
        this.items = []

        this.setSettings()
        this.setMasterVolume()
        this.setMute()
        this.setEngine()

        // Uzamsal ses için yalnızca uzamsal seslere uygulanacak özel ayarlar
        // Global ayarlar yerine her uzamsal ses için ayrı ayar kullanacağız
        // Bu sayede normal sesler etkilenmeyecek
        this.spatialAudioSettings = {
            panningModel: 'HRTF',
            refDistance: 5,
            rolloffFactor: 1.5, // Daha düşük değer
            distanceModel: 'inverse',
            maxDistance: 40, // Daha yüksek değer
            coneOuterGain: 0.5,
            coneOuterAngle: 360,
            coneInnerAngle: 360
        }
        
        // Dinleyici pozisyonu
        Howler.pos(0, 0, 0);
        
        // Uzamsal ses objelerini oluştur
        this.createSpatialSoundObjects();
    }

    setSettings()
    {
        this.settings = [
            {
                name: 'reveal',
                sounds: ['./sounds/reveal/reveal-1.mp3'],
                minDelta: 100,
                velocityMin: 0,
                velocityMultiplier: 1,
                volumeMin: 1,
                volumeMax: 1,
                rateMin: 1,
                rateMax: 1
            },
            {
                name: 'brick',
                sounds: ['./sounds/bricks/brick-1.mp3', './sounds/bricks/brick-2.mp3', './sounds/bricks/brick-4.mp3', './sounds/bricks/brick-6.mp3', './sounds/bricks/brick-7.mp3', './sounds/bricks/brick-8.mp3'],
                minDelta: 100,
                velocityMin: 1,
                velocityMultiplier: 0.75,
                volumeMin: 0.2,
                volumeMax: 0.85,
                rateMin: 0.5,
                rateMax: 0.75
            },
            {
                name: 'bowlingPin',
                sounds: ['./sounds/bowling/pin-1.mp3'],
                minDelta: 0,
                velocityMin: 1,
                velocityMultiplier: 0.5,
                volumeMin: 0.35,
                volumeMax: 1,
                rateMin: 0.1,
                rateMax: 0.85
            },
            {
                name: 'bowlingBall',
                sounds: ['./sounds/bowling/pin-1.mp3', './sounds/bowling/pin-1.mp3', './sounds/bowling/pin-1.mp3'],
                minDelta: 0,
                velocityMin: 1,
                velocityMultiplier: 0.5,
                volumeMin: 0.35,
                volumeMax: 1,
                rateMin: 0.1,
                rateMax: 0.2
            },
            {
                name: 'carHit',
                sounds: ['./sounds/car-hits/car-hit-1.mp3', './sounds/car-hits/car-hit-3.mp3', './sounds/car-hits/car-hit-4.mp3', './sounds/car-hits/car-hit-5.mp3'],
                minDelta: 100,
                velocityMin: 2,
                velocityMultiplier: 0.8,
                volumeMin: 0.2,
                volumeMax: 0.5,
                rateMin: 0.35,
                rateMax: 0.55
            },
            {
                name: 'woodHit',
                sounds: ['./sounds/wood-hits/wood-hit-1.mp3'],
                minDelta: 30,
                velocityMin: 1,
                velocityMultiplier: 0.8,
                volumeMin: 0.4,
                volumeMax: 0.8,
                rateMin: 0.75,
                rateMax: 1.5
            },
            {
                name: 'screech',
                sounds: ['./sounds/screeches/screech-1.mp3'],
                minDelta: 1000,
                velocityMin: 0,
                velocityMultiplier: 0.9,
                volumeMin: 0.6,
                volumeMax: 0.9,
                rateMin: 0.9,
                rateMax: 1.1
            },
            {
                name: 'uiArea',
                sounds: ['./sounds/ui/area-1.mp3'],
                minDelta: 100,
                velocityMin: 0,
                velocityMultiplier: 1,
                volumeMin: 0.75,
                volumeMax: 1,
                rateMin: 0.95,
                rateMax: 1.05
            },
            {
                name: 'carHorn1',
                sounds: ['./sounds/car-horns/car-horn-1.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 1,
                volumeMin: 0.95,
                volumeMax: 1,
                rateMin: 1,
                rateMax: 1
            },
            {
                name: 'carHorn2',
                sounds: ['./sounds/car-horns/car-horn-2.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 1,
                volumeMin: 0.95,
                volumeMax: 1,
                rateMin: 1,
                rateMax: 1
            },
            {
                name: 'horn',
                sounds: ['./sounds/horns/horn-1.mp3', './sounds/horns/horn-2.mp3', './sounds/horns/horn-3.mp3'],
                minDelta: 100,
                velocityMin: 1,
                velocityMultiplier: 0.75,
                volumeMin: 0.5,
                volumeMax: 1,
                rateMin: 0.75,
                rateMax: 1
            },
            {//Uzamsal sesler icin.
                name: 'spatialSound1',
                sounds: ['./sounds/car-horns/car-horn-3.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 1,
                rateMax: 1,
                spatial: true,
                defaultPosition: [-86, -12, 0] // Mavi küre
            }
        ]

        for(const _settings of this.settings)
        {
            this.add(_settings)
        }
    }

    setMasterVolume()
    {
        // Set up
        this.masterVolume = 0.4  // Biraz daha düşük genel ses seviyesi
        Howler.volume(this.masterVolume)

        window.requestAnimationFrame(() =>
        {
            Howler.volume(this.masterVolume)
        })

        // Debug
        if(this.debug)
        {
            this.debugFolder.add(this, 'masterVolume').step(0.001).min(0).max(1).onChange(() =>
            {
                Howler.volume(this.masterVolume)
            })
        }
    }

    setMute()
    {
        // Set up
        this.muted = typeof this.debug !== 'undefined'
        Howler.mute(this.muted)

        // M Key
        window.addEventListener('keydown', (_event) =>
        {
            if(_event.key === 'm')
            {
                this.muted = !this.muted
                Howler.mute(this.muted)
            }
        })

        // Tab focus / blur
        document.addEventListener('visibilitychange', () =>
        {
            if(document.hidden)
            {
                Howler.mute(true)
            }
            else
            {
                Howler.mute(this.muted)
            }
        })

        // Debug
        if(this.debug)
        {
            this.debugFolder.add(this, 'muted').listen().onChange(() =>
            {
                Howler.mute(this.muted)
            })
        }
    }

    setEngine()
    {
        // Set up
        this.engine = {}

        this.engine.progress = 0
        this.engine.progressEasingUp = 0.3
        this.engine.progressEasingDown = 0.15

        this.engine.speed = 0
        this.engine.speedMultiplier = 2.5
        this.engine.acceleration = 0
        this.engine.accelerationMultiplier = 0.4

        this.engine.rate = {}
        this.engine.rate.min = 0.4
        this.engine.rate.max = 1.4

        this.engine.volume = {}
        this.engine.volume.min = 0.4
        this.engine.volume.max = 0.85 // Maksimum sesi biraz düşür
        this.engine.volume.master = 0

        // Motor sesi için uzamsal olmayan tek bir ses kullan
        this.engine.sound = new Howl({
            src: ['./sounds/engines/1/low_off.mp3'],
            loop: true,
            volume: 0.8, // Başlangıç volümünü biraz düşür
            html5: false, // HTML5 Audio API kullanma, gecikmeyi azalt
            preload: true  // Motor sesini mutlaka önceden yükle
        })

        this.engine.sound.play()

        // Time tick
        this.time.on('tick', () =>
        {
            let progress = Math.abs(this.engine.speed) * this.engine.speedMultiplier + Math.max(this.engine.acceleration, 0) * this.engine.accelerationMultiplier
            progress = Math.min(Math.max(progress, 0), 1)

            this.engine.progress += (progress - this.engine.progress) * this.engine[progress > this.engine.progress ? 'progressEasingUp' : 'progressEasingDown']

            // Rate - daha yumuşak geçiş
            const rateAmplitude = this.engine.rate.max - this.engine.rate.min
            const targetRate = this.engine.rate.min + rateAmplitude * this.engine.progress
            const currentRate = this.engine.sound.rate()
            // Daha yumuşak geçiş için lerp kullan
            const newRate = currentRate + (targetRate - currentRate) * 0.1
            this.engine.sound.rate(newRate)

            // Volume - daha yumuşak geçiş
            const volumeAmplitude = this.engine.volume.max - this.engine.volume.min
            const targetVolume = (this.engine.volume.min + volumeAmplitude * this.engine.progress) * this.engine.volume.master
            const currentVolume = this.engine.sound.volume()
            // Daha yumuşak geçiş için lerp kullan
            const newVolume = currentVolume + (targetVolume - currentVolume) * 0.1
            this.engine.sound.volume(newVolume)
        })
        
        // Debug
        if(this.debug)
        {
            const folder = this.debugFolder.addFolder('engine')
            folder.open()

            folder.add(this.engine, 'progressEasingUp').step(0.001).min(0).max(1).name('progressEasingUp')
            folder.add(this.engine, 'progressEasingDown').step(0.001).min(0).max(1).name('progressEasingDown')
            folder.add(this.engine.rate, 'min').step(0.001).min(0).max(4).name('rateMin')
            folder.add(this.engine.rate, 'max').step(0.001).min(0).max(4).name('rateMax')
            folder.add(this.engine, 'speedMultiplier').step(0.01).min(0).max(5).name('speedMultiplier')
            folder.add(this.engine, 'accelerationMultiplier').step(0.01).min(0).max(100).name('accelerationMultiplier')
            folder.add(this.engine, 'progress').step(0.01).min(0).max(1).name('progress').listen()
        }
    }

    add(_options)
    {
        try {
            const item = {
                name: _options.name,
                minDelta: _options.minDelta,
                velocityMin: _options.velocityMin,
                velocityMultiplier: _options.velocityMultiplier,
                volumeMin: _options.volumeMin,
                volumeMax: _options.volumeMax,
                rateMin: _options.rateMin,
                rateMax: _options.rateMax,
                lastTime: 0,
                sounds: [],
                spatial: false,
                position: [0, 0, 0]
            }

            // Normal ses oluşturma (uzamsal olmayan)
            if(!_options.spatial) {
                for(const _sound of _options.sounds)
                {
                    // Normal sesler için web audio kullan, html5 modu kullanma (gecikme yaratabilir)
                    const sound = new Howl({ 
                        src: [_sound],
                        preload: _options.name === 'reveal' || _options.name === 'engine',
                        html5: false
                    })
                    item.sounds.push(sound)
                }
            }
            // Uzamsal ses oluşturma
            else {
                item.position = _options.defaultPosition || [0, 0, 0]
                
                item.howl = new Howl({
                    src: _options.sounds,
                    volume: (_options.volumeMax || 1) * 0.7, // Uzamsal ses biraz daha kısık olsun
                    loop: true,  // Uzamsal ses sürekli çalsın
                    autoplay: false, // Otomatik çalmasın, biz kontrol edelim
                    spatial: true,  // Uzamsal ses özelliği açık
                    pannerAttr: this.spatialAudioSettings,
                    pos: item.position,
                    preload: true // Uzamsal sesler için önceden yükleme gerekli
                })
                
                item.spatial = true
                console.log(`Spatial sound ${_options.name} created at:`, item.position)
            }

            this.items.push(item)
            return item
        } catch(error) {
            console.error('Error adding sound:', error)
            return null
        }
    }
    
    // Uzamsal ses çalma metodu
    playSpatial(name) {
        try {
            const item = this.items.find(item => item.name === name)
            
            if(item && item.spatial && item.howl) {
                // Pozisyonu güncelle ve çal
                item.howl.pos(item.position[0], item.position[1], item.position[2])
                
                // Eğer ses halihazırda çalınmıyorsa çal
                if(!item.howl.playing()) {
                    // Daha düşük ses seviyesi
                    item.howl.volume(Math.min(item.howl.volume(), 0.7))
                    console.log(`Spatial sound ${name} playing at position:`, item.position)
                    
                    // Ses API'si hazır değilse bekle
                    if(typeof Howler.ctx === 'undefined' || Howler.ctx.state !== 'running') {
                        console.log('Audio context is not ready yet')
                        return null
                    }
                    
                    return item.howl.play()
                }
                return null
            }
            return null
        } catch(error) {
            console.error('Error playing spatial sound:', error)
            return null
        }
    }
    
    // Uzamsal ses pozisyonunu güncelleme
    updateSpatialPosition(name, x, y, z) {
        try {
            const item = this.items.find(item => item.name === name)
            
            if(item && item.spatial) {
                item.position = [x, y, z]
                
                if(item.howl) {
                    item.howl.pos(x, y, z)
                }
                
                // Görselleştirme objesini güncelle
                if(this.spatialSoundObjects && this.spatialSoundObjects[name]) {
                    this.spatialSoundObjects[name].position.set(x, y, z)
                }
                
                return true
            }
            return false
        } catch(error) {
            console.error('Error updating spatial position:', error)
            return false
        }
    }
    
    // Uzamsal ses objeleri oluştur (THREE.js ile görselleştirme)
    createSpatialSoundObjects() {
        try {
            this.spatialSoundObjects = {}
            this.spatialContainer = new THREE.Object3D()
            this.spatialContainer.name = 'spatialSoundContainer'
            
            // Her uzamsal ses için görsel temsil oluştur
            for(const item of this.items) {
                if(item.spatial) {
                    // Küre geometrisi oluştur
                    const geometry = new THREE.SphereGeometry(0, 16, 16)
                    
                    // Mavi renk kullan
                    const color = 0x0000ff
                    
                    // Materyal
                    const material = new THREE.MeshBasicMaterial({ 
                        color: color,
                        wireframe: true 
                    })
                    
                    // Mesh oluştur
                    const mesh = new THREE.Mesh(geometry, material)
                    
                    // Pozisyonu ayarla
                    mesh.position.set(
                        item.position[0] || 0,
                        item.position[1] || 0,
                        item.position[2] || 0
                    )
                    
                    // Işık ekle
                    const light = new THREE.PointLight(color, 1, 10)
                    light.position.copy(mesh.position)
                    
                    // Container'a ekle
                    this.spatialContainer.add(mesh)
                    this.spatialContainer.add(light)
                    
                    // Referansını kaydet
                    this.spatialSoundObjects[item.name] = mesh
                }
            }
            
            // Otomatik çalma ayarla - uzamsal sesi başlat
            setTimeout(() => {
                this.setupAutoPlay();
            }, 100); // Biraz geciktir, diğer seslerin yüklenmesine öncelik ver
            
            return this.spatialContainer
        } catch(error) {
            console.error('Error creating spatial sound objects:', error)
            return null
        }
    }
    
    // Otomatik ses çalma
    setupAutoPlay() {
        // Otomatik çalmayı yalnızca oyun hazır olduğunda başlat
        let firstPlayDone = false;
        
        // Daha az sıklıkla çalarak daha performanslı olacak
        this.soundInterval1 = setInterval(() => {
            // İlk çalma gerçekleştiyse çalmaya devam et
            if(firstPlayDone) {
                this.playSpatial('spatialSound1')
            }
        }, 5000) // 5 saniyede bir çal (daha seyrek)
        
        // İlk ses çağrısını biraz geciktirme ile yap
        setTimeout(() => {
            this.playSpatial('spatialSound1')
            firstPlayDone = true;
            console.log('İlk uzamsal ses çalmaya başladı')
        }, 2000) // Oyun yüklendikten 2 saniye sonra başla
        
        console.log('Uzamsal ses otomatik çalma ayarlandı')
    }

    play(_name, _velocity)
    {
        const item = this.items.find((_item) => _item.name === _name)
        const time = Date.now()
        const velocity = typeof _velocity === 'undefined' ? 0 : _velocity

        if(item && time > item.lastTime + item.minDelta && (item.velocityMin === 0 || velocity > item.velocityMin))
        {
            // Uzamsal ses ise
            if(item.spatial && item.howl) {
                // Zaten çalınıyor mu diye kontrol et
                if(!item.howl.playing()) {
                    item.howl.play()
                }
                item.lastTime = time
                return
            }
            
            // Normal ses
            // Find random sound
            const sound = item.sounds[Math.floor(Math.random() * item.sounds.length)]

            // Eğer ses yüklenmemişse yükle
            if(!sound.state() || sound.state() === 'unloaded') {
                sound.load();
            }

            // Ses çalınıyorsa ve yeniden çalınmaması gereken bir ses ise (engine gibi)
            if(sound.playing() && (item.name === 'engine' || item.name === 'reveal')) {
                return
            }

            // Update volume - daha nazik volüm geçişi
            let volume = Math.min(Math.max((velocity - item.velocityMin) * item.velocityMultiplier, item.volumeMin), item.volumeMax)
            // Kuadratik volum kontrolü yuksek seslerin patlamasini engeller
            volume = Math.pow(volume, 1.5) * 0.9
            sound.volume(volume)

            // Update rate - daha az değişim
            const rateAmplitude = (item.rateMax - item.rateMin) * 0.8 // %80'i kullan
            sound.rate(item.rateMin + (Math.random() * 0.8 + 0.2) * rateAmplitude)

            // Play
            sound.play()

            // Save last play time
            item.lastTime = time
        }
    }
}
