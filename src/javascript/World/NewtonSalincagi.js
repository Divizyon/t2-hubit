import * as THREE from 'three'
import CANNON from 'cannon'

export default class NewtonSalincagi {
  constructor({ scene, resources, objects, physics, debug, rotateX = 0, rotateY = 0, rotateZ = 0, position = null, materials = null, areas = null, time = null }) {
    // Özellikleri kaydet
    this.scene = scene
    this.resources = resources
    this.objects = objects
    this.physics = physics
    this.debug = debug
    this.materials = materials
    this.areas = areas
    this.time = time
    
    // Döndürme değerlerini (radyan) ayarla
    this.rotateX = rotateX
    this.rotateY = rotateY
    this.rotateZ = rotateZ
    
    // Pozisyon değeri, eğer verilmediyse varsayılan olarak 22,5,0 kullan
    this.position = position || new THREE.Vector3(22, 5, 0)
    
    // Ana konteyner oluştur
    this.container = new THREE.Object3D()
    this.container.matrixAutoUpdate = false
    this.container.updateMatrix()
    this.scene.add(this.container)
    
    // Model oluştur
    this._buildModel()
  }
  
  _buildModel() {
    const gltf = this.resources.items.newtonSalincagi
    if (!gltf || !gltf.scene) {
      console.error('Newton Salıncağı modeli bulunamadı')
      return
    }
    
    // Modeli klonla ve malzemeleri kopyala
    const model = gltf.scene.clone(true)
    
    // Model boyutunu ayarla - eğer gerekirse ölçeklendir
    model.scale.set(1, 1, 1)
    
    // Modelin materyallerini işle
    model.traverse(child => {
      if (child.isMesh) {
        const origMat = child.material
        const mat = origMat.clone()
        if (origMat.map) mat.map = origMat.map
        if (origMat.normalMap) mat.normalMap = origMat.normalMap
        if (origMat.roughnessMap) mat.roughnessMap = origMat.roughnessMap
        if (origMat.metalnessMap) mat.metalnessMap = origMat.metalnessMap
        mat.needsUpdate = true
        child.material = mat
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    // Model pozisyonu ve dönüşü
    model.position.copy(this.position)
    model.rotation.set(this.rotateX, this.rotateY, this.rotateZ)
    this.container.add(model)
    
    // Bounding box hesapla
    model.updateMatrixWorld(true)
    const bbox = new THREE.Box3().setFromObject(model)
    const size = bbox.getSize(new THREE.Vector3())
    
    // Fizik gövdesi oluştur
    if (this.physics) {
      const halfExtents = new CANNON.Vec3(size.x / 2.5, size.y / 3.5, size.z / 3.5)
      const boxShape = new CANNON.Box(halfExtents)
      
      const body = new CANNON.Body({
        mass: 0, // Statik nesne
        position: new CANNON.Vec3(this.position.x, this.position.y - 1, this.position.z),
        material: this.physics.materials.items.floor
      })
      
      // Dönüşü quaternion olarak ayarla
      const quat = new CANNON.Quaternion()
      quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ')
      body.quaternion.copy(quat)
      
      body.addShape(boxShape)
      this.physics.world.addBody(body)
    }
    
    // Bu modeli animasyon için kullan
    this.model = model
    
    // Animasyonları ayarla (eğer varsa)
    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model)
      
      gltf.animations.forEach((clip) => {
        const action = this.mixer.clipAction(clip)
        action.play()
      })
      
      // Time olayını dinle
      if (this.time) {
        this.time.on('tick', () => {
          if (this.mixer) {
            this.mixer.update(this.time.delta * 0.001)
          }
        })
      }
    }
    
    console.log('Newton Salıncağı eklendi, konum:', this.position)
  }
} 