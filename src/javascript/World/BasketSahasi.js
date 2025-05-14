import * as THREE from 'three'
import CANNON from 'cannon'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class BasketSahasi {
  constructor({ scene, resources, physics, position = new THREE.Vector3(-38, 16, -1), rotateX = 0, rotateY = 0, rotateZ = 0, scale = new THREE.Vector3(1, 1, 1) }) {
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
    
    this.PotaCollision1()
    this.PotaCollision2()
    this.setModel()
  }
  
  setModel() {
    if (!this.scene) {
      console.warn('BasketSahasi: scene parametresi verilmedi, model sahneye eklenmeyecek.')
      return
    }
    
    if (!this.resources.items.basketSahasi) {
      console.error('Basket sahası modeli bulunamadı')
      return
    }
    
    // Modeli klonla ve malzemeleri kopyala
    const model = this.resources.items.basketSahasi.scene.clone(true)
    
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


  PotaCollision1() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-35.6, 5.7, 2)
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 0.7    // X ekseni genişliği
    const columnHeight = 0.7   // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7      // Z ekseni derinliği
    
    // Kolon görsel temsili oluştur
    const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Yeşil kolon
      wireframe: true,
      transparent: true,
      opacity: 0
    })
    
    this.columnMesh = new THREE.Mesh(columnGeometry, columnMaterial)
    
    // Kolonu doğrudan sahneye ekle
    this.columnMesh.position.copy(columnPosition)
    this.scene.add(this.columnMesh)
    
    // Kolon için fizik gövdesi
    const columnShape = new CANNON.Box(
      new CANNON.Vec3(columnWidth/2, columnHeight/2, columnDepth/2)
    )
    
    // Fizik gövdesi oluştur
    this.columnBody = new CANNON.Body({
      mass: 0, // Statik nesne
      position: new CANNON.Vec3(
        columnPosition.x,
        columnPosition.y,
        columnPosition.z
      ),
      material: this.physics.materials ? this.physics.materials.items.floor : undefined
    })
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 'boyutlar:', columnWidth, columnHeight, columnDepth)
  }



  PotaCollision2() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-35.6, 25.7, 2)
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 0.7    // X ekseni genişliği
    const columnHeight = 0.7   // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7      // Z ekseni derinliği
    
    // Kolon görsel temsili oluştur
    const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Yeşil kolon
      wireframe: true,
      transparent: true,
      opacity: 0
    })
    
    this.columnMesh = new THREE.Mesh(columnGeometry, columnMaterial)
    
    // Kolonu doğrudan sahneye ekle
    this.columnMesh.position.copy(columnPosition)
    this.scene.add(this.columnMesh)
    
    // Kolon için fizik gövdesi
    const columnShape = new CANNON.Box(
      new CANNON.Vec3(columnWidth/2, columnHeight/2, columnDepth/2)
    )
    
    // Fizik gövdesi oluştur
    this.columnBody = new CANNON.Body({
      mass: 0, // Statik nesne
      position: new CANNON.Vec3(
        columnPosition.x,
        columnPosition.y,
        columnPosition.z
      ),
      material: this.physics.materials ? this.physics.materials.items.floor : undefined
    })
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 'boyutlar:', columnWidth, columnHeight, columnDepth)
  }






} 