import { Layer, Label, director, Sprite } from './../util/import'
import global from './../global'
import resources from './../resources'
class HealthGameTips extends Layer {
    constructor(controller) {
        super();
        this._controller = controller;

        let bg = new Sprite(global.resource[resources.bg].texture);
        this.addChild(bg);

        bg.position = {
            x: director.designSize.width * 0.5,
            y: director.designSize.height * 0.5
        }
        bg.scale.set(1.6);
        bg.tint = 0x000000;

        let tips = new Sprite(global.resource[resources.health_tips].texture);
        this.addChild(tips);
        tips.position = {
            x: director.designSize.width * 0.5,
            y: director.designSize.height * 0.5
        }
        this.interactive = true;
    }
    onTouchStart() {
        console.log('headlth game');
        this._controller.removeChild(this);
    }
}
export default HealthGameTips;