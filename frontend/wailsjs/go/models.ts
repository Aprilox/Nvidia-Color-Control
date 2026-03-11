export namespace display {
	
	export class DisplayInfo {
	    index: number;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new DisplayInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.name = source["name"];
	    }
	}

}

export namespace main {
	
	export class Profile {
	    id: string;
	    name: string;
	    icon: string;
	    gamma: number;
	    brightness: number;
	    contrast: number;
	    vibrance: number;
	    red: number;
	    green: number;
	    blue: number;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Profile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.icon = source["icon"];
	        this.gamma = source["gamma"];
	        this.brightness = source["brightness"];
	        this.contrast = source["contrast"];
	        this.vibrance = source["vibrance"];
	        this.red = source["red"];
	        this.green = source["green"];
	        this.blue = source["blue"];
	        this.createdAt = source["createdAt"];
	    }
	}

}

