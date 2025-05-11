import * as THREE from 'three'
import CANNON from 'cannon'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class YonTabelasi1 {
  constructor({ scene, resources, physics, position = new THREE.Vector3(-2, -18, 0), rotateX = 0, rotateY = 0, rotateZ = 0, scale = new THREE.Vector3(1, 1, 1) }) {
    this.scene = scene
    this.resources = resources
    this.physics = physics
    this.position = position
    this.rotateX = rotateX
    this.rotateY = rotateY
    this.rotateZ = rotateZ
    this.scale = scale
    
    this.container = new THREE.Object3D()
    this.container.position.copy(this.position)
    this.scene.add(this.container)
    
    this.setModel()
  }
  
  setModel() {
    if (!this.scene) {
      console.warn('YonTabelasi1: scene parametresi verilmedi, model sahneye eklenmeyecek.')
      return
    }
    
    if (!this.resources.items.yonTabelasi1) {
      console.error('Yön tabelası modeli bulunamadı')
      return
    }
    
    // Modeli klonla ve malzemeleri kopyala
    const model = this.resources.items.yonTabelasi1.scene.clone(true)
    
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
    model.rotation.set(this.rotateX, this.rotateY, this.rotateZ)
    model.scale.copy(this.scale)
    this.container.add(model)
    
    
  }
} 