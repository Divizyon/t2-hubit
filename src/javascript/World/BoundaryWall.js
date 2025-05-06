import * as THREE from 'three'

export default class BoundaryWall {
    constructor(_options) {
        // Options
        this.config = _options.config
        this.time = _options.time
        this.resources = _options.resources
        this.objects = _options.objects
        this.areas = _options.areas
        this.walls = _options.walls
        this.tiles = _options.tiles
        this.debug = _options.debug
        this.x = _options.x || 0
        this.y = _options.y || 0

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        // Check if resources are loaded before initializing walls
        if(this.resources.items.balya2 && this.resources.items.brickCollision) {
            this.setBrickWalls()
        } else {
            this.resources.on('ready', () => {
                this.setBrickWalls()
            })
        }
    }
    // sasss

    setBrickWalls() {
        console.log('Setting up boundary walls')
        
        // Create brick options
        const brickOptions = {
            base: this.resources.items.balya2.scene,
            collision: this.resources.items.brickCollision.scene,
            offset: new THREE.Vector3(0, 0, 0.1),
            rotation: new THREE.Euler(0, 0, 0),
            duplicated: true,
            shadow: { sizeX: 1.2, sizeY: 1.8, offsetZ: - 0.15, alpha: 0.35 },
            mass: 0, // Zero mass for static walls
            soundName: 'brick'
        }

        console.log('Top wall')
        // Top wall
        this.walls.add({
            object: {
                ...brickOptions,
                rotation: new THREE.Euler(0, 0, Math.PI / 2)
            },
            shape: {
                type: 'brick',
                widthCount: 85,
                heightCount: 2,
                position: new THREE.Vector3(0, 51.25, 0),
                offsetWidth: new THREE.Vector3(1.2, 0, 0),
                offsetHeight: new THREE.Vector3(0, 0, 0.45),
                randomOffset: new THREE.Vector3(0, 0, 0),
                randomRotation: new THREE.Vector3(0, 0, 0)
            }
        })

        console.log('Bottom wall')
        // Bottom wall
        this.walls.add({
            object: {
                ...brickOptions,
                rotation: new THREE.Euler(0, 0, Math.PI / 2)
            },
            shape: {
                type: 'brick',
                widthCount: 85,
                heightCount: 2,
                position: new THREE.Vector3(-0.5, -51, 0),
                offsetWidth: new THREE.Vector3(1.2, 0, 0),
                offsetHeight: new THREE.Vector3(0, 0, 0.45),
                randomOffset: new THREE.Vector3(0, 0, 0),
                randomRotation: new THREE.Vector3(0, 0, 0)
            }
        })

        console.log('Left wall')
        // Left wall - align along y-axis
        this.walls.add({
            object: brickOptions,
            shape: {
                type: 'brick',
                widthCount: 85,
                heightCount: 2,
                position: new THREE.Vector3(-51, 0, 0),
                offsetWidth: new THREE.Vector3(0, 1.2, 0),
                offsetHeight: new THREE.Vector3(0, 0, 0.45),
                randomOffset: new THREE.Vector3(0, 0, 0),
                randomRotation: new THREE.Vector3(0, 0, 0)
            }
        })

        console.log('Right wall')
        // Right wall - align along y-axis
        this.walls.add({
            object: brickOptions,
            shape: {
                type: 'brick',
                widthCount: 85,
                heightCount: 2,
                position: new THREE.Vector3(51.25, 0, 0),
                offsetWidth: new THREE.Vector3(0, 1.2, 0),
                offsetHeight: new THREE.Vector3(0, 0, 0.45),
                randomOffset: new THREE.Vector3(0, 0, 0),
                randomRotation: new THREE.Vector3(0, 0, 0)
            }
        })
        
        // Add the walls container to the main container
        this.scene && this.scene.add(this.container)
    }
}