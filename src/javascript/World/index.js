import * as THREE from 'three'
import Materials from './Materials.js'
import Floor from './Floor.js'
import Shadows from './Shadows.js'
import Physics from './Physics.js'
import Zones from './Zones.js'
import Objects from './Objects.js'
import Car from './Car.js'
import Areas from './Areas.js'
import Tiles from './Tiles.js'
import Walls from './Walls.js'
import Road from './Road.js'
import { Rocket } from './Rocket.js'
import IntroSection from './Sections/IntroSection.js'
import ProjectsSection from './Sections/ProjectsSection.js'
import CrossroadsSection from './Sections/CrossroadsSection.js'
// import InformationSection from './Sections/InformationSection.js'
import PlaygroundSection from './Sections/PlaygroundSection.js'
// import DistinctionASection from './Sections/DistinctionASection.js'
// import DistinctionBSection from './Sections/DistinctionBSection.js'
// import DistinctionCSection from './Sections/DistinctionCSection.js'
// import DistinctionDSection from './Sections/DistinctionDSection.js'
import Controls from './Controls.js'
import Sounds from './Sounds.js'
import gsap from 'gsap'
import EasterEggs from './EasterEggs.js'
import BoundaryWall from './BoundaryWall.js'   
import GreenBox from './GreenBox.js'
import GenclikMerkezi from './CalisanGenclikMerkezi.js'
import konyagenckart from './konyagenckart.js'
import Divizyon from './Divizyon.js'
import SesOdasi from './SesOdasi.js'
import SosyalInovasyonAjans from './SosyalInovasyonAjans.js'

import AlaaddinTepesi from './AlaaddinTepesi.js'
import Kelebekler from './Kelebekler.js'

import BilimMerkezi from './BilimMerkezi.js'
import KapsulBinasi from './KapsulBinasi.js'

export default class World
{
    constructor(_options)
    {
        // Options
        this.config = _options.config
        this.debug = _options.debug
        this.resources = _options.resources
        this.time = _options.time
        this.sizes = _options.sizes
        this.camera = _options.camera
        this.scene = _options.scene
        this.renderer = _options.renderer
        this.passes = _options.passes

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('world')
            this.debugFolder.open()
        }

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.setSounds()
        this.setControls()
        this.setFloor()
    
