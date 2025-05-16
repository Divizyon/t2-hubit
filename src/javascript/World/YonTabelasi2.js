import * as THREE from 'three'
import CANNON from 'cannon'

export default class YonTabelasi2 {
  constructor(_options) {
    // Özellikleri kaydet
    this.scene = _options.scene
    this.resources = _options.resources
    this.objects = _options.objects
    this.physics = _options.physics
    this.debug = _options.debug
    this.time = _options.time
    this.areas = _options.areas
    this.materials = _options.materials
    
    // Döndürme değerlerini (radyan) ayarla
    this.rotateX = _options.rotateX !== undefined ? _options.rotateX :  // 90 derece X ekseni
    this.rotateY = _options.rotateY !== undefined ? _options.rotateY : 
    this.rotateZ = _options.rotateZ !== undefined ? _options.rotateZ : Math.PI  // 90 derece Z ekseni ekledim
    
    // Pozisyon değeri, eğer verilmediyse varsayılan olarak 29,-29,0 kullan
    this.position = _options.position || new THREE.Vector3(20, -5, 0)
    
    // Ana konteyner oluştur
    this.container = new THREE.Object3D()
    this.container.matrixAutoUpdate = false
    this.container.updateMatrix()
    this.scene.add(this.container)
    
    // Model oluştur
    this._buildModel()
  }
  
  _buildModel() {
    const gltf = this.resources.items.yonTabelasi2
    if (!gltf || !gltf.scene) {
      console.error('Yön Tabelası 2 modeli bulunamadı')
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
    
    // Bounding box hesapla - ölçeklendirme sonrası
    model.updateMatrixWorld(true)
    const bbox = new THREE.Box3().setFromObject(model)
    const size = bbox.getSize(new THREE.Vector3())
    
    // Fizik gövdesi oluştur
    if (this.physics) {
      const halfExtents = new CANNON.Vec3(size.x / 4.5, size.y / 4.5, size.z / 2.5)
      const boxShape = new CANNON.Box(halfExtents)
      
      const body = new CANNON.Body({
        mass: 0, // Statik nesne
        position: new CANNON.Vec3(...this.position.toArray()),
        material: this.physics.materials.items.floor
      })
      
      // Dönüşü quaternion olarak ayarla
      const quat = new CANNON.Quaternion()
      quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ')
      body.quaternion.copy(quat)
      
      body.addShape(boxShape)
      this.physics.world.addBody(body)
    }
    
    console.log('Yön Tabelası 2 eklendi, konum:', this.position)
  }
} 