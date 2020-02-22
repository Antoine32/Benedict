class joueur {
    constructor(id) {
        this.id = id;
        this.alive = true;
    }
}

class sorciere extends joueur {
    constructor(id) {
        this.potionAlive = true;
        this.potionDeath = true;
        super(id);
    }
}