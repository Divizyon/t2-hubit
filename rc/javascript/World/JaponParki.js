const collisionGeometry = new THREE.BoxGeometry(
    this.collisionSize.x,
    this.collisionSize.y,
    this.collisionSize.z
);

const collisionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    opacity: 0.5,
    transparent: true,
    visible: true
});

this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
this.collisionMesh.position.copy(this.collisionPosition);
this.scene.add(this.collisionMesh); 