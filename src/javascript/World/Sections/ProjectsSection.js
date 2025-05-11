import * as THREE from 'three'
import Project from './Project'
import gsap from 'gsap'

export default class ProjectsSection
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.camera = _options.camera
        this.passes = _options.passes
        this.objects = _options.objects
        this.areas = _options.areas
        this.zones = _options.zones
        this.tiles = _options.tiles
        this.debug = _options.debug
        this.x = _options.x
        this.y = _options.y

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('projects')
            this.debugFolder.open()
        }

        // Set up
        this.items = []

        this.interDistance = 5
        this.positionRandomess = 0
        this.projectHalfWidth = 9

        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        this.setGeometries()
        this.setMeshes()
        this.setList()
        this.setZone()

        // Add all project from the list
        for(const _options of this.list)
        {
            this.add(_options)
        }
    }

    setGeometries()
    {
        this.geometries = {}
        this.geometries.floor = new THREE.PlaneGeometry(16, 8)
    }

    setMeshes()
    {
        this.meshes = {}

        // this.meshes.boardStructure = this.objects.getConvertedMesh(this.resources.items.projectsBoardStructure.scene.children, { floorShadowTexture: this.resources.items.projectsBoardStructureFloorShadowTexture })
        this.resources.items.areaOpenTexture.magFilter = THREE.NearestFilter
        this.resources.items.areaOpenTexture.minFilter = THREE.LinearFilter
        this.meshes.boardPlane = this.resources.items.projectsBoardPlane.scene.children[0]
        this.meshes.areaLabel = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.resources.items.areaOpenTexture }))
        this.meshes.areaLabel.matrixAutoUpdate = false
    }

    setList()
    {
        this.list = [
            {
                name: 'Genç Kültür Kartı',
                imageSources:
                [
                    './models/projects/panoresim/genç kultur kart.jpg',
                ],
                floorTexture: this.resources.items.projectsPanoresimFloorTexture,
                link:
                {
                    href: 'https://www.genckultur.com/',
                    x: - 4.8,
                    y: 2,
                    halfExtents:
                    {
                        x: 2.0,
                        y: 1.5
                    }
                },
                distinctions: []
            },
            {
                name: 'Gençlik Meclisi',
                imageSources:
                [
                    './models/projects/panoresim/genclik meclisi.jpg',
                ],
                floorTexture: this.resources.items.projectsPanoresimFloorTexture,
                link:
                {
                    href: 'https://kbbgenclikmeclisi.com/hosgeldin',
                    x: - 4.8,
                    y: 2,
                    halfExtents:
                    {
                        x: 2.0,
                        y: 1.5
                    }
                },
                distinctions: []
            },
            {
                name: 'Karatay Medresesi',
                imageSources:
                [
                    './models/projects/panoresim/karatay medresesi.jpg',
                ],
                floorTexture: this.resources.items.projectsPanoresimFloorTexture,
                link:
                {
                    href: 'https://gokonya.com/tr/karatay-medresesi',
                    x: - 4.8,
                    y: 2,
                    halfExtents:
                    {
                        x: 2.0,
                        y: 1.5
                    }
                },
                distinctions: []
            },
            {
                name: 'Çatalhöyük',
                imageSources:
                [
                    './models/projects/panoresim/catalhoyuk.jpg'
                ],
                floorTexture: this.resources.items.projectsPanoresimFloorTexture,
                link:
                {
                    href: 'https://gokonya.com/en/catalhoyuk',
                    x: - 4.8,
                    y: 2,
                    halfExtents:
                    {
                        x: 2.0,
                        y: 1.5
                    }
                },
                distinctions: []
            },
            {
                name: 'Sille Köyü',
                imageSources:
                [
                    './models/projects/panoresim/sille köyü.jpg',
                ],
                floorTexture: this.resources.items.projectsPanoresimFloorTexture,
                link:
                {
                    href: 'https://gokonya.com/en/sille-2',
                    x: - 4.8,
                    y: 2,
                    halfExtents:
                    {
                        x: 2.0,
                        y: 1.5
                    }
                },
                distinctions: []
            },
            {
                name: 'Mevlana Türbesi',
                imageSources:
                [
                    './models/projects/panoresim/mevlana turbesi.jpg',
                ],
                floorTexture: this.resources.items.projectsPanoresimFloorTexture,
                link:
                {
                    href: 'https://gokonya.com/en/mevlana',
                    x: - 4.8,
                    y: 2,
                    halfExtents:
                    {
                        x: 2.0,
                        y: 1.5
                    }
                },
                distinctions: []
            },
        ]
    }

    setZone()
    {
        const totalWidth = this.list.length * (this.interDistance / 2)

        const zone = this.zones.add({
            position: { x: this.x + totalWidth - this.projectHalfWidth - 6 + 10, y: this.y + 10 },
            halfExtents: { x: totalWidth, y: 12 },
            data: { cameraAngle: 'projects' }
        })

        zone.on('in', (_data) =>
        {
            this.camera.angle.set(_data.cameraAngle)
            gsap.to(this.passes.horizontalBlurPass.material.uniforms.uStrength.value, { x: 0, duration: 2 })
            gsap.to(this.passes.verticalBlurPass.material.uniforms.uStrength.value, { y: 0, duration: 2 })
        })

        zone.on('out', () =>
        {
            this.camera.angle.set('default')
            gsap.to(this.passes.horizontalBlurPass.material.uniforms.uStrength.value, { x: this.passes.horizontalBlurPass.strength, duration: 2 })
            gsap.to(this.passes.verticalBlurPass.material.uniforms.uStrength.value, { y: this.passes.verticalBlurPass.strength, duration: 2 })
        })
    }

    add(_options)
    {
        const x = this.x + this.items.length * this.interDistance + 10
        let y = this.y + 6.5
        
        // Create project
        const project = new Project({
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            areas: this.areas,
            geometries: this.geometries,
            meshes: this.meshes,
            debug: this.debugFolder,
            x: x - 3,
            y: y,
            ..._options
        })

        this.container.add(project.container)

        // Save
        this.items.push(project)
    }
}
