import * as THREE from 'three'
import CANNON from 'cannon'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

export default class Car
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.objects = _options.objects
        this.physics = _options.physics
        this.shadows = _options.shadows
        this.materials = _options.materials
        this.controls = _options.controls
        this.sounds = _options.sounds
        this.renderer = _options.renderer
        this.camera = _options.camera
        this.debug = _options.debug
        this.config = _options.config

        // Set up
        this.container = new THREE.Object3D()
        this.position = new THREE.Vector3()
        
        // Konum takibi için DOM elementi
        this.locationElement = null
        this.createLocationElement()

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('car')
            // this.debugFolder.open()
        }

        this.setModels()
        this.setMovement()
        this.setChassis()
        this.setBackLights()
        this.setWheels()
        this.setTransformControls()
        this.setShootingBall()
        this.setKlaxon()
        this.updateLocation() // Konum güncellemesini başlat
    }
    
    // Konum görüntüleme elementi oluşturma
    createLocationElement() {
        // Eğer element zaten varsa oluşturmaya gerek yok
        if (document.getElementById('carLocation')) {
            this.locationElement = document.getElementById('carLocation')
            return
        }
        
        // Yeni element oluştur
        this.locationElement = document.createElement('div')
        this.locationElement.id = 'carLocation'
        
        // Stil özellikleri
        this.locationElement.style.position = 'fixed'
        this.locationElement.style.top = '10px'
        this.locationElement.style.right = '10px'
        this.locationElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
        this.locationElement.style.color = 'white'
        this.locationElement.style.padding = '8px 12px'
        this.locationElement.style.borderRadius = '4px'
        this.locationElement.style.fontFamily = 'Arial, sans-serif'
        this.locationElement.style.fontSize = '14px'
        this.locationElement.style.zIndex = '1000'
        this.locationElement.style.userSelect = 'none'
        this.locationElement.style.transition = 'opacity 0.3s'
        
        // İçerik
        this.locationElement.innerHTML = 'Konum: X: 0.00, Y: 0.00'
        
        // Konum panelini gizle/göster butonu
        const toggleButton = document.createElement('button')
        toggleButton.id = 'toggleLocationButton'
        toggleButton.innerHTML = '×'
        toggleButton.style.position = 'absolute'
        toggleButton.style.top = '2px'
        toggleButton.style.right = '2px'
        toggleButton.style.width = '20px'
        toggleButton.style.height = '20px'
        toggleButton.style.border = 'none'
        toggleButton.style.borderRadius = '50%'
        toggleButton.style.background = 'rgba(255, 255, 255, 0.2)'
        toggleButton.style.color = 'white'
        toggleButton.style.fontSize = '16px'
        toggleButton.style.lineHeight = '16px'
        toggleButton.style.padding = '0'
        toggleButton.style.cursor = 'pointer'
        toggleButton.style.display = 'flex'
        toggleButton.style.justifyContent = 'center'
        toggleButton.style.alignItems = 'center'
        
        // Panel durumu
        let isPanelMinimized = false
        
        // Toggle butonuna tıklama olayı
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation() // Tıklama olayının daha üst elementlere geçmesini engelle
            
            if (isPanelMinimized) {
                // Paneli göster
                this.locationElement.style.width = 'auto'
                this.locationElement.style.height = 'auto'
                this.locationElement.style.overflow = 'visible'
                toggleButton.innerHTML = '×'
                
                // İçeriği göster
                const contentElements = this.locationElement.querySelectorAll('div')
                contentElements.forEach(el => {
                    el.style.display = 'block'
                })
            } else {
                // Paneli gizle
                this.locationElement.style.width = '26px'
                this.locationElement.style.height = '26px'
                this.locationElement.style.overflow = 'hidden'
                toggleButton.innerHTML = '+'
                
                // İçeriği gizle
                const contentElements = this.locationElement.querySelectorAll('div')
                contentElements.forEach(el => {
                    el.style.display = 'none'
                })
            }
            
            isPanelMinimized = !isPanelMinimized
        })
        
        // Toggle butonunu elementin içine ekle
        this.locationElement.appendChild(toggleButton)
        
        // Paneli açma/kapama
        this.locationElement.addEventListener('click', () => {
            if (isPanelMinimized) {
                // Küçültülmüşse, tıklandığında açılsın
                toggleButton.click()
            }
        })
        
        // Sayfaya ekle
        document.body.appendChild(this.locationElement)
    }
    
    // Konum bilgisini güncelleme
    updateLocation() {
        // Time tick event'ine abone ol
        this.time.on('tick', () => {
            if (this.locationElement && this.position) {
                // Pozisyonu sadece 2 ondalık basamakla göster
                const x = this.position.x.toFixed(2)
                const y = this.position.y.toFixed(2)
                
                // Hız bilgisini hesapla ve göster (km/s benzeri bir birim)
                const speed = this.movement ? Math.sqrt(
                    Math.pow(this.movement.localSpeed.x, 2) + 
                    Math.pow(this.movement.localSpeed.y, 2)
                ).toFixed(1) : '0.0'
                
                // Yön bilgisini hesapla (derece cinsinden, 0 derece kuzey)
                let direction = '?'
                let directionSymbol = '↑' // Varsayılan olarak kuzey
                
                if (this.chassis && this.chassis.object) {
                    // Rotasyonu dereceye çevir (z ekseni)
                    const rotationDegrees = (this.chassis.object.rotation.z * (180 / Math.PI)).toFixed(0)
                    // Pozitif değerler saat yönünün tersine döndüğünü gösterir
                    const normalizedDegrees = ((360 - rotationDegrees) % 360)
                    direction = normalizedDegrees.toFixed(0) + '°'
                    
                    // Yön sembolünü belirle (8 yön: K, KD, D, GD, G, GB, B, KB)
                    if (normalizedDegrees >= 337.5 || normalizedDegrees < 22.5) {
                        directionSymbol = '↑' // Kuzey
                    } else if (normalizedDegrees >= 22.5 && normalizedDegrees < 67.5) {
                        directionSymbol = '↗' // Kuzeydoğu
                    } else if (normalizedDegrees >= 67.5 && normalizedDegrees < 112.5) {
                        directionSymbol = '→' // Doğu
                    } else if (normalizedDegrees >= 112.5 && normalizedDegrees < 157.5) {
                        directionSymbol = '↘' // Güneydoğu
                    } else if (normalizedDegrees >= 157.5 && normalizedDegrees < 202.5) {
                        directionSymbol = '↓' // Güney
                    } else if (normalizedDegrees >= 202.5 && normalizedDegrees < 247.5) {
                        directionSymbol = '↙' // Güneybatı
                    } else if (normalizedDegrees >= 247.5 && normalizedDegrees < 292.5) {
                        directionSymbol = '←' // Batı
                    } else if (normalizedDegrees >= 292.5 && normalizedDegrees < 337.5) {
                        directionSymbol = '↖' // Kuzeybatı
                    }
                }
                
                // Elementi güncelle
                this.locationElement.innerHTML = `
                    <div><strong>Konum:</strong> X: ${x}, Y: ${y}</div>
                    <div><strong>Hız:</strong> ${speed} km/s</div>
                    <div><strong>Yön:</strong> ${direction} ${directionSymbol}</div>
                `
                
                // Konum panelini gizle/göster butonu yeniden ekle
                if (document.getElementById('toggleLocationButton')) {
                    const toggleButton = document.getElementById('toggleLocationButton')
                    if (!this.locationElement.contains(toggleButton)) {
                        this.locationElement.appendChild(toggleButton)
                    }
                }
            }
        })
    }

    setModels()
    {
        this.models = {}

        {
            this.models.chassis = this.resources.items.carToggChassis
            // Diğer togg parçaları yoksa mevcut parçaları kullanabiliriz
            this.models.antena = this.resources.items.carDefaultAntena
            this.models.backLightsBrake = this.resources.items.carDefaultBackLightsBrake
            this.models.backLightsReverse = this.resources.items.carDefaultBackLightsReverse
            this.models.wheel = this.resources.items.carDefaultWheel
        }
    
    }

    setMovement()
    {
        this.movement = {}
        this.movement.speed = new THREE.Vector3()
        this.movement.localSpeed = new THREE.Vector3()
        this.movement.acceleration = new THREE.Vector3()
        this.movement.localAcceleration = new THREE.Vector3()
        this.movement.lastScreech = 0

        // Time tick
        this.time.on('tick', () =>
        {
            // Movement
            const movementSpeed = new THREE.Vector3()
            movementSpeed.copy(this.chassis.object.position).sub(this.chassis.oldPosition)
            movementSpeed.multiplyScalar(1 / this.time.delta * 17)
            this.movement.acceleration = movementSpeed.clone().sub(this.movement.speed)
            this.movement.speed.copy(movementSpeed)

            this.movement.localSpeed = this.movement.speed.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), - this.chassis.object.rotation.z)
            this.movement.localAcceleration = this.movement.acceleration.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), - this.chassis.object.rotation.z)

            // Sound
            this.sounds.engine.speed = this.movement.localSpeed.x
            this.sounds.engine.acceleration = this.controls.actions.up ? (this.controls.actions.boost ? 1 : 0.5) : 0

            if(this.movement.localAcceleration.x > 0.03 && this.time.elapsed - this.movement.lastScreech > 5000)
            {
                this.movement.lastScreech = this.time.elapsed
                this.sounds.play('screech')
            }
        })
    }

    setChassis()
    {
        this.chassis = {}
        
        // Togg modeli için özel offset değeri (aşağı indir)
        if(this.config.togg) {
            this.chassis.offset = new THREE.Vector3(0.055, -0.09, -0.26)
            // Togg modelini sağa-sola merkezle
            this.chassis.object = this.objects.getConvertedMesh(this.models.chassis.scene.children)
            
            // Modelimizin pozisyonu yan tarafta kaymış olabilir, merkezleyelim
            const boundingBox = new THREE.Box3().setFromObject(this.chassis.object);
            const center = boundingBox.getCenter(new THREE.Vector3());
            
            // Sadece x ekseni üzerinde (sağ-sol) merkezleme yapıyoruz
            this.chassis.object.position.x -= center.x;
        } else {
            this.chassis.offset = new THREE.Vector3(0, 0, -0.28)
            this.chassis.object = this.objects.getConvertedMesh(this.models.chassis.scene.children)
        }
        
        this.chassis.object.position.copy(this.physics.car.chassis.body.position)
        this.chassis.oldPosition = this.chassis.object.position.clone()
        this.container.add(this.chassis.object)

        this.shadows.add(this.chassis.object, { sizeX: 3, sizeY: 2, offsetZ: 0.2 })

        // Time tick
        this.time.on('tick', () =>
        {
            // Save old position for movement calculation
            this.chassis.oldPosition = this.chassis.object.position.clone()

            // Update if mode physics
            if(!this.transformControls.enabled)
            {
                this.chassis.object.position.copy(this.physics.car.chassis.body.position).add(this.chassis.offset)
                this.chassis.object.quaternion.copy(this.physics.car.chassis.body.quaternion)
            }

            // Update position
            this.position.copy(this.chassis.object.position)
        })
    }


    setBackLights()
    {
        this.backLightsBrake = {}

        this.backLightsBrake.material = this.materials.pures.items.red.clone()
        this.backLightsBrake.material.transparent = true
        this.backLightsBrake.material.opacity = 0.5

        this.backLightsBrake.object = this.objects.getConvertedMesh(this.models.backLightsBrake.scene.children)
        for(const _child of this.backLightsBrake.object.children)
        {
            _child.material = this.backLightsBrake.material
        }

        this.chassis.object.add(this.backLightsBrake.object)

        // Back lights brake
        this.backLightsReverse = {}

        this.backLightsReverse.material = this.materials.pures.items.yellow.clone()
        this.backLightsReverse.material.transparent = true
        this.backLightsReverse.material.opacity = 0.5

        this.backLightsReverse.object = this.objects.getConvertedMesh(this.models.backLightsReverse.scene.children)
        for(const _child of this.backLightsReverse.object.children)
        {
            _child.material = this.backLightsReverse.material
        }

        this.chassis.object.add(this.backLightsReverse.object)

        // Time tick
        this.time.on('tick', () =>
        {
            this.backLightsBrake.material.opacity = this.physics.controls.actions.brake ? 1 : 0.5
            this.backLightsReverse.material.opacity = this.physics.controls.actions.down ? 1 : 0.5
        })
    }

    setWheels()
    {
        this.wheels = {}
        this.wheels.object = this.objects.getConvertedMesh(this.models.wheel.scene.children)
        this.wheels.items = []

        for(let i = 0; i < 4; i++)
        {
            const object = this.wheels.object.clone()

            this.wheels.items.push(object)
            this.container.add(object)
        }

        // Time tick
        this.time.on('tick', () =>
        {
            if(!this.transformControls.enabled)
            {
                for(const _wheelKey in this.physics.car.wheels.bodies)
                {
                    const wheelBody = this.physics.car.wheels.bodies[_wheelKey]
                    const wheelObject = this.wheels.items[_wheelKey]

                    wheelObject.position.copy(wheelBody.position)
                    wheelObject.quaternion.copy(wheelBody.quaternion)
                }
            }
        })
    }

    setTransformControls()
    {
        this.transformControls = new TransformControls(this.camera.instance, this.renderer.domElement)
        this.transformControls.size = 0.5
        this.transformControls.attach(this.chassis.object)
        this.transformControls.enabled = false
        this.transformControls.visible = this.transformControls.enabled

        document.addEventListener('keydown', (_event) =>
        {
            if(this.mode === 'transformControls')
            {
                if(_event.key === 'r')
                {
                    this.transformControls.setMode('rotate')
                }
                else if(_event.key === 'g')
                {
                    this.transformControls.setMode('translate')
                }
            }
        })

        this.transformControls.addEventListener('dragging-changed', (_event) =>
        {
            this.camera.orbitControls.enabled = !_event.value
        })

        this.container.add(this.transformControls)

        if(this.debug)
        {
            const folder = this.debugFolder.addFolder('controls')
            folder.open()

            folder.add(this.transformControls, 'enabled').onChange(() =>
            {
                this.transformControls.visible = this.transformControls.enabled
            })
        }
    }

    setShootingBall()
    {
        if(!this.config.cyberTruck)
        {
            return
        }

        window.addEventListener('keydown', (_event) =>
        {
            if(_event.key === 'b')
            {
                const angle = Math.random() * Math.PI * 2
                const distance = 10
                const x = this.position.x + Math.cos(angle) * distance
                const y = this.position.y + Math.sin(angle) * distance
                const z = 2 + 2 * Math.random()
                const bowlingBall = this.objects.add({
                    base: this.resources.items.bowlingBallBase.scene,
                    collision: this.resources.items.bowlingBallCollision.scene,
                    offset: new THREE.Vector3(x, y, z),
                    rotation: new THREE.Euler(Math.PI * 0.5, 0, 0),
                    duplicated: true,
                    shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: - 0.15, alpha: 0.35 },
                    mass: 5,
                    soundName: 'bowlingBall',
                    sleep: false
                })

                const carPosition = new CANNON.Vec3(this.position.x, this.position.y, this.position.z + 1)
                let direction = carPosition.vsub(bowlingBall.collision.body.position)
                direction.normalize()
                direction = direction.scale(100)
                bowlingBall.collision.body.applyImpulse(direction, bowlingBall.collision.body.position)
            }
        })
    }

    setKlaxon()
    {
        this.klaxon = {}
        this.klaxon.lastTime = this.time.elapsed

        window.addEventListener('keydown', (_event) =>
        {
            // Play horn sound
            if(_event.code === 'KeyH')
            {
                if(this.time.elapsed - this.klaxon.lastTime > 400)
                {
                    this.physics.car.jump(false, 150)
                    this.klaxon.lastTime = this.time.elapsed
                }

                this.sounds.play(Math.random() < 0.002 ? 'carHorn2' : 'carHorn1')
            }

           
        })
    }
}