        this.setAreas()
        this.setStartingScreen()
    }

    start()
    {
        window.setTimeout(() =>
        {
            this.camera.pan.enable()
        }, 2000)

        
        this.setReveal()
        this.setMaterials()
        this.setShadows()
        this.setPhysics()
        this.setZones()
        this.setObjects()
        this.setCar()
        this.areas.car = this.car
        this.setTiles()
        this.setWalls()
        this.setSections()
        this.setEasterEggs()
        this.setRoad()
        this.setGreenBox()
        this.setGenclikMerkezi()
        this.setkonyagenckart()
        this.setSosyalInovasyonAjans() 
        this.setDivizyon() 

        this.setAlaaddinTepesi()
        this.setKelebekler()
        this.setBilimMerkezi()
        this.setKapsulBinasi()
        this.setSesOdasi()
        this.setRocket()
        this.setSesOdasi()

    }

    setReveal()
    {
        this.reveal = {}
        this.reveal.matcapsProgress = 0
        this.reveal.floorShadowsProgress = 0
        this.reveal.previousMatcapsProgress = null
        this.reveal.previousFloorShadowsProgress = null

        // Go method
        this.reveal.go = () =>
        {
           

            gsap.fromTo(this.reveal, { matcapsProgress: 0 }, { matcapsProgress: 1, duration: 3 })
            gsap.fromTo(this.reveal, { floorShadowsProgress: 0 }, { floorShadowsProgress: 1, duration: 3, delay: 0.5 })
            gsap.fromTo(this.shadows, { alpha: 0 }, { alpha: 0.5, duration: 3, delay: 0.5 })

            if(this.sections.intro)
            {
                gsap.fromTo(this.sections.intro.instructions.arrows.label.material, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.5 })
                if(this.sections.intro.otherInstructions)
                {
                    gsap.fromTo(this.sections.intro.otherInstructions.label.material, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.75 })
                }
            }

            // Car
            this.physics.car.chassis.body.sleep()
            this.physics.car.chassis.body.position.set(0, 0, 12)

            window.setTimeout(() =>
            {
                this.physics.car.chassis.body.wakeUp()
            }, 300)

            // Sound
            gsap.fromTo(this.sounds.engine.volume, { master: 0 }, { master: 0.7, duration: 0.5, delay: 0.3, ease: 'power2.in' })
            window.setTimeout(() =>
            {
                this.sounds.play('reveal')
            }, 400)

            // Controls
            if(this.controls.touch)
            {
                window.setTimeout(() =>
                {
                    this.controls.touch.reveal()
                }, 400)
            }
        }

        // Time tick
        this.time.on('tick',() =>
        {
            // Matcap progress changed
            if(this.reveal.matcapsProgress !== this.reveal.previousMatcapsProgress)
            {
                // Update each material
                for(const _materialKey in this.materials.shades.items)
                {
                    const material = this.materials.shades.items[_materialKey]
                    material.uniforms.uRevealProgress.value = this.reveal.matcapsProgress
                }

                // Save
                this.reveal.previousMatcapsProgress = this.reveal.matcapsProgress
            }

            // Matcap progress changed
            if(this.reveal.floorShadowsProgress !== this.reveal.previousFloorShadowsProgress)
            {
                // Update each floor shadow
                for(const _mesh of this.objects.floorShadows)
                {
                    _mesh.material.uniforms.uAlpha.value = this.reveal.floorShadowsProgress
                }

                // Save
                this.reveal.previousFloorShadowsProgress = this.reveal.floorShadowsProgress
            }
        })

        // Debug
        if(this.debug)
        {
            this.debugFolder.add(this.reveal, 'matcapsProgress').step(0.0001).min(0).max(1).name('matcapsProgress')
            this.debugFolder.add(this.reveal, 'floorShadowsProgress').step(0.0001).min(0).max(1).name('floorShadowsProgress')
            this.debugFolder.add(this.reveal, 'go').name('reveal')
        }
    }

    setStartingScreen()
    {
        this.startingScreen = {}

        // Debug
        console.log('Başlangıç ekranı ayarlanıyor...')

        // Area
        this.startingScreen.area = this.areas.add({
            position: new THREE.Vector2(0, 0),
            halfExtents: new THREE.Vector2(2.35, 1.5),
            hasKey: false,
            testCar: false,
            active: false
        })

        // Loading label
        this.startingScreen.loadingLabel = {}
        this.startingScreen.loadingLabel.geometry = new THREE.PlaneGeometry(2.5, 2.5 / 4)
        this.startingScreen.loadingLabel.image = new Image()
        this.startingScreen.loadingLabel.image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAABABAMAAAAHc7SNAAAAMFBMVEUAAAD///9ra2ucnJzR0dH09PQmJiaNjY24uLjp6end3d1CQkLFxcVYWFiqqqp9fX3nQ5qrAAAEVUlEQVRo3u3YT08TQRQA8JEtW6CATGnDdvljaTwYE2IBI/HGRrwSetGTsZh4MPFQYiQe229gE++WePFY9Oqh1cRzieEDYIgXLxjPJu5M33vbZQszW+fgoS+B7ewO836znRl2lg1jGMP4P2Okw0yFvaKsklr3I99Tvl3iPPelGbQhKqxB4eN6N/7gVcsvbEAz1F4RLn67zzl/v6/oLvejGBQ9LsNphio4UFjmEAsVJuOK/zkDtc6w+gyTcZ3LyP6IAzjBDA+pj6LkEgAjW4kANsMAC6vmOvqAMU5RgVOTskQACicCmCcA9AXjkT5gj1MswqlxWcoTgKJ6HuAQAD5guNoAu8QpMnBul1ONMGD2PCBbRgDAKYq6AEtmXvtdj3S6GhRyW1t1DvkAgM0ggG7mu1t3xWFHFzAqv3wYCi0mY1UCGgiQPU+1oWIY8LoXcAA3qeYfr+kClvHW14PJ5OfCAgHYNAoDAORBQIrDvHjqH5c0ANTbORzBacbAQgUC2IAKAzI9gCSHlWEMLmgBPJxMvyARpIICALDm4nkAbwIA71EZx5UOgO48JnLoOhQIAN9sOgKoBoAE5r0aB8ARcNhtFzrg0VQmwCp8CAMeAADGc44S5GMBsF1aCEU2LcAcAPDCvwFytBDehCaUgJxRAKeF8BNUUQJ43iiAUlqwFKoBrTCAHjiagwEgU0YM5IYWYD4KoIgPwIXQwUbVgCXzgLpIBJNeDciWTQNskVsq1ADX/6kYBdCTjse5owbMiX+IpgGWOCPSuWpA2vN/TAMm5QTYg5IC4FdbMA0YF5Nb5s2rAaLyhzBgektGZWDArrgqi0U1QHxf38OABDwUDgTAjGfyPlTVgJT/67FBACbqyGYaaoBctQwD2vI4DecVAPkgZRhQlxPQks2rAePGAbZsRlaa1QBYEQBUHRCAmaXD0QDYxgFWdye05R9cDQCrmQYkeBA6gGXTgNEeQF4DMG4S4MLjOUZRA5A0CcjADgmjqgGwSwSg9wK1GIBS74KTgTxv/EHoiaVQsTOS5RoCJuiZyosB8EIrHpyowFiYofO0i4wCjhCQwL0hq2sCaFNM22S4JXloLk0AuLDTBzCBAAt3xykeA7CHe/mDbgdTvQ9GswSAwdbqA0giYASHjQUJnhQKhQ6z/d8rDA4hAG2Dsk042ejubHMM2nV6AMf93pCkaRjhh0WsWuz+6aasl2FwiAImReEts1/CSaFfwFouAJxC4RW+I4oCThBQE1X2WbKkBFDkqYDtJ0SHaYKq3pJJwCECjjiFPoC1w+2P0gumurgeBjT6AhIIGKOelGIAngWlFnRnMZjMIYBb7gtIIsAuYU+8GICpEhYyZVgIZ2g9rYYAX1lfAKvjnxzjnWrHALDn9K1h2k2aoI1ewGd2AWAVAVMHcKdW4wDYje739pNufJXhkJohgLu9zy4CHCKAJYUge4ddCojGyPrp9kaHmYjUi9N7+2wYwxjGZfEXMKxGE0GkkfIAAAAASUVORK5CYII='

        this.startingScreen.loadingLabel.texture = new THREE.Texture(this.startingScreen.loadingLabel.image)
        this.startingScreen.loadingLabel.texture.magFilter = THREE.NearestFilter
        this.startingScreen.loadingLabel.texture.minFilter = THREE.LinearFilter
        this.startingScreen.loadingLabel.texture.needsUpdate = true
        this.startingScreen.loadingLabel.material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.startingScreen.loadingLabel.texture })
        this.startingScreen.loadingLabel.mesh = new THREE.Mesh(this.startingScreen.loadingLabel.geometry, this.startingScreen.loadingLabel.material)
        this.startingScreen.loadingLabel.mesh.matrixAutoUpdate = false
        this.container.add(this.startingScreen.loadingLabel.mesh)

        // Start label
        this.startingScreen.startLabel = {}
        this.startingScreen.startLabel.geometry = new THREE.PlaneGeometry(2.5, 2.5 / 4)
        this.startingScreen.startLabel.image = new Image()
        this.startingScreen.startLabel.image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAABABAMAAAAHc7SNAAAAMFBMVEUAAAD///+cnJxra2vR0dHd3d0mJib09PRYWFjp6em4uLhCQkKqqqqNjY19fX3FxcV3XeRgAAADsklEQVRo3u3YsU9TQRwH8KNgLSDQg9ZCAak1IdE4PKPu1NTEsSzOMDl3I3GpcXAxBhLjXFxNjJgQJ2ON0Rnj4uAAEyv8B/L7tV++5/VN+CM69Ldwfa+534d7d793VzeIQQzi/49c4v5lPF/1vvhFm++rjIpcyErrmrSCuz+cxng1iL/If8drPJD2Lc/Iy4VhaZWlFd4tLPfuMc6e/5LvRilJA2SkVSQA8c0OsI0uNtIAU9rsB8y1rAAZjyimAUa1mQDAeGwF+MA+9lIA69qs9AMKVoDP8vhf35A+NiMAc7YJKFSrX7tcI8BW9+k/O/kz6zSunjSnncMHiQYBcmdXrh3xCVbc2WO8N/YZZI0AxxwMArKivmwAwFKSPmV0UwBbCpj5E+C+yzUbQAaJVwUSA9SFjwFgHQ0jAMrBWgzAPCtHgFFbQAlpEwKC2zWUQgJGbAH+naSdu/fTxQAthPL5/ADD6OCpQwCAsb6LsbEGcBluOAYBmG2fkMIawHVWXEsDIGUGpZCAIRsAS93DPgDbhUmUQgKe2NUB90hfhK0YwEJYHkYpJGDbqBKiB86CGLAlzd6/S8CEvh8sACiBvrSXCshKblWEgNy2vkAMAHwGfjECcJHOu5qUQgDm6vXulshZAXJNL9GJAeg+LxeKPQBj1gzgdlnuCWAhbOi7LwaU9u0A2VWPpUgAC+GR5k0iwBtnB3Bj3qMaRYB17X0IOQhYcjYA7guxxyIAGfd1HNqchPfly7aACQUshAA2W1r5G1yG415YpgB3qIIkAHBH2D075QnQ10fHDsCl+CoGSKpiN8kMAVqIN00BsitnVgKyPIBMB4ADKU92AA5BKQIgszjKBGBLagpwB5xZBGS6pbcuizQAXMA6NAK86OCQ3okAI55BQPe7VoDxXzU/iwPASgS4GAASAiYxWgYAzvAa1loA2AkAFQIU2zEELCJtDDgIAG0CFLvp7LblC2kAtF6eTEJJ2CBAr88bAXKY4WkASbzXmwt5AvTvohHA4WSUBmj2Jt+IThQChrAOLQC13vPFMAOAQwuyTAeAKVQto3OBDOdESh2YxNZPbpYBQNbEAoBfod7e1i1BiwB0voSZWgwAOWgtAGPhD18E8ASIiRIAXNPwXJBtcqMbAFAIr5weIJMAcIx1aAAIqk0lAuycompyFwBMHAsAZlj/lgw0rsy2AkhbsgK4Q+70CUBjxeFXsUb0G1HJDJC9rketZRcCWCJwHM8DgJm7b7ch+XizXm25QQxiEOcXvwGCWOhbCZC0qAAAAABJRU5ErkJggg=='
        this.startingScreen.startLabel.texture = new THREE.Texture(this.startingScreen.startLabel.image)
        this.startingScreen.startLabel.texture.magFilter = THREE.NearestFilter
        this.startingScreen.startLabel.texture.minFilter = THREE.LinearFilter
        this.startingScreen.startLabel.texture.needsUpdate = true
        this.startingScreen.startLabel.material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.startingScreen.startLabel.texture })
        this.startingScreen.startLabel.material.opacity = 0
        this.startingScreen.startLabel.mesh = new THREE.Mesh(this.startingScreen.startLabel.geometry, this.startingScreen.startLabel.material)
        this.startingScreen.startLabel.mesh.matrixAutoUpdate = false
        this.container.add(this.startingScreen.startLabel.mesh)

        // Progress
        this.resources.on('progress', (_progress) =>
        {
            console.log(`Yükleme ilerlemesi: %${Math.round(_progress * 100)}`)
            // Update area
            this.startingScreen.area.floorBorder.material.uniforms.uAlpha.value = 1
            this.startingScreen.area.floorBorder.material.uniforms.uLoadProgress.value = _progress
        })

        // Ready
        this.resources.on('ready', () =>
        {
            console.log('Tüm kaynaklar yüklendi, başlangıç ekranı hazırlanıyor...')
            window.requestAnimationFrame(() =>
            {
                this.startingScreen.area.activate()

                gsap.to(this.startingScreen.area.floorBorder.material.uniforms.uAlpha, { value: 0.3, duration: 0.3 })
                gsap.to(this.startingScreen.loadingLabel.material, { opacity: 0, duration: 0.3 })
                gsap.to(this.startingScreen.startLabel.material, { opacity: 1, duration: 0.3, delay: 0.3 })

                console.log('Başlangıç ekranı hazır, BAŞLA butonuna tıklayınız')
            })
        })

        // On interact, reveal
        this.startingScreen.area.on('interact', () =>
        {
            console.log('Başlangıç ekranına tıklandı, oyun başlatılıyor...')
            this.startingScreen.area.deactivate()
            gsap.to(this.startingScreen.area.floorBorder.material.uniforms.uProgress, { value: 0, duration: 0.3, delay: 0.4 })
            gsap.to(this.startingScreen.startLabel.material, { opacity: 0, duration: 0.3, delay: 0.4 })

           
            this.start()

            window.setTimeout(() =>
            {
                this.reveal.go()
            }, 600)
        })
    }

    setSounds()
    {
        this.sounds = new Sounds({
            debug: this.debugFolder,
            time: this.time
        })
        
        // Uzamsal sesleri ekleme kısmı.
        if(this.sounds.spatialContainer) {
            this.container.add(this.sounds.spatialContainer)
            console.log('Uzamsal sesler sahneye eklendi.')
        }
        
        // Uzamsal ses için aracın konum takibi.
        // Daha az sıklıkla güncelleme yaparak performans iyileştirmesi
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 100; // milisaniye cinsinden güncelleme aralığı (100ms = 0.1 saniye)
        
        this.time.on('tick', () => {
            const now = Date.now();
            
            // Sadece belirli aralıklarla güncelle
            if (now - lastUpdateTime > UPDATE_INTERVAL) {
                lastUpdateTime = now;
                
                if(this.car && this.car.position) {
                    // Dinleyici pozisyonunu araç pozisyonuna ayarla
                    Howler.pos(
                        this.car.position.x,
                        this.car.position.y,
                        this.car.position.z
                    )
                    
                    // Uzamsal ses kaynağını güncelle - burası önemli
                    if(this.sounds && this.sounds.updateSpatialPosition) {
                        // Ses kaynağı aracın karşısına yerleştir
                        this.sounds.updateSpatialPosition('spatialSound1', -86.6, -12, 1.3)
                    }
                }
            }
        })
    }

    setAxes()
    {
        this.axis = new THREE.AxesHelper()
        this.container.add(this.axis)
    }
    setGenclikMerkezi()
    {
        this.genclikMerkezi = new GenclikMerkezi({
            resources: this.resources,
            objects: this.objects,
            debug: this.debugFolder,
            physics: this.physics
        })
        this.container.add(this.genclikMerkezi.container)
    }
   
    

    setkonyagenckart()
    {
        this.konyagenckart = new konyagenckart({
            resources: this.resources,
            objects: this.objects,
            debug: this.debugFolder
        })
        this.container.add(this.konyagenckart.container)
    }
    setBilimMerkezi()
    {
        this.BilimMerkezi = new BilimMerkezi({
            resources: this.resources,
            objects: this.objects,
            debug: this.debugFolder
        })
        this.container.add(this.BilimMerkezi.container)
    }
    
    setKapsulBinasi()
    {
        this.KapsulBinasi = new KapsulBinasi({
            resources: this.resources,
            objects: this.objects,
            debug: this.debugFolder
        })
        this.container.add(this.KapsulBinasi.container)
    }
   
    setControls()
    {
        this.controls = new Controls({
            config: this.config,
            sizes: this.sizes,
            time: this.time,
            camera: this.camera,
            sounds: this.sounds
        })
    }

    setMaterials()
    {
        this.materials = new Materials({
            resources: this.resources,
            debug: this.debugFolder
        })
    }

    setFloor()
    {
        this.floor = new Floor({
            debug: this.debugFolder
        })

        this.container.add(this.floor.container)
    }

    setShadows()
    {
        this.shadows = new Shadows({
            time: this.time,
            debug: this.debugFolder,
            renderer: this.renderer,
            camera: this.camera
        })
        this.container.add(this.shadows.container)
    }

    setPhysics()
    {
        this.physics = new Physics({
            config: this.config,
            debug: this.debug,
            scene: this.scene,
            time: this.time,
            sizes: this.sizes,
            controls: this.controls,
            sounds: this.sounds
        })

        this.container.add(this.physics.models.container)
    }

    setZones()
    {
        this.zones = new Zones({
            time: this.time,
            physics: this.physics,
            debug: this.debugFolder
        })
        this.container.add(this.zones.container)
    }

    setAreas()
    {
        this.areas = new Areas({
            config: this.config,
            resources: this.resources,
            debug: this.debug,
            renderer: this.renderer,
            camera: this.camera,
            car: this.car,
            sounds: this.sounds,
            time: this.time
        })

        this.container.add(this.areas.container)
    }
    setTiles()
    {
        this.tiles = new Tiles({
            resources: this.resources,
            objects: this.objects,
            debug: this.debug
        })
    }

    setWalls()
    {
        this.walls = new Walls({
            resources: this.resources,
            objects: this.objects
        })
        this.boundaryWall = new BoundaryWall({
            config: this.config,
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            areas: this.areas,
            walls: this.walls,
            tiles: this.tiles,
            debug: this.debug,
            x: 0,
            y: 0,
            scene: this.scene
        })
    }

    setObjects()
    {
        this.objects = new Objects({
            time: this.time,
            resources: this.resources,
            materials: this.materials,
            physics: this.physics,
            shadows: this.shadows,
            sounds: this.sounds,
            debug: this.debugFolder
        })
        this.container.add(this.objects.container)
    }

    setCar()
    {
        this.car = new Car({
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            physics: this.physics,
            shadows: this.shadows,
            materials: this.materials,
            controls: this.controls,
            sounds: this.sounds,
            renderer: this.renderer,
            camera: this.camera,
            debug: this.debugFolder,
            config: this.config
        })
        this.container.add(this.car.container)
       
    }

    setSections()
    {
        this.sections = {}

        // Generic options
        const options = {
            config: this.config,
            time: this.time,
            resources: this.resources,
            camera: this.camera,
            passes: this.passes,
            objects: this.objects,
            areas: this.areas,
            zones: this.zones,
            walls: this.walls,
            tiles: this.tiles,
            debug: this.debugFolder
        }
    }

    setEasterEggs()
    {
        this.easterEggs = new EasterEggs({
            resources: this.resources,
            car: this.car,
            walls: this.walls,
            objects: this.objects,
            materials: this.materials,
            areas: this.areas,
            config: this.config,
            physics: this.physics
        })
        this.container.add(this.easterEggs.container)
    }

    setGreenBox()
    {
        this.greenBox = new GreenBox({
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            physics: this.physics,
            sounds: this.sounds,
            debug: this.debugFolder
        })
        this.container.add(this.greenBox.container)
    }

    setRoad()
    {
        this.road = new Road({
            resources: this.resources,
            objects: this.objects,
            debug: this.debug,
            physics: this.physics,
            materials: this.materials,
            shadows: this.shadows
        })
        this.container.add(this.road.container)
    }

    //set divizyon
    setDivizyon()
    {
        console.log('setDivizyon() fonksiyonu çağrıldı, debug durumu:', this.debug);
        this.divizyon = new Divizyon({
            debug: this.debug,
            resources: this.resources,
            objects: this.objects,
            physics: this.physics,
            materials: this.materials,
            shadows: this.shadows
        })
        
        if (this.divizyon && this.divizyon.container) {
            console.log('Divizyon container ekleniyor');
            this.container.add(this.divizyon.container);
        } else {
            console.error('Divizyon container oluşturulamadı');
        }
    }
    

    setAlaaddinTepesi()
    {
        this.alaaddinTepesi = new AlaaddinTepesi({
            resources: this.resources,
            objects: this.objects,
            debug: this.debugFolder
        })
        this.container.add(this.alaaddinTepesi.container)
    }
     

    setKelebekler()
    {
        this.kelebekler = new Kelebekler({
            resources: this.resources,
            objects: this.objects,
            debug: this.debugFolder,
            time: this.time,
            physics: this.physics
        })
        this.container.add(this.kelebekler.container)
    }

    setSosyalInovasyonAjans()
    {
        try {
            this.sosyalInovasyonAjans = new SosyalInovasyonAjans({
                debug: this.debug,
                resources: this.resources,
                objects: this.objects,
                physics: this.physics,
                materials: this.materials,
                shadows: this.shadows
            })
            
            if (this.sosyalInovasyonAjans && this.sosyalInovasyonAjans.container) {
                console.log('Sosyal İnovasyon Ajansı container ekleniyor');
                this.container.add(this.sosyalInovasyonAjans.container);
            } else {
                console.error('Sosyal İnovasyon Ajansı container oluşturulamadı');
            }
        } catch (error) {
            console.error('Sosyal İnovasyon Ajansı yüklenirken hata oluştu:', error);
        }
    }


    setRocket() 
    {
        // Bu metot, Eyfel Kulesi benzeri roketi oluşturur
        this.rocket = new Rocket({
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            physics: this.physics,
            debug: this.debug,
            sounds: this.sounds,
            position: new THREE.Vector3(25, 35, -10) // X, Y, Z koordinatlarını 16, 28, 0 olarak değiştirdik
        })
        
        // Roketi sahneye ekle - container'ı scene'e ekleyin
        this.container.add(this.rocket.container)
        
        // Roket fırlatma alanı oluştur
        this.rocketLaunchArea = this.areas.add({
            position: new THREE.Vector2(25, 35), // X, Y koordinatlarını 16, 28 olarak değiştirdik
            halfExtents: new THREE.Vector2(3, 3),
            debug: true,
            hasKey: false
        })
        
        // Fırlatma alanına etkileşim ekle
        this.rocketLaunchArea.on('interact', () => {
            if (!this.rocket.isLaunched) {
                console.log('Roket fırlatılıyor!')
                this.rocket.launch()
            } else {
                console.log('Roket zaten fırlatıldı!')
            }
        })
        
        // Bilgi paneli ekle
        const rocketInfo = document.createElement('div')
        rocketInfo.style.position = 'absolute'
        rocketInfo.style.bottom = '20px'
        rocketInfo.style.right = '20px'
        rocketInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
        rocketInfo.style.color = 'white'
        rocketInfo.style.padding = '10px'
        rocketInfo.style.borderRadius = '5px'
        rocketInfo.style.fontFamily = 'Arial, sans-serif'
        rocketInfo.style.zIndex = '1000'
        rocketInfo.textContent = 'Roket fırlatmak için K tuşuna basın veya roketin yanına gidip tıklayın!'
        document.body.appendChild(rocketInfo)
        
        // 5 saniye sonra bilgi panelini gizle
        setTimeout(() => {
            rocketInfo.style.opacity = '0'
            rocketInfo.style.transition = 'opacity 1s ease-in-out'
            setTimeout(() => {
                document.body.removeChild(rocketInfo)
            }, 1000)
        }, 10000)
    }
    
    //set sesOdasi
    setSesOdasi()
    {
        console.log('setSesOdasi() fonksiyonu çağrıldı, debug durumu:', this.debug);
        this.sesOdasi = new SesOdasi({
            resources: this.resources,
            objects: this.objects,
            debug: this.debug,
            physics: this.physics,
            materials: this.materials,
            shadows: this.shadows
        })
        
        if (this.sesOdasi && this.sesOdasi.container) {
            console.log('SesOdasi container ekleniyor');
            this.container.add(this.sesOdasi.container);
        } else {
            console.error('SesOdasi container oluşturulamadı');
        }
    }

}
