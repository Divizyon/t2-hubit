import { Howl, Howler } from 'howler'
// THREE kütüphanesini kaldırıyoruz - artık ihtiyaç yok
// import * as THREE from 'three'

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
        
        // Uzamsal ses ayarlarını başlat
        this.setupSpatialAudio();
    }

    setSettings()
    {
        this.settings = [
            
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
            
            {//Uzamsal sesler icin.
                name: 'spatialSound1',
                sounds: ['./sounds/ses_odasi/sesOdasi.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 1,
                rateMax: 1,
                spatial: true,
                defaultPosition: [-55, -50, 0] 
            },
            {//Uzamsal sesler icin.
                name: 'spatialSound2',
                sounds: ['./sounds/kelebek_bahcesi/kelebek_bahcesi.wav'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 1,
                rateMax: 1,
                spatial: true,
                defaultPosition: [55, -5, 0] 
            },
            {//Uzamsal sesler icin.
                name: 'spatialSound3',
                sounds: ['./sounds/tramvay/tramvay.wav'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 1,
                rateMax: 1,
                spatial: true,
                defaultPosition: [21, -65, 0] 
            },
            {//Uzamsal sesler icin.
                name: 'spatialSound4',
                sounds: ['./sounds/japon_parki/su_sesi.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 1,
                rateMax: 1,
                spatial: true,
                defaultPosition: [-5.5, -34, 0] 
            },
            {//Uzamsal sesler icin.
                name: 'spatialSound5',
                sounds: ['./sounds/konser_alani/KonserAlani.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 1,
                rateMax: 1,
                spatial: true,
                defaultPosition: [-50, -10, 0] 
            },
            {//Uzamsal sesler icin.
                name: 'spatialSound6',
                sounds: ['./sounds/newton/newton.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 1,
                rateMax: 1,
                spatial: true,
                defaultPosition: [13.6, 17.7, 0] 
            },
            {
                name: 'rocketPrepare',
                sounds: ['./sounds/rocket/roket_sesi.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 1,
                volumeMin: 0.8,
                volumeMax: 1,
                rateMin: 1,
                rateMax: 1
            },
            {
                name: 'rocketLaunch',
                sounds: ['./sounds/rocket/roket_sesi_2.mp3'],
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 1,
                volumeMin: 0.8,
                volumeMax: 1,
                rateMin: 1,
                rateMax: 1
            },
            {
                name: 'rocketLanding',
                sounds: ['./sounds/rocket/roket_sesi_2.mp3'], // İniş için de aynı sesi kullanıyoruz, farklı ayarlarla
                minDelta: 0,
                velocityMin: 0,
                velocityMultiplier: 0.8,
                volumeMin: 0.6,
                volumeMax: 0.8,
                rateMin: 0.8, // Biraz daha düşük hızda çalınacak
                rateMax: 0.9
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
                        preload: _options.name === 'engine' || _options.name === 'rocketPrepare' || _options.name === 'rocketLaunch' || _options.name === 'rocketLanding',
                        html5: false
                    })
                    item.sounds.push(sound)
                }
            }
            // Uzamsal ses oluşturma
            else {
                item.position = _options.defaultPosition || [0, 0, 0]
                
                // Her ses için özel panner ayarları
                let customPannerAttr = { ...this.spatialAudioSettings };

                if (_options.name === 'spatialSound1') {
                    customPannerAttr = {
                        panningModel: 'HRTF',
                        refDistance: 20,         // Daha büyük referans mesafe
                        rolloffFactor: 0.8,      // Daha düşük azalma faktörü  
                        distanceModel: 'inverse',
                        maxDistance: 20,         // Daha büyük maksimum mesafe
                        coneOuterGain: 0.6,
                        coneOuterAngle: 360,
                        coneInnerAngle: 360
                    };
                    _options.volumeMax = 4;
                }
                
                // spatialSound2 için özel ayarlar
                if (_options.name === 'spatialSound2') {
                    customPannerAttr = {
                        panningModel: 'HRTF',
                        refDistance: 10,         // Daha büyük referans mesafe
                        rolloffFactor: 0.8,      // Daha düşük azalma faktörü  
                        distanceModel: 'inverse',
                        maxDistance: 10,         // Daha büyük maksimum mesafe
                        coneOuterGain: 0.6,
                        coneOuterAngle: 360,
                        coneInnerAngle: 360
                    };
                    _options.volumeMax = 4;
                }
                if (_options.name === 'spatialSound3') {
                    customPannerAttr = {
                        panningModel: 'HRTF',
                        refDistance: 200,         // Daha büyük referans mesafe (100 -> 200)
                        rolloffFactor: 0.1,       // Daha düşük azalma faktörü (0.2 -> 0.1)  
                        distanceModel: 'inverse',
                        maxDistance: 300,         // Daha büyük maksimum mesafe (100 -> 300)
                        coneOuterGain: 1.0,       // Tam güç (0.9 -> 1.0)
                        coneOuterAngle: 360,
                        coneInnerAngle: 360
                    };
                    _options.volumeMax = 6;
                }
                if (_options.name === 'spatialSound4') {
                    customPannerAttr = {
                        panningModel: 'HRTF',
                        refDistance: 10,         // Daha büyük referans mesafe
                        rolloffFactor: 0.8,      // Daha düşük azalma faktörü  
                        distanceModel: 'inverse',
                        maxDistance: 10,         // Daha büyük maksimum mesafe
                        coneOuterGain: 0.6,
                        coneOuterAngle: 360,
                        coneInnerAngle: 360
                    };
                    _options.volumeMax = 6;
                }
                if (_options.name === 'spatialSound5') {
                    customPannerAttr = {
                        panningModel: 'HRTF',
                        refDistance: 5,         // Daha büyük referans mesafe
                        rolloffFactor: 0.8,      // Daha düşük azalma faktörü  
                        distanceModel: 'inverse',
                        maxDistance: 10,         // Daha büyük maksimum mesafe
                        coneOuterGain: 0.6,
                        coneOuterAngle: 360,
                        coneInnerAngle: 360
                    };
                    _options.volumeMax = 4;
                }
                if (_options.name === 'spatialSound6') {
                    customPannerAttr = {
                        panningModel: 'HRTF',
                        refDistance: 10,         // Daha büyük referans mesafe
                        rolloffFactor: 0.8,      // Daha düşük azalma faktörü  
                        distanceModel: 'inverse',
                        maxDistance: 10,         // Daha büyük maksimum mesafe
                        coneOuterGain: 0.6,
                        coneOuterAngle: 360,
                        coneInnerAngle: 360
                    };
                    _options.volumeMax = 2;
                }
                
                item.howl = new Howl({
                    src: _options.sounds,
                    volume: (_options.volumeMax || 1) * 0.6,
                    loop: true,
                    autoplay: false,
                    spatial: true,
                    pannerAttr: customPannerAttr,  // Özel panner kullan
                    pos: item.position,
                    preload: true
                })
                
                item.spatial = true
                console.log(`Spatial sound ${_options.name} created at:`, item.position, 'with custom settings:', customPannerAttr)
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
    
    // Uzamsal ses pozisyonunu güncelleme (sadece ses pozisyonu)
    updateSpatialPosition(name, x, y, z) {
        try {
            const item = this.items.find(item => item.name === name)
            
            if(item && item.spatial) {
                // Pozisyon bilgisini kaydet
                item.position = [x, y, z]
                
                // Howl nesnesinin pozisyonunu güncelle
                if(item.howl) {
                    item.howl.pos(x, y, z)
                    
                }
                
                return true
            }
            return false
        } catch(error) {
            console.error('Error updating spatial position:', error)
            return false
        }
    }
    
    // Uzamsal ses ayarlarını başlat (görselleştirme nesneleri olmadan)
    setupSpatialAudio() {
        try {
            // Sadece uzamsal sesleri yönetecek basit bir mekanizma kur
            console.log('Uzamsal ses ayarları başlatılıyor...');
            
            // Otomatik çalma ayarla - uzamsal sesi başlat
            setTimeout(() => {
                this.setupAutoPlay();
            }, 100); // Biraz geciktir, diğer seslerin yüklenmesine öncelik ver
            
            return null; // Artık THREE.js nesnesi döndürmüyoruz
        } catch(error) {
            console.error('Error setting up spatial audio:', error)
            return null;
        }
    }
    
    // Otomatik ses çalma
    setupAutoPlay() {
        // Otomatik çalmayı yalnızca oyun hazır olduğunda başlat
        let firstSound1Done = false;
        let firstSound2Done = false;
        let firstSound3Done = false;
        let firstSound4Done = false;
        let firstSound5Done = false;
        let firstSound6Done = false;
        // 1. ses için
        this.soundInterval1 = setInterval(() => {
            // İlk çalma gerçekleştiyse çalmaya devam et
            if(firstSound1Done) {
                // Uzamsal sesi çal
                const result = this.playSpatial('spatialSound1');
                if(!result) {
                    console.log("spatialSound1 çalınamadı, tekrar denenecek");
                }
            }
        }, 5000); // 5 saniyede bir çal (daha seyrek)
       
        //2. ses için
        this.soundInterval2 = setInterval(() => {
            // İlk çalma gerçekleştiyse çalmaya devam et
            if(firstSound2Done) {
                // Uzamsal sesi çal
                const result = this.playSpatial('spatialSound2');
                if(!result) {
                    console.log("spatialSound2 çalınamadı, tekrar denenecek");
                }
            }
        }, 10000); // 10 saniyede bir çal (daha seyrek)

        //3. ses için
        this.soundInterval3 = setInterval(() => {
            // İlk çalma gerçekleştiyse çalmaya devam et
            if(firstSound3Done) {
                // Uzamsal sesi çal
                const result = this.playSpatial('spatialSound3');
                if(!result) {
                    console.log("spatialSound3 çalınamadı, tekrar denenecek");
                }
            }
        }, 2000); // 8 saniyede bir çal (daha seyrek)

        //4. ses için
        this.soundInterval4 = setInterval(() => {
            // İlk çalma gerçekleştiyse çalmaya devam et
            if(firstSound4Done) {
                // Uzamsal sesi çal
                const result = this.playSpatial('spatialSound4');
                if(!result) {
                    console.log("spatialSound4 çalınamadı, tekrar denenecek");
                }
            }
        }, 3000); // 8 saniyede bir çal (daha seyrek)

        //5. ses için
        this.soundInterval5 = setInterval(() => {
            // İlk çalma gerçekleştiyse çalmaya devam et
            if(firstSound5Done) {
                // Uzamsal sesi çal
                const result = this.playSpatial('spatialSound5');
                if(!result) {
                    console.log("spatialSound5 çalınamadı, tekrar denenecek");
                }
            }
        }, 3000); // 8 saniyede bir çal (daha seyrek)

        //6. ses için
        this.soundInterval6 = setInterval(() => {
            // İlk çalma gerçekleştiyse çalmaya devam et
            if(firstSound6Done) {
                // Uzamsal sesi çal
                const result = this.playSpatial('spatialSound6');
                if(!result) {
                    console.log("spatialSound6 çalınamadı, tekrar denenecek");
                }
            }
        }, 4000); // 8 saniyede bir çal (daha seyrek)
        
        
        // İlk ses çalmaları için başlangıç ayarları
        //1. ses için
        setTimeout(() => {
            const result = this.playSpatial('spatialSound1');
            firstSound1Done = true;
            console.log('İlk uzamsal ses (spatialSound1) başlatıldı:', result ? 'başarılı' : 'başarısız');
        }, 0); // Oyun yüklendikten 2 saniye sonra başla

        //2. ses için
        setTimeout(() => {
            const result = this.playSpatial('spatialSound2');
            firstSound2Done = true;
            console.log('İkinci uzamsal ses (spatialSound2) başlatıldı:', result ? 'başarılı' : 'başarısız');
        }, 0); // Birinci sesten 1 saniye sonra başlat

        //3. ses için
        setTimeout(() => {
            const result = this.playSpatial('spatialSound3');
            firstSound3Done = true;
            console.log('Üçüncü uzamsal ses (spatialSound3) başlatıldı:', result ? 'başarılı' : 'başarısız');
        }, 0); // İkinci sesten 1 saniye sonra başlat

        //4. ses için
        setTimeout(() => {
            const result = this.playSpatial('spatialSound4');
            firstSound4Done = true;
            console.log('Üçüncü uzamsal ses (spatialSound4) başlatıldı:', result ? 'başarılı' : 'başarısız');
        }, 0); // İkinci sesten 1 saniye sonra başlat

        //5. ses için
        setTimeout(() => {
            const result = this.playSpatial('spatialSound5');
            firstSound5Done = true;
            console.log('Üçüncü uzamsal ses (spatialSound5) başlatıldı:', result ? 'başarılı' : 'başarısız');
        }, 0); // İkinci sesten 1 saniye sonra başlat
        
        //6. ses için
        setTimeout(() => {
            const result = this.playSpatial('spatialSound6');
            firstSound6Done = true;
            console.log('Üçüncü uzamsal ses (spatialSound6) başlatıldı:', result ? 'başarılı' : 'başarısız');
        }, 0); // İkinci sesten 1 saniye sonra başlat
        
        
        console.log('Uzamsal ses otomatik çalma sistemi hazır - 2 uzamsal ses aktif');
    }

    play(_name, _velocity)
    {
        // Roket hazırlanma sesine özel işlem ekle
        if(_name === 'rocketPrepare') {
            console.log('Roket hazırlanma sesi çalma denemesi');
            try {
                const item = this.items.find((_item) => _item.name === _name);
                
                if(item && item.sounds.length > 0) {
                    const sound = item.sounds[0];
                    
                    // Ses yüklenmemiş mi kontrol et
                    if(!sound.state() || sound.state() === 'unloaded') {
                        sound.load();
                        console.log('Roket hazırlanma sesi yükleniyor...');
                    }
                    
                    // Roket sesi için özel ayarlar
                    sound.volume(1);  // Tam ses
                    
                    // Hazırlanma sesi bittikten sonra fırlatma sesini çal
                    sound.on('end', () => {
                        console.log('Hazırlanma sesi bitti, fırlatma sesi başlıyor...');
                        this.play('rocketLaunch');
                    });
                    
                    sound.play();
                    
                    // Son çalma zamanını güncelle
                    item.lastTime = Date.now();
                    
                    console.log('Roket hazırlanma sesi başarıyla çalındı!');
                    return; // Önemli - burada işlemi sonlandır
                } else {
                    console.error('Roket hazırlanma ses öğesi bulunamadı!');
                }
            } catch(error) {
                console.error('Roket hazırlanma sesi çalınırken hata:', error);
            }
        }
        
        // Roket fırlatma sesine özel işlem ekle
        if(_name === 'rocketLaunch') {
            console.log('Roket fırlatma sesi çalma denemesi');
            try {
                const item = this.items.find((_item) => _item.name === _name);
                
                if(item && item.sounds.length > 0) {
                    const sound = item.sounds[0];
                    
                    // Ses yüklenmemiş mi kontrol et
                    if(!sound.state() || sound.state() === 'unloaded') {
                        sound.load();
                        console.log('Roket fırlatma sesi yükleniyor...');
                    }
                    
                    // Roket sesi için özel ayarlar
                    sound.volume(1);  // Tam ses
                    sound.play();
                    
                    // Son çalma zamanını güncelle
                    item.lastTime = Date.now();
                    
                    console.log('Roket fırlatma sesi başarıyla çalındı!');
                    return; // Önemli - burada işlemi sonlandır
                } else {
                    console.error('Roket fırlatma ses öğesi bulunamadı!');
                }
            } catch(error) {
                console.error('Roket fırlatma sesi çalınırken hata:', error);
            }
        }
        
        // Roket iniş sesi için özel işlem ekle
        if(_name === 'rocketLanding') {
            console.log('Roket iniş sesi çalma denemesi');
            try {
                const item = this.items.find((_item) => _item.name === _name);
                
                if(item && item.sounds.length > 0) {
                    const sound = item.sounds[0];
                    
                    // Ses yüklenmemiş mi kontrol et
                    if(!sound.state() || sound.state() === 'unloaded') {
                        sound.load();
                        console.log('Roket iniş sesi yükleniyor...');
                    }
                    
                    // Roket iniş sesi için özel ayarlar (volume değerini arttırıyoruz)
                    sound.volume(1.0);  // Tam ses seviyesi
                    sound.rate(0.9);    // Hafif düşük hızda çal, ama daha belirgin
                    sound.play();
                    
                    // Son çalma zamanını güncelle
                    item.lastTime = Date.now();
                    
                    console.log('Roket iniş sesi başarıyla çalındı!');
                    return; // Önemli - burada işlemi sonlandır
                } else {
                    console.error('Roket iniş ses öğesi bulunamadı!');
                }
            } catch(error) {
                console.error('Roket iniş sesi çalınırken hata:', error);
            }
        }
      
        // Normal ses çalma kodu burada devam eder...
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

            // Kornalar için özel işleme - korna çalarken önceki sesi durdur ve yeniden başlat
            if(item.name === 'carHorn1' || item.name === 'carHorn2') {
                // Çalınıyorsa durdur ve yeniden çal
                if(sound.playing()) {
                    sound.stop();
                }
                
                // Korna için tam ses
                sound.volume(item.volumeMax);
                sound.rate(1.0); // Sabit hızda çal
                sound.play();
                
                item.lastTime = time;
                return;
            }
            
            // Ses çalınıyorsa ve yeniden çalınmaması gereken bir ses ise (engine ve reveal gibi)
            if(sound.playing() && item.name === 'engine') {
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
