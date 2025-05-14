import * as THREE from 'three'
import CANNON from 'cannon'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class YonTabelasi1 {
  constructor({ scene, resources, physics, position = new THREE.Vector3(15, -16, 0), rotateX = 0, rotateY = 0, rotateZ = 0, scale = new THREE.Vector3(1, 1, 1) }) {
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
    this.addCollision()
    this.addColumnCollision()
    this.addColumnCollision2()
    this.addColumnCollision3()
    this.KademeCollision()
    this.addColumnCollision5()
    this.GreenBoxCollision1()
    this.GreenBoxCollision2()
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
    
    // Modeli referans olarak saklayalım
    this.model = model
  }
  
  addCollision() {
    if (!this.physics) {
      console.warn('YonTabelasi1: physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Collision boyutları
    const width = 0.3  // x ekseni boyutu
    const height = 0.3 // y ekseni boyutu
    const depth = 4    // z ekseni boyutu
    
    // Görsel temsil (debug için)
    const boxGeometry = new THREE.BoxGeometry(width, height, depth)
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff, // Mor renk
      wireframe: true,
      transparent: true,
      opacity: 0.5
    })
    
    this.collisionMesh = new THREE.Mesh(boxGeometry, boxMaterial)
    
    // Collision mesh pozisyonu - ana containerın içinde, biraz yukarı
    this.collisionMesh.position.set(-3, 2, 0)
    
    // Debug için görünür yap
    this.collisionMesh.visible = false
    this.container.add(this.collisionMesh)
    
    // Cannon.js için fizik gövdesi
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(width / 2, height / 2, depth / 2)
    )
    
    // Fizik gövdesi oluştur
    this.body = new CANNON.Body({
      mass: 0, // Statik nesne
      position: new CANNON.Vec3(
        this.position.x-1.6, // 0.5 + 0.3 = 0.8
        this.position.y -1, // 0.2 + 0.3 = 0.5
        this.position.z
      ),
      material: this.physics.materials ? this.physics.materials.items.floor : undefined
    })
    
    // Dönüşü quaternion olarak ayarla
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(this.rotateX, this.rotateY, this.rotateZ, 'XYZ')
    this.body.quaternion.copy(quat)
    
    // Şekli gövdeye ekle
    this.body.addShape(boxShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.body)
    
    console.log('YonTabelasi1 için collision eklendi:', width, height, depth, 'boyutlarında')
  }
  
  addColumnCollision() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-15, -9.5, 0)
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 1.12    // X ekseni genişliği
    const columnHeight = 1.2   // Y ekseni yüksekliği (dikey uzunluk)
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

  
  addColumnCollision2() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-15, -14.8, 0)
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 1.12    // X ekseni genişliği
    const columnHeight = 1.2   // Y ekseni yüksekliği (dikey uzunluk)
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


  addColumnCollision3() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(27.3, 5.3, 0)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0.4  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 9.5  // X ekseni genişliği
    const columnHeight = 7  // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7    // Z ekseni derinliği
    
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
    
    // Kolona rotasyon ekle
    this.columnMesh.rotation.set(columnRotateX, columnRotateY, columnRotateZ)
    
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
    
    // Fizik gövdesine rotasyon ekle
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(columnRotateX, columnRotateY, columnRotateZ, 'XYZ')
    this.columnBody.quaternion.copy(quat)
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 
                'boyutlar:', columnWidth, columnHeight, columnDepth,
                'rotasyon (derece):', 
                THREE.MathUtils.radToDeg(columnRotateX),
                THREE.MathUtils.radToDeg(columnRotateY),
                THREE.MathUtils.radToDeg(columnRotateZ))
  }

  
  KademeCollision() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-36.9, -40.4, 0)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 5.5  // X ekseni genişliği
    const columnHeight = 5.5 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7    // Z ekseni derinliği
    
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
    
    // Kolona rotasyon ekle
    this.columnMesh.rotation.set(columnRotateX, columnRotateY, columnRotateZ)
    
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
    
    // Fizik gövdesine rotasyon ekle
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(columnRotateX, columnRotateY, columnRotateZ, 'XYZ')
    this.columnBody.quaternion.copy(quat)
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 
                'boyutlar:', columnWidth, columnHeight, columnDepth,
                'rotasyon (derece):', 
                THREE.MathUtils.radToDeg(columnRotateX),
                THREE.MathUtils.radToDeg(columnRotateY),
                THREE.MathUtils.radToDeg(columnRotateZ))
  }

    
  GreenBoxCollision1() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-72.5, -35, 0)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 7.5  // X ekseni genişliği
    const columnHeight = 1 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7    // Z ekseni derinliği
    
    // Kolon görsel temsili oluştur
    const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0x660099, // Yeşil kolon
      wireframe: true,
      transparent: true,
      opacity: 0
    })
    
    this.columnMesh = new THREE.Mesh(columnGeometry, columnMaterial)
    
    // Kolonu doğrudan sahneye ekle
    this.columnMesh.position.copy(columnPosition)
    
    // Kolona rotasyon ekle
    this.columnMesh.rotation.set(columnRotateX, columnRotateY, columnRotateZ)
    
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
    
    // Fizik gövdesine rotasyon ekle
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(columnRotateX, columnRotateY, columnRotateZ, 'XYZ')
    this.columnBody.quaternion.copy(quat)
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 
                'boyutlar:', columnWidth, columnHeight, columnDepth,
                'rotasyon (derece):', 
                THREE.MathUtils.radToDeg(columnRotateX),
                THREE.MathUtils.radToDeg(columnRotateY),
                THREE.MathUtils.radToDeg(columnRotateZ))
  }


  addColumnCollision5() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-6, -32, 0)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 16  // X ekseni genişliği
    const columnHeight = 24 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7    // Z ekseni derinliği
    
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
    
    // Kolona rotasyon ekle
    this.columnMesh.rotation.set(columnRotateX, columnRotateY, columnRotateZ)
    
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
    
    // Fizik gövdesine rotasyon ekle
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(columnRotateX, columnRotateY, columnRotateZ, 'XYZ')
    this.columnBody.quaternion.copy(quat)
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 
                'boyutlar:', columnWidth, columnHeight, columnDepth,
                'rotasyon (derece):', 
                THREE.MathUtils.radToDeg(columnRotateX),
                THREE.MathUtils.radToDeg(columnRotateY),
                THREE.MathUtils.radToDeg(columnRotateZ))
  }


  
  GreenBoxCollision2() {
    if (!this.physics) {
      console.warn('Kolon için physics parametresi verilmedi, collision eklenmeyecek.')
      return
    }
    
    // Kolon için sabit konum
    const columnPosition = new THREE.Vector3(-76.3, -38.4, 0)
    
    // Kolon için rotasyon açıları (radyan cinsinden)
    const columnRotateX = 0  // X ekseni etrafında 22.5 derece
    const columnRotateY = 0            // Y ekseni etrafında rotasyon yok
    const columnRotateZ = 0  // Z ekseni etrafında 30 derece
    
    // Kolon boyutları - Y ekseni boyunca uzun bir kolon
    const columnWidth = 1  // X ekseni genişliği
    const columnHeight = 8.7 // Y ekseni yüksekliği (dikey uzunluk)
    const columnDepth = 7    // Z ekseni derinliği
    
    // Kolon görsel temsili oluştur
    const columnGeometry = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth)
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0x660099, // Yeşil kolon
      wireframe: true,
      transparent: true,
      opacity: 0
    })
    
    this.columnMesh = new THREE.Mesh(columnGeometry, columnMaterial)
    
    // Kolonu doğrudan sahneye ekle
    this.columnMesh.position.copy(columnPosition)
    
    // Kolona rotasyon ekle
    this.columnMesh.rotation.set(columnRotateX, columnRotateY, columnRotateZ)
    
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
    
    // Fizik gövdesine rotasyon ekle
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(columnRotateX, columnRotateY, columnRotateZ, 'XYZ')
    this.columnBody.quaternion.copy(quat)
    
    // Şekli gövdeye ekle
    this.columnBody.addShape(columnShape)
    
    // Fizik dünyasına ekle
    this.physics.world.addBody(this.columnBody)
    
    console.log('Kolon collision eklendi, konum:', columnPosition.x, columnPosition.y, columnPosition.z, 
                'boyutlar:', columnWidth, columnHeight, columnDepth,
                'rotasyon (derece):', 
                THREE.MathUtils.radToDeg(columnRotateX),
                THREE.MathUtils.radToDeg(columnRotateY),
                THREE.MathUtils.radToDeg(columnRotateZ))
  }


} 